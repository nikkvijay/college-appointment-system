const Appointment = require("../models/Appointment");
const Availability = require("../models/Availability");
const mongoose = require("mongoose");

// Utility to compute appointment datetime
const getAppointmentDateTime = (appointment) => {
  try {
    const [hours, minutes] = appointment.startTime.split(":");
    const dateTime = new Date(appointment.date);
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return dateTime;
  } catch (error) {
    console.error("Error computing appointment datetime:", error.message);
    return null;
  }
};

// Utility to populate appointment fields
const populateAppointment = async (appointment) => {
  return appointment.populate([
    { path: "student", select: "username fullName email" },
    { path: "professor", select: "username fullName email department" },
    { path: "availability" },
    { path: "cancelledBy", select: "username fullName" },
  ]);
};

/**
 * Book a new appointment
 * @route POST /api/appointments
 */
const bookAppointment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { availabilityId, notes } = req.body;
    const studentId = req.user._id;

    // Input validation
    if (!mongoose.Types.ObjectId.isValid(availabilityId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid availability ID format",
      });
    }

    // Validate inputs
    if (!availabilityId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Availability ID is required",
      });
    }

    if (notes && notes.length > 500) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Notes must be 500 characters or less",
      });
    }

    // Find availability slot
    const availability = await Availability.findById(availabilityId)
      .populate("professor", "username fullName email department")
      .session(session);

    if (!availability) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Availability slot not found",
      });
    }

    // Check if slot is booked
    if (availability.isBooked) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "This time slot is already booked",
      });
    }

    // Validate time slot is in the future
    const slotStart = getAppointmentDateTime(availability);
    if (!slotStart || slotStart <= new Date()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Cannot book past or current time slots",
      });
    }

    // Validate endTime > startTime
    const [startHours, startMinutes] = availability.startTime.split(":");
    const [endHours, endMinutes] = availability.endTime.split(":");
    const startTimeMinutes = parseInt(startHours) * 60 + parseInt(startMinutes);
    const endTimeMinutes = parseInt(endHours) * 60 + parseInt(endMinutes);
    if (endTimeMinutes <= startTimeMinutes) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "End time must be after start time",
      });
    }

    // Check for conflicts
    const conflictingAppointment = await Appointment.findOne({
      student: studentId,
      date: availability.date,
      startTime: availability.startTime,
      status: "scheduled",
    }).session(session);

    if (conflictingAppointment) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "You already have an appointment at this time",
      });
    }

    // Create appointment
    const appointment = new Appointment({
      student: studentId,
      professor: availability.professor._id,
      availability: availabilityId,
      date: availability.date,
      startTime: availability.startTime,
      endTime: availability.endTime,
      notes: notes || "",
    });

    // Update availability
    availability.isBooked = true;
    availability.bookedBy = studentId;

    await appointment.save({ session });
    await availability.save({ session });

    await session.commitTransaction();

    await populateAppointment(appointment);

    res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      data: {
        ...appointment.toObject(),
        appointmentDateTime: getAppointmentDateTime(appointment),
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Book appointment error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error booking appointment",
    });
  } finally {
    session.endSession();
  }
};

/**
 * Get user's appointments
 * @route GET /api/appointments
 */
const getUserAppointments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const query =
      req.user.role === "student" ? { student: userId } : { professor: userId };
    if (status && ["scheduled", "cancelled", "completed"].includes(status)) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate("student", "username fullName email")
      .populate("professor", "username fullName email department")
      .populate("availability")
      .populate("cancelledBy", "username fullName")
      .sort({ date: 1, startTime: 1 })
      .lean();

    // Add appointmentDateTime to responses
    const enhancedAppointments = appointments.map((appointment) => ({
      ...appointment,
      appointmentDateTime: getAppointmentDateTime(appointment),
    }));

    res.json({
      success: true,
      data: enhancedAppointments,
    });
  } catch (error) {
    console.error("Get appointments error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error fetching appointments",
    });
  }
};

/**
 * Cancel an appointment
 * @route PUT /api/appointments/:appointmentId/cancel
 */
const cancelAppointment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { appointmentId } = req.params;
    const { cancelReason } = req.body;
    const userId = req.user._id;

    if (cancelReason && cancelReason.length > 500) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Cancel reason must be 500 characters or less",
      });
    }

    const appointment = await Appointment.findById(appointmentId).session(
      session
    );
    if (!appointment) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.status === "cancelled") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Appointment is already cancelled",
      });
    }

    const canCancel =
      (req.user.role === "student" &&
        appointment.student.toString() === userId.toString()) ||
      (req.user.role === "professor" &&
        appointment.professor.toString() === userId.toString());

    if (!canCancel) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "You do not have permission to cancel this appointment",
      });
    }

    appointment.status = "cancelled";
    appointment.cancelledBy = userId;
    appointment.cancelledAt = new Date();
    appointment.cancelReason = cancelReason || "";

    await Availability.findByIdAndUpdate(
      appointment.availability,
      { isBooked: false, bookedBy: null },
      { session }
    );

    await appointment.save({ session });
    await session.commitTransaction();

    await populateAppointment(appointment);

    res.json({
      success: true,
      message: "Appointment cancelled successfully",
      data: {
        ...appointment.toObject(),
        appointmentDateTime: getAppointmentDateTime(appointment),
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Cancel appointment error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error cancelling appointment",
    });
  } finally {
    session.endSession();
  }
};

/**
 * Get appointment details
 * @route GET /api/appointments/:appointmentId
 */
const getAppointmentDetails = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user._id;

    const appointment = await Appointment.findById(appointmentId)
      .populate("student", "username fullName email")
      .populate("professor", "username fullName email department")
      .populate("availability")
      .populate("cancelledBy", "username fullName")
      .lean();

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const canView =
      appointment.student._id.toString() === userId.toString() ||
      appointment.professor._id.toString() === userId.toString();

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this appointment",
      });
    }

    res.json({
      success: true,
      data: {
        ...appointment,
        appointmentDateTime: getAppointmentDateTime(appointment),
      },
    });
  } catch (error) {
    console.error("Get appointment details error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error fetching appointment details",
    });
  }
};

/**
 * Update appointment status
 * @route PUT /api/appointments/:appointmentId/status
 */
const updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    if (!["completed", "scheduled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be completed or scheduled",
      });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (
      req.user.role !== "professor" ||
      appointment.professor.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Only the professor can update appointment status",
      });
    }

    appointment.status = status;
    await appointment.save();

    await populateAppointment(appointment);

    res.json({
      success: true,
      message: "Appointment status updated successfully",
      data: {
        ...appointment.toObject(),
        appointmentDateTime: getAppointmentDateTime(appointment),
      },
    });
  } catch (error) {
    console.error("Update appointment status error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error updating appointment status",
    });
  }
};

// TODO: Add email notifications for appointment actions
// TODO: Consider caching frequent queries for performance

module.exports = {
  bookAppointment,
  getUserAppointments,
  cancelAppointment,
  getAppointmentDetails,
  updateAppointmentStatus,
};
