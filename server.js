const app = require("./app");
const connectDB = require("./config/database");

const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// Start server
const server = app.listen(PORT, () => {
  console.log(`
🚀 College Appointment System API Server Started
📡 Environment: ${process.env.NODE_ENV || "development"}
🌐 Server running on port ${PORT}
📋 API Documentation: http://localhost:${PORT}
💊 Health check: http://localhost:${PORT}/health
  `);
});

module.exports = server;
