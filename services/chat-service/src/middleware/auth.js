const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

const authMiddleware = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "Access denied",
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add user info to request
    req.user = {
      user_id: decoded.user_id,
      office_id: decoded.office_id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
    };

    logger.debug("User authenticated", {
      userId: req.user.user_id,
      officeId: req.user.office_id,
    });

    next();
  } catch (error) {
    logger.warn("Authentication failed", {
      error: error.message,
      token: req.header("Authorization")?.substring(0, 20) + "...",
    });

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
        message: "Please login again",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Invalid token",
        message: "Please provide a valid token",
      });
    }

    return res.status(401).json({
      error: "Authentication failed",
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;
