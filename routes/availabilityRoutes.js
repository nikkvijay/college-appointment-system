const express = require("express");
const {
  createAvailability,
  getProfessorAvailability,
  getAvailableSlots,
  deleteAvailability,
} = require("../controllers/availabilityController");
const {
  authenticate,
  isProfessor,
  isStudentOrProfessor,
} = require("../middleware/authMiddleware");

const router = express.Router();

// @route   POST /api/availability
// @desc    Create availability slot (professors only)
// @access  Private - Professor
router.post("/", authenticate, isProfessor, createAvailability);

// @route   GET /api/availability/professor/:professorId
// @desc    Get all availability for a specific professor
// @access  Private
router.get(
  "/professor/:professorId",
  authenticate,
  isStudentOrProfessor,
  getProfessorAvailability
);

// @route   GET /api/availability/professor/:professorId/available
// @desc    Get available (not booked) slots for a professor
// @access  Private
router.get(
  "/professor/:professorId/available",
  authenticate,
  isStudentOrProfessor,
  getAvailableSlots
);

// @route   GET /api/availability/my
// @desc    Get current professor's availability
// @access  Private - Professor
router.get("/my", authenticate, isProfessor, getProfessorAvailability);

// @route   DELETE /api/availability/:availabilityId
// @desc    Delete availability slot (professors only)
// @access  Private - Professor
router.delete(
  "/:availabilityId",
  authenticate,
  isProfessor,
  deleteAvailability
);

module.exports = router;
