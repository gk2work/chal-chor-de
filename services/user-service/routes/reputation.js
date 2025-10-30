const express = require("express");
const { ObjectId } = require("mongodb");
const { authenticateToken, authorizeOffice } = require("../middleware/auth");

const router = express.Router();

// Get office leaderboard
router.get("/leaderboard", authenticateToken, async (req, res) => {
  try {
    const {
      limit = 10,
      transaction_type,
      time_period = "all", // all, month, week
    } = req.query;

    const db = req.app.locals.db;

    // Build time filter
    let timeFilter = {};
    const now = new Date();

    if (time_period === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      timeFilter = { created_at: { $gte: weekAgo } };
    } else if (time_period === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      timeFilter = { created_at: { $gte: monthAgo } };
    }

    // Get top users by reputation score
    const topUsers = await db
      .collection("users")
      .find({
        office_id: req.user.office_id,
        reputation_score: { $exists: true },
      })
      .sort({ reputation_score: -1, created_at: 1 })
      .limit(parseInt(limit))
      .project({
        _id: 1,
        full_name: 1,
        reputation_score: 1,
        created_at: 1,
      })
      .toArray();

    // Get additional stats for each user
    const leaderboard = await Promise.all(
      topUsers.map(async (user, index) => {
        // Get rating stats
        const ratingQuery = {
          rated_user_id: user._id.toString(),
          ...timeFilter,
        };

        if (transaction_type) {
          ratingQuery.transaction_type = transaction_type;
        }

        const ratings = await db
          .collection("user_ratings")
          .find(ratingQuery)
          .toArray();

        const totalRatings = ratings.length;
        const averageRating =
          totalRatings > 0
            ? Math.round(
                (ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings) *
                  10
              ) / 10
            : user.reputation_score;

        // Get activity stats (transactions participated in)
        const activityStats = await getUserActivityStats(
          db,
          user._id.toString(),
          timeFilter
        );

        return {
          rank: index + 1,
          user_id: user._id.toString(),
          full_name: user.full_name,
          reputation_score: user.reputation_score,
          period_average: averageRating,
          total_ratings: totalRatings,
          activity_stats: activityStats,
          member_since: user.created_at,
        };
      })
    );

    // Get current user's rank
    const currentUserRank = await getCurrentUserRank(
      db,
      req.user.user_id,
      req.user.office_id
    );

    res.json({
      leaderboard,
      current_user_rank: currentUserRank,
      filters: {
        time_period,
        transaction_type: transaction_type || "all",
        limit: parseInt(limit),
      },
      generated_at: new Date(),
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({
      error: "Failed to fetch leaderboard",
      message: "An error occurred while fetching the leaderboard",
    });
  }
});

// Get reputation trends for a user
router.get(
  "/trends/:user_id",
  authenticateToken,
  authorizeOffice,
  async (req, res) => {
    try {
      const { user_id } = req.params;
      const { period = "30d" } = req.query; // 7d, 30d, 90d, 1y
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

      // Calculate time range
      const now = new Date();
      let daysBack = 30;

      switch (period) {
        case "7d":
          daysBack = 7;
          break;
        case "30d":
          daysBack = 30;
          break;
        case "90d":
          daysBack = 90;
          break;
        case "1y":
          daysBack = 365;
          break;
      }

      const startDate = new Date(
        now.getTime() - daysBack * 24 * 60 * 60 * 1000
      );

      // Get ratings over time
      const ratings = await db
        .collection("user_ratings")
        .find({
          rated_user_id: user_id,
          created_at: { $gte: startDate },
        })
        .sort({ created_at: 1 })
        .toArray();

      // Group ratings by day/week/month based on period
      const trends = groupRatingsByPeriod(ratings, period);

      // Calculate moving average
      const movingAverage = calculateMovingAverage(trends, period);

      res.json({
        user_id: user_id,
        current_reputation: user.reputation_score,
        period: period,
        trends: trends,
        moving_average: movingAverage,
        summary: {
          total_ratings_in_period: ratings.length,
          average_rating_in_period:
            ratings.length > 0
              ? Math.round(
                  (ratings.reduce((sum, r) => sum + r.rating, 0) /
                    ratings.length) *
                    10
                ) / 10
              : user.reputation_score,
          trend_direction: calculateTrendDirection(trends),
        },
      });
    } catch (error) {
      console.error("Reputation trends error:", error);
      res.status(500).json({
        error: "Failed to fetch reputation trends",
        message: "An error occurred while fetching reputation trends",
      });
    }
  }
);

// Get reputation badges/achievements
router.get(
  "/badges/:user_id",
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

      // Calculate badges based on user activity and ratings
      const badges = await calculateUserBadges(db, user_id, user);

      res.json({
        user_id: user_id,
        badges: badges,
        total_badges: badges.length,
        badge_categories: {
          reputation: badges.filter((b) => b.category === "reputation").length,
          activity: badges.filter((b) => b.category === "activity").length,
          community: badges.filter((b) => b.category === "community").length,
          special: badges.filter((b) => b.category === "special").length,
        },
      });
    } catch (error) {
      console.error("Badges error:", error);
      res.status(500).json({
        error: "Failed to fetch badges",
        message: "An error occurred while fetching badges",
      });
    }
  }
);

// Helper function to get user activity stats
async function getUserActivityStats(db, userId, timeFilter = {}) {
  try {
    const stats = {
      carpool_trips: 0,
      bike_shares: 0,
      book_shares: 0,
      total_transactions: 0,
    };

    // Get carpool participation
    const carpoolQuery = {
      $or: [{ driver_id: userId }, { "participants.user_id": userId }],
      ...timeFilter,
    };

    stats.carpool_trips = await db
      .collection("carpool_trips")
      .countDocuments(carpoolQuery);

    // Get bike sharing activity
    const bikeQuery = {
      $or: [{ owner_id: userId }, { "bookings.borrower_id": userId }],
      ...timeFilter,
    };

    stats.bike_shares = await db
      .collection("bike_listings")
      .countDocuments(bikeQuery);

    // Get book sharing activity
    const bookQuery = {
      $or: [{ owner_id: userId }, { "loans.borrower_id": userId }],
      ...timeFilter,
    };

    stats.book_shares = await db
      .collection("book_listings")
      .countDocuments(bookQuery);

    stats.total_transactions =
      stats.carpool_trips + stats.bike_shares + stats.book_shares;

    return stats;
  } catch (error) {
    console.error("Error getting activity stats:", error);
    return {
      carpool_trips: 0,
      bike_shares: 0,
      book_shares: 0,
      total_transactions: 0,
    };
  }
}

// Helper function to get current user's rank
async function getCurrentUserRank(db, userId, officeId) {
  try {
    const user = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    });

    if (!user) return null;

    const usersWithHigherRating = await db.collection("users").countDocuments({
      office_id: officeId,
      reputation_score: { $gt: user.reputation_score },
    });

    return {
      rank: usersWithHigherRating + 1,
      reputation_score: user.reputation_score,
    };
  } catch (error) {
    console.error("Error getting user rank:", error);
    return null;
  }
}

// Helper function to group ratings by period
function groupRatingsByPeriod(ratings, period) {
  const groups = {};

  ratings.forEach((rating) => {
    let key;
    const date = new Date(rating.created_at);

    if (period === "7d") {
      key = date.toISOString().split("T")[0]; // Daily
    } else if (period === "30d") {
      key = date.toISOString().split("T")[0]; // Daily
    } else if (period === "90d") {
      // Weekly
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split("T")[0];
    } else {
      // Monthly
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    if (!groups[key]) {
      groups[key] = {
        period: key,
        ratings: [],
        average: 0,
        count: 0,
      };
    }

    groups[key].ratings.push(rating.rating);
    groups[key].count++;
  });

  // Calculate averages
  Object.keys(groups).forEach((key) => {
    const group = groups[key];
    group.average =
      Math.round(
        (group.ratings.reduce((sum, r) => sum + r, 0) / group.count) * 10
      ) / 10;
    delete group.ratings; // Remove raw ratings to reduce response size
  });

  return Object.values(groups).sort((a, b) => a.period.localeCompare(b.period));
}

// Helper function to calculate moving average
function calculateMovingAverage(trends, period) {
  const windowSize = period === "7d" ? 3 : period === "30d" ? 7 : 14;
  const movingAvg = [];

  for (let i = 0; i < trends.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = trends.slice(start, i + 1);
    const avg = window.reduce((sum, t) => sum + t.average, 0) / window.length;

    movingAvg.push({
      period: trends[i].period,
      moving_average: Math.round(avg * 10) / 10,
    });
  }

  return movingAvg;
}

// Helper function to calculate trend direction
function calculateTrendDirection(trends) {
  if (trends.length < 2) return "stable";

  const recent = trends.slice(-5); // Last 5 periods
  const first = recent[0].average;
  const last = recent[recent.length - 1].average;

  const change = last - first;

  if (change > 0.2) return "improving";
  if (change < -0.2) return "declining";
  return "stable";
}

// Helper function to calculate user badges
async function calculateUserBadges(db, userId, user) {
  const badges = [];

  try {
    // Get user stats
    const ratings = await db
      .collection("user_ratings")
      .find({ rated_user_id: userId })
      .toArray();

    const activityStats = await getUserActivityStats(db, userId);

    // Reputation badges
    if (user.reputation_score >= 4.8) {
      badges.push({
        id: "excellent_reputation",
        name: "Excellent Reputation",
        description: "Maintained a reputation score of 4.8 or higher",
        category: "reputation",
        icon: "⭐",
        earned_at: user.updated_at,
      });
    }

    if (user.reputation_score >= 4.5) {
      badges.push({
        id: "great_reputation",
        name: "Great Reputation",
        description: "Maintained a reputation score of 4.5 or higher",
        category: "reputation",
        icon: "🌟",
        earned_at: user.updated_at,
      });
    }

    // Activity badges
    if (activityStats.total_transactions >= 50) {
      badges.push({
        id: "super_active",
        name: "Super Active",
        description: "Participated in 50+ sharing transactions",
        category: "activity",
        icon: "🚀",
        earned_at: new Date(),
      });
    } else if (activityStats.total_transactions >= 20) {
      badges.push({
        id: "very_active",
        name: "Very Active",
        description: "Participated in 20+ sharing transactions",
        category: "activity",
        icon: "🔥",
        earned_at: new Date(),
      });
    } else if (activityStats.total_transactions >= 5) {
      badges.push({
        id: "active_member",
        name: "Active Member",
        description: "Participated in 5+ sharing transactions",
        category: "activity",
        icon: "💪",
        earned_at: new Date(),
      });
    }

    // Community badges
    if (ratings.length >= 25) {
      badges.push({
        id: "highly_rated",
        name: "Highly Rated",
        description: "Received 25+ ratings from colleagues",
        category: "community",
        icon: "👑",
        earned_at: new Date(),
      });
    }

    // Special badges
    const membershipDays = Math.floor(
      (new Date() - user.created_at) / (1000 * 60 * 60 * 24)
    );
    if (membershipDays >= 365) {
      badges.push({
        id: "veteran_member",
        name: "Veteran Member",
        description: "Been a member for over a year",
        category: "special",
        icon: "🏆",
        earned_at: new Date(
          user.created_at.getTime() + 365 * 24 * 60 * 60 * 1000
        ),
      });
    } else if (membershipDays >= 90) {
      badges.push({
        id: "established_member",
        name: "Established Member",
        description: "Been a member for over 3 months",
        category: "special",
        icon: "🎖️",
        earned_at: new Date(
          user.created_at.getTime() + 90 * 24 * 60 * 60 * 1000
        ),
      });
    }

    return badges;
  } catch (error) {
    console.error("Error calculating badges:", error);
    return [];
  }
}

module.exports = router;
