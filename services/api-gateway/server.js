const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config();

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Service configuration
const services = {
  user: {
    target: `http://localhost:${process.env.USER_SERVICE_PORT || 3001}`,
    changeOrigin: true,
  },
  carpooling: {
    target: `http://localhost:${process.env.CARPOOLING_SERVICE_PORT || 3002}`,
    changeOrigin: true,
  },
  matching: {
    target: `http://localhost:${process.env.MATCHING_SERVICE_PORT || 3003}`,
    changeOrigin: true,
  },
  tracking: {
    target: `http://localhost:${process.env.TRACKING_SERVICE_PORT || 3004}`,
    changeOrigin: true,
  },
  notification: {
    target: `http://localhost:${process.env.NOTIFICATION_SERVICE_PORT || 3005}`,
    changeOrigin: true,
  },
  chat: {
    target: `http://localhost:${process.env.CHAT_SERVICE_PORT || 3006}`,
    changeOrigin: true,
  },
};

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: Object.keys(services),
    version: "1.0.0",
  });
});

// API Gateway routes with proxy middleware
app.use(
  "/api/users",
  createProxyMiddleware({
    target: services.user.target,
    changeOrigin: services.user.changeOrigin,
    pathRewrite: {
      "^/api/users": "/api/users",
    },
    onError: (err, req, res) => {
      console.error("User Service Error:", err.message);
      res.status(503).json({
        error: "User Service unavailable",
        message: "Please ensure User Service is running on port 3001",
      });
    },
  })
);

app.use(
  "/api/carpooling",
  createProxyMiddleware({
    target: services.carpooling.target,
    changeOrigin: services.carpooling.changeOrigin,
    pathRewrite: {
      "^/api/carpooling": "/api/carpooling",
    },
    onError: (err, req, res) => {
      console.error("Carpooling Service Error:", err.message);
      res.status(503).json({
        error: "Carpooling Service unavailable",
        message: "Please ensure Carpooling Service is running on port 3002",
      });
    },
  })
);

app.use(
  "/api/matching",
  createProxyMiddleware({
    target: services.matching.target,
    changeOrigin: services.matching.changeOrigin,
    pathRewrite: {
      "^/api/matching": "/api/matching",
    },
    onError: (err, req, res) => {
      console.error("Matching Service Error:", err.message);
      res.status(503).json({
        error: "Matching Service unavailable",
        message: "Please ensure Matching Service is running on port 3003",
      });
    },
  })
);

app.use(
  "/api/tracking",
  createProxyMiddleware({
    target: services.tracking.target,
    changeOrigin: services.tracking.changeOrigin,
    pathRewrite: {
      "^/api/tracking": "/api/tracking",
    },
    onError: (err, req, res) => {
      console.error("Tracking Service Error:", err.message);
      res.status(503).json({
        error: "Tracking Service unavailable",
        message: "Please ensure Tracking Service is running on port 3004",
      });
    },
  })
);

app.use(
  "/api/notifications",
  createProxyMiddleware({
    target: services.notification.target,
    changeOrigin: services.notification.changeOrigin,
    pathRewrite: {
      "^/api/notifications": "/api/notifications",
    },
    onError: (err, req, res) => {
      console.error("Notification Service Error:", err.message);
      res.status(503).json({
        error: "Notification Service unavailable",
        message: "Please ensure Notification Service is running on port 3005",
      });
    },
  })
);

app.use(
  "/api/chat",
  createProxyMiddleware({
    target: services.chat.target,
    changeOrigin: services.chat.changeOrigin,
    pathRewrite: {
      "^/api/chat": "/api/chat",
    },
    onError: (err, req, res) => {
      console.error("Chat Service Error:", err.message);
      res.status(503).json({
        error: "Chat Service unavailable",
        message: "Please ensure Chat Service is running on port 3006",
      });
    },
  })
);

// WebSocket proxy for real-time services
const { createServer } = require("http");
const server = createServer(app);

// Handle WebSocket connections for tracking and chat services
server.on("upgrade", (request, socket, head) => {
  const url = request.url;

  if (url.startsWith("/socket.io/")) {
    // Determine which service to proxy to based on the path
    let targetService;
    if (url.includes("tracking")) {
      targetService = services.tracking.target;
    } else if (url.includes("chat")) {
      targetService = services.chat.target;
    } else {
      // Default to chat service for generic socket.io connections
      targetService = services.chat.target;
    }

    console.log(`Proxying WebSocket connection to: ${targetService}`);

    // Simple WebSocket proxy (in production, use a proper WebSocket proxy)
    socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
  }
});

// Default route
app.get("/", (req, res) => {
  res.json({
    message: "OfficeShare API Gateway",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      users: "/api/users",
      carpooling: "/api/carpooling",
      matching: "/api/matching",
      tracking: "/api/tracking",
      notifications: "/api/notifications",
      chat: "/api/chat",
    },
    services: {
      "User Service": `${services.user.target}`,
      "Carpooling Service": `${services.carpooling.target}`,
      "Matching Service": `${services.matching.target}`,
      "Tracking Service": `${services.tracking.target}`,
      "Notification Service": `${services.notification.target}`,
      "Chat Service": `${services.chat.target}`,
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `The requested route ${req.originalUrl} was not found`,
    availableRoutes: [
      "/health",
      "/api/users",
      "/api/carpooling",
      "/api/matching",
      "/api/tracking",
      "/api/notifications",
      "/api/chat",
    ],
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("API Gateway Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 API Gateway running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Proxying to services:`);
  Object.entries(services).forEach(([name, config]) => {
    console.log(`   ${name}: ${config.target}`);
  });
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("API Gateway shut down");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("API Gateway shut down");
    process.exit(0);
  });
});
