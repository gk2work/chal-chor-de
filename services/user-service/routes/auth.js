const express = require("express");
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  refreshTokenSchema,
} = require("../utils/validation");
const {
  authenticateToken,
  rateLimit,
  generateTokens,
  verifyRefreshToken,
} = require("../middleware/auth");

const router = express.Router();

// Register new user
router.post("/register", rateLimit(5, 300000), async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const { email, password, full_name, office_id } = value;
    const db = req.app.locals.db;

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({
      office_id,
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        error: "User already exists",
        message: "A user with this email already exists in your office",
      });
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = {
      office_id,
      email: email.toLowerCase(),
      full_name,
      password_hash,
      reputation_score: 5.0,
      is_admin: false,
      preferences: {
        notifications_enabled: true,
        location_sharing: true,
        email_notifications: true,
        push_notifications: true,
        marketing_emails: false,
      },
      profile: {
        avatar_url: null,
        bio: "",
        phone: null,
        department: null,
      },
      security: {
        last_login: null,
        login_attempts: 0,
        account_locked: false,
        password_changed_at: new Date(),
      },
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("users").insertOne(newUser);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      _id: result.insertedId,
      email: email.toLowerCase(),
      office_id,
      is_admin: false,
    });

    // Store refresh token (in production, use Redis or separate collection)
    await db.collection("refresh_tokens").insertOne({
      user_id: result.insertedId.toString(),
      token: refreshToken,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Return user data (without sensitive information)
    const userResponse = {
      user_id: result.insertedId.toString(),
      office_id,
      email: email.toLowerCase(),
      full_name,
      reputation_score: 5.0,
      preferences: newUser.preferences,
      created_at: newUser.created_at,
    };

    res.status(201).json({
      message: "User registered successfully",
      user: userResponse,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: "24h",
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Registration failed",
      message: "An error occurred during registration. Please try again.",
    });
  }
});

// Login user
router.post("/login", rateLimit(10, 300000), async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const { email, password } = value;
    const db = req.app.locals.db;

    // Find user
    const user = await db.collection("users").findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Email or password is incorrect",
      });
    }

    // Check if account is locked
    if (user.security?.account_locked) {
      return res.status(423).json({
        error: "Account locked",
        message:
          "Your account has been temporarily locked due to multiple failed login attempts",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      // Increment failed login attempts
      const attempts = (user.security?.login_attempts || 0) + 1;
      const updateData = {
        "security.login_attempts": attempts,
        "security.last_failed_login": new Date(),
      };

      // Lock account after 5 failed attempts
      if (attempts >= 5) {
        updateData["security.account_locked"] = true;
        updateData["security.locked_at"] = new Date();
      }

      await db
        .collection("users")
        .updateOne({ _id: user._id }, { $set: updateData });

      return res.status(401).json({
        error: "Invalid credentials",
        message: "Email or password is incorrect",
        attempts_remaining: Math.max(0, 5 - attempts),
      });
    }

    // Reset failed login attempts on successful login
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          "security.login_attempts": 0,
          "security.last_login": new Date(),
          "security.account_locked": false,
        },
        $unset: {
          "security.locked_at": "",
          "security.last_failed_login": "",
        },
      }
    );

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token
    await db.collection("refresh_tokens").insertOne({
      user_id: user._id.toString(),
      token: refreshToken,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Return user data (without sensitive information)
    const userResponse = {
      user_id: user._id.toString(),
      office_id: user.office_id,
      email: user.email,
      full_name: user.full_name,
      reputation_score: user.reputation_score,
      preferences: user.preferences,
      profile: user.profile,
      created_at: user.created_at,
      last_login: new Date(),
    };

    res.json({
      message: "Login successful",
      user: userResponse,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: "24h",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Login failed",
      message: "An error occurred during login. Please try again.",
    });
  }
});

// Refresh access token
router.post("/refresh", async (req, res) => {
  try {
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const { refresh_token } = value;
    const db = req.app.locals.db;

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refresh_token);
    } catch (error) {
      return res.status(401).json({
        error: "Invalid refresh token",
        message: "The refresh token is invalid or expired",
      });
    }

    // Check if refresh token exists in database
    const storedToken = await db.collection("refresh_tokens").findOne({
      user_id: decoded.user_id,
      token: refresh_token,
    });

    if (!storedToken) {
      return res.status(401).json({
        error: "Invalid refresh token",
        message: "The refresh token is not recognized",
      });
    }

    // Check if token is expired
    if (new Date() > storedToken.expires_at) {
      // Remove expired token
      await db.collection("refresh_tokens").deleteOne({ _id: storedToken._id });
      return res.status(401).json({
        error: "Refresh token expired",
        message: "The refresh token has expired. Please login again.",
      });
    }

    // Get current user data
    const user = await db.collection("users").findOne({
      _id: new ObjectId(decoded.user_id),
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        message: "The user associated with this token no longer exists",
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Remove old refresh token and store new one
    await db.collection("refresh_tokens").deleteOne({ _id: storedToken._id });
    await db.collection("refresh_tokens").insertOne({
      user_id: user._id.toString(),
      token: newRefreshToken,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    res.json({
      message: "Token refreshed successfully",
      tokens: {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        token_type: "Bearer",
        expires_in: "24h",
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      error: "Token refresh failed",
      message: "An error occurred while refreshing the token",
    });
  }
});

// Logout user
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const db = req.app.locals.db;

    if (refresh_token) {
      // Remove specific refresh token
      await db.collection("refresh_tokens").deleteOne({
        user_id: req.user.user_id,
        token: refresh_token,
      });
    } else {
      // Remove all refresh tokens for user (logout from all devices)
      await db.collection("refresh_tokens").deleteMany({
        user_id: req.user.user_id,
      });
    }

    res.json({
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      error: "Logout failed",
      message: "An error occurred during logout",
    });
  }
});

// Change password
router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const { current_password, new_password } = value;
    const db = req.app.locals.db;

    // Get current user
    const user = await db.collection("users").findOne({
      _id: new ObjectId(req.user.user_id),
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        message: "User account not found",
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      current_password,
      user.password_hash
    );
    if (!isValidPassword) {
      return res.status(401).json({
        error: "Invalid current password",
        message: "The current password you entered is incorrect",
      });
    }

    // Hash new password
    const saltRounds = 12;
    const new_password_hash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          password_hash: new_password_hash,
          "security.password_changed_at": new Date(),
          updated_at: new Date(),
        },
      }
    );

    // Invalidate all refresh tokens (force re-login on all devices)
    await db.collection("refresh_tokens").deleteMany({
      user_id: req.user.user_id,
    });

    res.json({
      message: "Password changed successfully",
      note: "You have been logged out from all devices. Please login again.",
    });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({
      error: "Password change failed",
      message: "An error occurred while changing the password",
    });
  }
});

module.exports = router;
