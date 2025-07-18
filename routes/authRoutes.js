const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getProfile,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

// Auth routes
router.post("/register", register);
router.post("/login", login);
router.get("/profile", authenticate, getProfile);

module.exports = router;
