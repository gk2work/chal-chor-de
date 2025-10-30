const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: "Access token required",
      message: "Please provide a valid JWT token in the Authorization header",
    });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "officeshare-dev-secret-key-2024",
    (err, user) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({
            error: "Token expired",
            message: "Your session has expired. Please login again.",
          });
        }
        return res.status(403).json({
          error: "Invalid token",
          message: "The provided token is invalid or malformed.",
        });
      }
      req.user = user;
      next();
    }
  );
};

// Office-level authorization middleware
const authorizeOffice = (req, res, next) => {
  const requestedOfficeId =
    req.params.office_id || req.body.office_id || req.query.office_id;

  if (requestedOfficeId && req.user.office_id !== requestedOfficeId) {
    return res.status(403).json({
      error: "Access denied",
      message: "You can only access data from your own office",
    });
  }

  next();
};

// Admin role middleware (for future use)
const requireAdmin = (req, res, next) => {
  if (!req.user.is_admin) {
    return res.status(403).json({
      error: "Admin access required",
      message: "This endpoint requires administrator privileges",
    });
  }
  next();
};

// Rate limiting middleware (simple implementation)
const rateLimitMap = new Map();

const rateLimit = (maxRequests = 10, windowMs = 60000) => {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const userLimit = rateLimitMap.get(key);

    if (now > userLimit.resetTime) {
      userLimit.count = 1;
      userLimit.resetTime = now + windowMs;
      return next();
    }

    if (userLimit.count >= maxRequests) {
      return res.status(429).json({
        error: "Too many requests",
        message: `Rate limit exceeded. Try again in ${Math.ceil((userLimit.resetTime - now) / 1000)} seconds.`,
      });
    }

    userLimit.count++;
    next();
  };
};

// Session management utilities
const generateTokens = (user) => {
  const payload = {
    user_id: user._id.toString(),
    email: user.email,
    office_id: user.office_id,
    is_admin: user.is_admin || false,
  };

  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET || "officeshare-dev-secret-key-2024",
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || "officeshare-refresh-secret-2024",
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || "officeshare-refresh-secret-2024"
    );
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
};

module.exports = {
  authenticateToken,
  authorizeOffice,
  requireAdmin,
  rateLimit,
  generateTokens,
  verifyRefreshToken,
};
