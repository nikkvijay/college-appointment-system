const Availability = require("../models/Availability");
const User = require("../models/User");

// Create availability slots for professor
const createAvailability = async (req, res) => {
  try {
    const { date, startTime, endTime, duration } = req.body;
    const professorId = req.user._id;

    // Validate required fields
    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Date, start time, and end time are required",
      });
    }

    // Validate date format and ensure it's not in the past
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      return res.status(400).json({
        success: false,
        message: "Cannot create availability for past dates",
      });
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid time format. Use HH:MM format",
      });
    }

    // Check if availability already exists for this slot
    const existingAvailability = await Availability.findOne({
      professor: professorId,
      date: appointmentDate,
      startTime,
      endTime,
    });

    if (existingAvailability) {
      return res.status(400).json({
        success: false,
        message: "Availability already exists for this time slot",
      });
    }

    // Create new availability
    const availability = new Availability({
      professor: professorId,
      date: appointmentDate,
      startTime,
      endTime,
      duration: duration || 60,
    });

    await availability.save();

    // Populate professor details
    await availability.populate(
      "professor",
      "username fullName email department"
    );

    res.status(201).json({
      success: true,
      message: "Availability created successfully",
      data: availability,
    });
  } catch (error) {
    console.error("Create availability error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating availability",
    });
  }
};

// Get professor's availability
const getProfessorAvailability = async (req, res) => {
  try {
    const professorId = req.params.professorId || req.user._id;

    // If getting another professor's availability, make sure they exist
    if (professorId !== req.user._id.toString()) {
      const professor = await User.findById(professorId);
      if (!professor || professor.role !== "professor") {
        return res.status(404).json({
          success: false,
          message: "Professor not found",
        });
      }
    }

    const availability = await Availability.find({
      professor: professorId,
      date: { $gte: new Date() }, // Only future dates
    })
      .populate("professor", "username fullName email department")
      .populate("bookedBy", "username fullName email")
      .sort({ date: 1, startTime: 1 });

    res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error("Get availability error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching availability",
    });
  }
};

// Get available slots for a professor (not booked)
const getAvailableSlots = async (req, res) => {
  try {
    const { professorId } = req.params;
    const { date } = req.query;

    // Verify professor exists
    const professor = await User.findById(professorId);
    if (!professor || professor.role !== "professor") {
      return res.status(404).json({
        success: false,
        message: "Professor not found",
      });
    }

    // Build query
    const query = {
      professor: professorId,
      isBooked: false,
      date: { $gte: new Date() },
    };

    // Filter by specific date if provided
    if (date) {
      const filterDate = new Date(date);
      query.date = {
        $gte: filterDate,
        $lt: new Date(filterDate.getTime() + 24 * 60 * 60 * 1000),
      };
    }

    const availableSlots = await Availability.find(query)
      .populate("professor", "username fullName email department")
      .sort({ date: 1, startTime: 1 });

    res.json({
      success: true,
      data: availableSlots,
    });
  } catch (error) {
    console.error("Get available slots error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching available slots",
    });
  }
};

const getAvailabilityDateTime = (availability, timeField = "startTime") => {
  try {
    const [hours, minutes] = availability[timeField].split(":");
    const dateTime = new Date(availability.date);
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return dateTime;
  } catch (error) {
    console.error("Error computing availability datetime:", error.message);
    return null;
  }
};

// Delete availability slot
const deleteAvailability = async (req, res) => {
  try {
    const { availabilityId } = req.params;
    const professorId = req.user._id;

    const availability = await Availability.findOne({
      _id: availabilityId,
      professor: professorId,
    });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: "Availability slot not found",
      });
    }

    if (availability.isBooked) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete booked availability slot",
      });
    }

    await Availability.findByIdAndDelete(availabilityId);

    res.json({
      success: true,
      message: "Availability slot deleted successfully",
    });
  } catch (error) {
    console.error("Delete availability error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting availability",
    });
  }
};

module.exports = {
  createAvailability,
  getProfessorAvailability,
  getAvailableSlots,
  deleteAvailability,
};
