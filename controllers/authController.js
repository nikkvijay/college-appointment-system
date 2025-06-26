const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

/**
 * Register a new user
 * @route POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { username, email, password, role, fullName, department } = req.body;

    // Validate required fields
    if (!username || !email || !password || !role || !fullName) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Validate role
    if (!["student", "professor"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be either student or professor",
      });
    }

    // Validate input formats
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        success: false,
        message: "Username must be between 3 and 30 characters",
      });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }
    if (
      password.length < 6 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters and include letters and numbers",
      });
    }
    if (fullName.length < 2 || fullName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Full name must be between 2 and 100 characters",
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    // Create new user
    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      role,
      fullName,
      department: department || null,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userData = user.toObject();
    delete userData.password;

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { user: userData, token },
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

/**
 * Login a user
 * @route POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    // Find user
    const user = await User.findOne({
      $or: [{ username }, { email: username.toLowerCase() }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userData = user.toObject();
    delete userData.password;

    res.json({
      success: true,
      message: "Login successful",
      data: { user: userData, token },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

/**
 * Get current user profile
 * @route GET /api/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    // Remove password from response
    const userData = req.user.toObject();
    delete userData.password;

    res.json({
      success: true,
      data: { user: userData },
    });
  } catch (error) {
    console.error("Profile error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error fetching profile",
    });
  }
};

// TODO: Add password reset functionality
// TODO: Consider adding email verification after registration

module.exports = {
  register,
  login,
  getProfile,
};
