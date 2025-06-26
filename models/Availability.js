const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    professor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
    },
    endTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
    },
    isBooked: {
      type: Boolean,
      default: false,
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    duration: {
      type: Number,
      default: 60, // duration in minutes
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
availabilitySchema.index({ professor: 1, date: 1, startTime: 1 });
availabilitySchema.index({ professor: 1, isBooked: 1 });

// Virtual for combining date and time
availabilitySchema.virtual("startDateTime").get(function () {
  const [hours, minutes] = this.startTime.split(":");
  const dateTime = new Date(this.date);
  dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return dateTime;
});

availabilitySchema.virtual("endDateTime").get(function () {
  const [hours, minutes] = this.endTime.split(":");
  const dateTime = new Date(this.date);
  dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return dateTime;
});

// Ensure virtuals are included when converting to JSON
availabilitySchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Availability", availabilitySchema);
