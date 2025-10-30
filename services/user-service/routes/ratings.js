const express = require("express");
const { ObjectId } = require("mongodb");
const { ratingSchema } = require("../utils/validation");
const { authenticateToken, authorizeOffice } = require("../middleware/auth");

const router = express.Router();

// Submit rating for another user
router.post("/:user_id/rating", authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { error, value } = ratingSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const { rating, comment, transaction_type, transaction_id } = value;
    const db = req.app.locals.db;

    // Can't rate yourself
    if (req.user.user_id === user_id) {
      return res.status(400).json({
        error: "Self-rating not allowed",
        message: "You cannot rate yourself",
      });
    }

    // Check if target user exists and is in same office
    const targetUser = await db.collection("users").findOne({
      _id: new ObjectId(user_id),
      office_id: req.user.office_id,
    });

    if (!targetUser) {
      return res.status(404).json({
        error: "User not found",
        message: "User not found in your office",
      });
    }

    // Check if user has already rated this transaction
    if (transaction_id) {
      const existingRating = await db.collection("user_ratings").findOne({
        rated_user_id: user_id,
        rater_user_id: req.user.user_id,
        transaction_id: transaction_id,
      });

      if (existingRating) {
        return res.status(409).json({
          error: "Already rated",
          message: "You have already rated this user for this transaction",
        });
      }
    }

    // Create rating record
    const ratingRecord = {
      rated_user_id: user_id,
      rater_user_id: req.user.user_id,
      office_id: req.user.office_id,
      rating: parseInt(rating),
      comment: comment || "",
      transaction_type: transaction_type || "general",
      transaction_id: transaction_id || null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Insert rating
    const result = await db.collection("user_ratings").insertOne(ratingRecord);

    // Recalculate user's reputation score
    await recalculateUserReputation(db, user_id);

    // Get updated user reputation
    const updatedUser = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(user_id) },
        { projection: { reputation_score: 1 } }
      );

    res.status(201).json({
      message: "Rating submitted successfully",
      rating_id: result.insertedId.toString(),
      new_reputation_score: updatedUser.reputation_score,
    });
  } catch (error) {
    console.error("Rating submission error:", error);
    res.status(500).json({
      error: "Rating submission failed",
      message: "An error occurred while submitting the rating",
    });
  }
});

// Get ratings for a user
router.get(
  "/:user_id/ratings",
  authenticateToken,
  authorizeOffice,
  async (req, res) => {
    try {
      const { user_id } = req.params;
      const { page = 1, limit = 10, transaction_type } = req.query;
      const db = req.app.locals.db;

      // Build query
      const query = {
        rated_user_id: user_id,
        office_id: req.user.office_id,
      };

      if (transaction_type) {
        query.transaction_type = transaction_type;
      }

      // Get ratings with pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const ratings = await db
        .collection("user_ratings")
        .find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      // Get total count
      const totalCount = await db
        .collection("user_ratings")
        .countDocuments(query);

      // Get rater information for each rating
      const ratingsWithRaterInfo = await Promise.all(
        ratings.map(async (rating) => {
          const rater = await db
            .collection("users")
            .findOne(
              { _id: new ObjectId(rating.rater_user_id) },
              { projection: { full_name: 1, reputation_score: 1 } }
            );

          return {
            rating_id: rating._id.toString(),
            rating: rating.rating,
            comment: rating.comment,
            transaction_type: rating.transaction_type,
            transaction_id: rating.transaction_id,
            created_at: rating.created_at,
            rater: {
              user_id: rating.rater_user_id,
              full_name: rater?.full_name || "Unknown User",
              reputation_score: rater?.reputation_score || 0,
            },
          };
        })
      );

      // Calculate rating statistics
      const stats = await calculateRatingStats(db, user_id);

      res.json({
        ratings: ratingsWithRaterInfo,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCount / parseInt(limit)),
          total_count: totalCount,
          per_page: parseInt(limit),
        },
        statistics: stats,
      });
    } catch (error) {
      console.error("Get ratings error:", error);
      res.status(500).json({
        error: "Failed to fetch ratings",
        message: "An error occurred while fetching ratings",
      });
    }
  }
);

// Get rating statistics for a user
router.get(
  "/:user_id/rating-stats",
  authenticateToken,
  authorizeOffice,
  async (req, res) => {
    try {
      const { user_id } = req.params;
      const db = req.app.locals.db;

      // Check if user exists and is in same office
      const user = await db.collection("users").findOne({
        _id: new ObjectId(user_id),
        office_id: req.user.office_id,
      });

      if (!user) {
        return res.status(404).json({
          error: "User not found",
          message: "User not found in your office",
        });
      }

      const stats = await calculateRatingStats(db, user_id);

      res.json({
        user_id: user_id,
        current_reputation_score: user.reputation_score,
        statistics: stats,
      });
    } catch (error) {
      console.error("Get rating stats error:", error);
      res.status(500).json({
        error: "Failed to fetch rating statistics",
        message: "An error occurred while fetching rating statistics",
      });
    }
  }
);

// Update a rating (only by the rater)
router.put("/rating/:rating_id", authenticateToken, async (req, res) => {
  try {
    const { rating_id } = req.params;
    const { error, value } = ratingSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const { rating, comment } = value;
    const db = req.app.locals.db;

    // Find the rating
    const existingRating = await db.collection("user_ratings").findOne({
      _id: new ObjectId(rating_id),
      rater_user_id: req.user.user_id,
    });

    if (!existingRating) {
      return res.status(404).json({
        error: "Rating not found",
        message: "Rating not found or you do not have permission to update it",
      });
    }

    // Update rating
    await db.collection("user_ratings").updateOne(
      { _id: new ObjectId(rating_id) },
      {
        $set: {
          rating: parseInt(rating),
          comment: comment || "",
          updated_at: new Date(),
        },
      }
    );

    // Recalculate user's reputation score
    await recalculateUserReputation(db, existingRating.rated_user_id);

    res.json({
      message: "Rating updated successfully",
      rating_id: rating_id,
    });
  } catch (error) {
    console.error("Rating update error:", error);
    res.status(500).json({
      error: "Rating update failed",
      message: "An error occurred while updating the rating",
    });
  }
});

// Delete a rating (only by the rater)
router.delete("/rating/:rating_id", authenticateToken, async (req, res) => {
  try {
    const { rating_id } = req.params;
    const db = req.app.locals.db;

    // Find the rating
    const existingRating = await db.collection("user_ratings").findOne({
      _id: new ObjectId(rating_id),
      rater_user_id: req.user.user_id,
    });

    if (!existingRating) {
      return res.status(404).json({
        error: "Rating not found",
        message: "Rating not found or you do not have permission to delete it",
      });
    }

    // Delete rating
    await db.collection("user_ratings").deleteOne({
      _id: new ObjectId(rating_id),
    });

    // Recalculate user's reputation score
    await recalculateUserReputation(db, existingRating.rated_user_id);

    res.json({
      message: "Rating deleted successfully",
    });
  } catch (error) {
    console.error("Rating deletion error:", error);
    res.status(500).json({
      error: "Rating deletion failed",
      message: "An error occurred while deleting the rating",
    });
  }
});

// Helper function to recalculate user reputation
async function recalculateUserReputation(db, userId) {
  try {
    const ratings = await db
      .collection("user_ratings")
      .find({
        rated_user_id: userId,
      })
      .toArray();

    if (ratings.length === 0) {
      // No ratings, set to default
      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            reputation_score: 5.0,
            updated_at: new Date(),
          },
        }
      );
      return;
    }

    // Calculate weighted average (more recent ratings have slightly more weight)
    const now = new Date();
    let totalWeightedScore = 0;
    let totalWeight = 0;

    ratings.forEach((rating) => {
      const daysSinceRating = (now - rating.created_at) / (1000 * 60 * 60 * 24);
      // Weight decreases slowly over time (minimum weight of 0.5)
      const weight = Math.max(0.5, 1 - daysSinceRating / 365);

      totalWeightedScore += rating.rating * weight;
      totalWeight += weight;
    });

    const averageRating = totalWeightedScore / totalWeight;
    const roundedRating = Math.round(averageRating * 10) / 10;

    // Update user's reputation score
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          reputation_score: roundedRating,
          updated_at: new Date(),
        },
      }
    );
  } catch (error) {
    console.error("Error recalculating reputation:", error);
  }
}

// Helper function to calculate rating statistics
async function calculateRatingStats(db, userId) {
  try {
    const ratings = await db
      .collection("user_ratings")
      .find({
        rated_user_id: userId,
      })
      .toArray();

    if (ratings.length === 0) {
      return {
        total_ratings: 0,
        average_rating: 5.0,
        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        by_transaction_type: {},
      };
    }

    // Calculate distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const byTransactionType = {};

    ratings.forEach((rating) => {
      distribution[rating.rating]++;

      if (!byTransactionType[rating.transaction_type]) {
        byTransactionType[rating.transaction_type] = {
          count: 0,
          average: 0,
          total: 0,
        };
      }

      byTransactionType[rating.transaction_type].count++;
      byTransactionType[rating.transaction_type].total += rating.rating;
    });

    // Calculate averages by transaction type
    Object.keys(byTransactionType).forEach((type) => {
      byTransactionType[type].average =
        Math.round(
          (byTransactionType[type].total / byTransactionType[type].count) * 10
        ) / 10;
      delete byTransactionType[type].total;
    });

    const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    const averageRating = Math.round((totalRating / ratings.length) * 10) / 10;

    return {
      total_ratings: ratings.length,
      average_rating: averageRating,
      rating_distribution: distribution,
      by_transaction_type: byTransactionType,
      recent_ratings: ratings
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, 5)
        .map((rating) => ({
          rating: rating.rating,
          transaction_type: rating.transaction_type,
          created_at: rating.created_at,
        })),
    };
  } catch (error) {
    console.error("Error calculating rating stats:", error);
    return {
      total_ratings: 0,
      average_rating: 5.0,
      rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      by_transaction_type: {},
    };
  }
}

module.exports = router;
