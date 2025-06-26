const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/User");
const Availability = require("../models/Availability");
const Appointment = require("../models/Appointment");

// Test database connection
const MONGODB_TEST_URI = process.env.MONGODB_URI_TEST;

describe("College Appointment System E2E Test", () => {
  let server;
  let studentA1Token, studentA2Token, professorP1Token;
  let studentA1Id, studentA2Id, professorP1Id;
  let availabilityT1Id, availabilityT2Id;
  let appointmentT1Id, appointmentT2Id;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(MONGODB_TEST_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Clear test database
    await User.deleteMany({});
    await Availability.deleteMany({});
    await Appointment.deleteMany({});

    server = app.listen(0); // Use random port for testing
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({});
    await Availability.deleteMany({});
    await Appointment.deleteMany({});
    await mongoose.connection.close();
    if (server) {
      server.close();
    }
  });

  describe("Complete User Flow Test", () => {
    // Step 1: Student A1 authenticates
    test("Student A1 should register and authenticate", async () => {
      const studentA1Data = {
        username: "studentA1",
        email: "studenta1@college.edu",
        password: "password123",
        role: "student",
        fullName: "Student A1",
        department: "Computer Science",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(studentA1Data)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe("student");
      expect(response.body.data.token).toBeDefined();

      studentA1Token = response.body.data.token;
      studentA1Id = response.body.data.user._id;
    });

    // Step 2: Professor P1 authenticates
    test("Professor P1 should register and authenticate", async () => {
      const professorP1Data = {
        username: "professorP1",
        email: "professorp1@college.edu",
        password: "password123",
        role: "professor",
        fullName: "Professor P1",
        department: "Computer Science",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(professorP1Data)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe("professor");
      expect(response.body.data.token).toBeDefined();

      professorP1Token = response.body.data.token;
      professorP1Id = response.body.data.user._id;
    });

    // Step 3: Professor P1 specifies availability
    test("Professor P1 should create availability slots", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      // Create availability slot T1
      const availabilityT1 = {
        date: tomorrowStr,
        startTime: "10:00",
        endTime: "11:00",
        duration: 60,
      };

      const responseT1 = await request(app)
        .post("/api/availability")
        .set("Authorization", `Bearer ${professorP1Token}`)
        .send(availabilityT1)
        .expect(201);

      expect(responseT1.body.success).toBe(true);
      expect(responseT1.body.data.startTime).toBe("10:00");
      availabilityT1Id = responseT1.body.data._id;

      // Create availability slot T2
      const availabilityT2 = {
        date: tomorrowStr,
        startTime: "14:00",
        endTime: "15:00",
        duration: 60,
      };

      const responseT2 = await request(app)
        .post("/api/availability")
        .set("Authorization", `Bearer ${professorP1Token}`)
        .send(availabilityT2)
        .expect(201);

      expect(responseT2.body.success).toBe(true);
      expect(responseT2.body.data.startTime).toBe("14:00");
      availabilityT2Id = responseT2.body.data._id;
    });

    // Step 4: Student A1 views available slots
    test("Student A1 should view available time slots for Professor P1", async () => {
      const response = await request(app)
        .get(`/api/availability/professor/${professorP1Id}/available`)
        .set("Authorization", `Bearer ${studentA1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].isBooked).toBe(false);
      expect(response.body.data[1].isBooked).toBe(false);
    });

    // Step 5: Student A1 books appointment with Professor P1 for time T1
    test("Student A1 should book appointment for time T1", async () => {
      const bookingData = {
        availabilityId: availabilityT1Id,
        notes: "Discussion about thesis proposal",
      };

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${studentA1Token}`)
        .send(bookingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.student._id).toBe(studentA1Id);
      expect(response.body.data.professor._id).toBe(professorP1Id);
      expect(response.body.data.status).toBe("scheduled");

      appointmentT1Id = response.body.data._id;
    });

    // Step 6: Student A2 authenticates
    test("Student A2 should register and authenticate", async () => {
      const studentA2Data = {
        username: "studentA2",
        email: "studenta2@college.edu",
        password: "password123",
        role: "student",
        fullName: "Student A2",
        department: "Computer Science",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(studentA2Data)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe("student");
      expect(response.body.data.token).toBeDefined();

      studentA2Token = response.body.data.token;
      studentA2Id = response.body.data.user._id;
    });

    // Step 7: Student A2 books appointment for time T2
    test("Student A2 should book appointment for time T2", async () => {
      const bookingData = {
        availabilityId: availabilityT2Id,
        notes: "Project guidance meeting",
      };

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${studentA2Token}`)
        .send(bookingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.student._id).toBe(studentA2Id);
      expect(response.body.data.professor._id).toBe(professorP1Id);
      expect(response.body.data.status).toBe("scheduled");

      appointmentT2Id = response.body.data._id;
    });

    // Step 8: Verify both slots are now booked
    test("Available slots should show T1 and T2 as booked", async () => {
      const response = await request(app)
        .get(`/api/availability/professor/${professorP1Id}/available`)
        .set("Authorization", `Bearer ${studentA1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0); // No available slots
    });

    // Step 9: Professor P1 cancels appointment with Student A1
    test("Professor P1 should cancel appointment with Student A1", async () => {
      const cancelData = {
        cancelReason: "Professor unavailable due to emergency",
      };

      const response = await request(app)
        .put(`/api/appointments/${appointmentT1Id}/cancel`)
        .set("Authorization", `Bearer ${professorP1Token}`)
        .send(cancelData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("cancelled");
      expect(response.body.data.cancelledBy._id).toBe(professorP1Id);
      expect(response.body.data.cancelReason).toBe(
        "Professor unavailable due to emergency"
      );
    });

    // Step 10: Student A1 checks appointments and finds none pending
    test("Student A1 should have no scheduled appointments", async () => {
      const response = await request(app)
        .get("/api/appointments?status=scheduled")
        .set("Authorization", `Bearer ${studentA1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0); // No scheduled appointments

      // Also check all appointments to verify cancellation
      const allAppointments = await request(app)
        .get("/api/appointments")
        .set("Authorization", `Bearer ${studentA1Token}`)
        .expect(200);

      expect(allAppointments.body.data).toHaveLength(1);
      expect(allAppointments.body.data[0].status).toBe("cancelled");
    });

    // Bonus: Verify Student A2 still has their appointment
    test("Student A2 should still have their scheduled appointment", async () => {
      const response = await request(app)
        .get("/api/appointments?status=scheduled")
        .set("Authorization", `Bearer ${studentA2Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]._id).toBe(appointmentT2Id);
      expect(response.body.data[0].status).toBe("scheduled");
    });

    // Bonus: Verify T1 slot is available again after cancellation
    test("Time slot T1 should be available again after cancellation", async () => {
      const response = await request(app)
        .get(`/api/availability/professor/${professorP1Id}/available`)
        .set("Authorization", `Bearer ${studentA1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1); // T1 is available again
      expect(response.body.data[0]._id).toBe(availabilityT1Id);
      expect(response.body.data[0].isBooked).toBe(false);
    });
  });

  describe("Additional API Tests", () => {
    test("Should not allow booking past time slots", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      // Create past availability
      const pastAvailability = {
        date: yesterdayStr,
        startTime: "10:00",
        endTime: "11:00",
      };

      const response = await request(app)
        .post("/api/availability")
        .set("Authorization", `Bearer ${professorP1Token}`)
        .send(pastAvailability)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("past dates");
    });

    test("Should not allow double booking of same slot", async () => {
      const bookingData = {
        availabilityId: availabilityT2Id, // Already booked by A2
        notes: "Trying to double book",
      };

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${studentA1Token}`)
        .send(bookingData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already booked");
    });

    test("Should require authentication for protected routes", async () => {
      const response = await request(app).get("/api/appointments").expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("No token provided");
    });

    test("Should validate user roles", async () => {
      // Student trying to create availability
      const response = await request(app)
        .post("/api/availability")
        .set("Authorization", `Bearer ${studentA1Token}`)
        .send({
          date: "2024-12-25",
          startTime: "10:00",
          endTime: "11:00",
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("professor role required");
    });
  });
});

console.log("🧪 E2E Test Suite Completed - College Appointment System");
