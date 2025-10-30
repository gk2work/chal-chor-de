const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

const socketAuth = (socket, next) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      logger.warn("Socket connection rejected: No token provided", {
        socketId: socket.id,
        ip: socket.handshake.address,
      });
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add user info to socket
    socket.userId = decoded.user_id;
    socket.officeId = decoded.office_id;
    socket.userName = decoded.name;
    socket.userEmail = decoded.email;
    socket.userRole = decoded.role;

    logger.info("Socket authenticated", {
      socketId: socket.id,
      userId: socket.userId,
      officeId: socket.officeId,
      userName: socket.userName,
    });

    next();
  } catch (error) {
    logger.warn("Socket authentication failed", {
      socketId: socket.id,
      error: error.message,
      ip: socket.handshake.address,
    });

    if (error.name === "TokenExpiredError") {
      return next(new Error("Authentication error: Token expired"));
    }

    if (error.name === "JsonWebTokenError") {
      return next(new Error("Authentication error: Invalid token"));
    }

    return next(new Error("Authentication error: Invalid or expired token"));
  }
};

module.exports = socketAuth;
