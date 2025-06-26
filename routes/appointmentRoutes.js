const express = require("express");
const {
  bookAppointment,
  getUserAppointments,
  cancelAppointment,
  getAppointmentDetails,
  updateAppointmentStatus,
} = require("../controllers/appointmentController");
const {
  authenticate,
  isStudent,
  isProfessor,
  isStudentOrProfessor,
} = require("../middleware/authMiddleware");

const router = express.Router();

// @route   POST /api/appointments
// @desc    Book an appointment (students only)
// @access  Private - Student
router.post("/", authenticate, isStudent, bookAppointment);

// @route   GET /api/appointments
// @desc    Get user's appointments (students get their bookings, professors get their appointments)
// @access  Private
router.get("/", authenticate, isStudentOrProfessor, getUserAppointments);

// @route   GET /api/appointments/:appointmentId
// @desc    Get appointment details
// @access  Private
router.get(
  "/:appointmentId",
  authenticate,
  isStudentOrProfessor,
  getAppointmentDetails
);

// @route   PUT /api/appointments/:appointmentId/cancel
// @desc    Cancel an appointment
// @access  Private
router.put(
  "/:appointmentId/cancel",
  authenticate,
  isStudentOrProfessor,
  cancelAppointment
);

// @route   PUT /api/appointments/:appointmentId/status
// @desc    Update appointment status (professors only)
// @access  Private - Professor
router.put(
  "/:appointmentId/status",
  authenticate,
  isProfessor,
  updateAppointmentStatus
);

module.exports = router;
