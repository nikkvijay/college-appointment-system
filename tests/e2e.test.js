const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');


// Test database connection
const MONGODB_TEST_URI = process.env.MONGODB_URI;

describe('College Appointment System E2E Test', () => {
  let server;
  let studentA1Token, studentA2Token, professorP1Token;
  let studentA1Id, studentA2Id, professorP1Id;
  

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(MONGODB_TEST_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Clear test database
    await User.deleteMany({});
    

    server = app.listen(0); // Use random port for testing
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({});
   
    await mongoose.connection.close();
    if (server) {
      server.close();
    }
  });

  describe('Complete User Flow Test', () => {
    
    // Step 1: Student A1 authenticates
    test('Student A1 should register and authenticate', async () => {
      const studentA1Data = {
        username: 'studentA1',
        email: 'studenta1@college.edu',
        password: 'password123',
        role: 'student',
        fullName: 'Student A1',
        department: 'Computer Science'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(studentA1Data)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('student');
      expect(response.body.data.token).toBeDefined();

      studentA1Token = response.body.data.token;
      studentA1Id = response.body.data.user._id;
    });

    // Step 2: Professor P1 authenticates  
    test('Professor P1 should register and authenticate', async () => {
      const professorP1Data = {
        username: 'professorP1',
        email: 'professorp1@college.edu',
        password: 'password123',
        role: 'professor',
        fullName: 'Professor P1',
        department: 'Computer Science'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(professorP1Data)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('professor');
      expect(response.body.data.token).toBeDefined();

      professorP1Token = response.body.data.token;
      professorP1Id = response.body.data.user._id;
    });

    
    // Bonus: Verify Student A2 still has their appointment
    test('Student A2 should still have their scheduled appointment', async () => {
      const response = await request(app)
        .get('/api/appointments?status=scheduled')
        .set('Authorization', `Bearer ${studentA2Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]._id).toBe(appointmentT2Id);
      expect(response.body.data[0].status).toBe('scheduled');
    });

    
  });

  
});

console.log('🧪 E2E Test Suite Completed - College Appointment System');