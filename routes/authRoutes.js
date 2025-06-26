const express = require("express");
const router = express.Router();

// Basic route handlers (temporary)
router.post("/register", (req, res) => {
  res.json({ message: "Register endpoint" });
});

router.post("/login", (req, res) => {
  res.json({ message: "Login endpoint" });
});

router.get("/profile", (req, res) => {
  res.json({ message: "Profile endpoint" });
});

module.exports = router;
