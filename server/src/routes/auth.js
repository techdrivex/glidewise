const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { asyncHandler, sendSuccessResponse, sendErrorResponse } = require('../middleware/errorHandler');
const { generateToken } = require('../middleware/auth');
const DatabaseService = require('../services/DatabaseService');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('firstName').optional().isLength({ min: 1, max: 100 }).withMessage('First name must be between 1 and 100 characters'),
  body('lastName').optional().isLength({ min: 1, max: 100 }).withMessage('Last name must be between 1 and 100 characters')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// User registration
router.post('/register', registerValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(res, { 
      message: 'Validation failed',
      details: errors.array()
    }, 400);
  }
  
  const { email, password, firstName, lastName } = req.body;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Check if user already exists
    const existingUser = await knex('users')
      .where('email', email)
      .first();
    
    if (existingUser) {
      return sendErrorResponse(res, { 
        message: 'User with this email already exists' 
      }, 409);
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const [userId] = await knex('users').insert({
      email,
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
      role: 'user',
      isActive: true
    });
    
    // Create default user preferences
    await knex('user_preferences').insert({
      userId,
      ecoMode: true,
      hapticFeedback: true,
      voicePrompts: false,
      autoStartTrips: true,
      units: 'metric'
    });
    
    // Generate JWT token
    const token = generateToken(userId, email, 'user');
    
    // Fetch created user (without password)
    const user = await knex('users')
      .where('id', userId)
      .select('id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt')
      .first();
    
    sendSuccessResponse(res, {
      user,
      token,
      message: 'User registered successfully'
    }, 'User registered successfully', 201);
    
  } catch (error) {
    console.error('Registration error:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// User login
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(res, { 
      message: 'Validation failed',
      details: errors.array()
    }, 400);
  }
  
  const { email, password } = req.body;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Find user by email
    const user = await knex('users')
      .where('email', email)
      .first();
    
    if (!user) {
      return sendErrorResponse(res, { 
        message: 'Invalid email or password' 
      }, 401);
    }
    
    // Check if user is active
    if (!user.isActive) {
      return sendErrorResponse(res, { 
        message: 'Account is deactivated' 
      }, 401);
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return sendErrorResponse(res, { 
        message: 'Invalid email or password' 
      }, 401);
    }
    
    // Generate JWT token
    const token = generateToken(user.id, user.email, user.role);
    
    // Update last login time
    await knex('users')
      .where('id', user.id)
      .update({ updatedAt: knex.fn.now() });
    
    // Remove password from response
    const { passwordHash, ...userWithoutPassword } = user;
    
    sendSuccessResponse(res, {
      user: userWithoutPassword,
      token,
      message: 'Login successful'
    }, 'Login successful');
    
  } catch (error) {
    console.error('Login error:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get current user profile
router.get('/me', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  try {
    const knex = DatabaseService.getKnex();
    
    const user = await knex('users')
      .where('id', userId)
      .select('id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt', 'updatedAt')
      .first();
    
    if (!user) {
      return sendErrorResponse(res, { 
        message: 'User not found' 
      }, 404);
    }
    
    // Get user preferences
    const preferences = await knex('user_preferences')
      .where('userId', userId)
      .first();
    
    // Get user statistics
    const stats = await knex('trips')
      .where('userId', userId)
      .select(
        knex.raw('COUNT(*) as totalTrips'),
        knex.raw('SUM(distance) as totalDistance'),
        knex.raw('AVG(ecoScore) as avgEcoScore')
      )
      .first();
    
    const userProfile = {
      ...user,
      preferences: preferences || {},
      stats: {
        totalTrips: parseInt(stats.totalTrips) || 0,
        totalDistance: parseFloat(stats.totalDistance) || 0,
        avgEcoScore: Math.round(parseFloat(stats.avgEcoScore) || 0)
      }
    };
    
    sendSuccessResponse(res, userProfile, 'Profile retrieved successfully');
    
  } catch (error) {
    console.error('Profile fetch error:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Update user profile
router.put('/me', [
  body('firstName').optional().isLength({ min: 1, max: 100 }).withMessage('First name must be between 1 and 100 characters'),
  body('lastName').optional().isLength({ min: 1, max: 100 }).withMessage('Last name must be between 1 and 100 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(res, { 
      message: 'Validation failed',
      details: errors.array()
    }, 400);
  }
  
  const userId = req.user.id;
  const { firstName, lastName } = req.body;
  
  try {
    const knex = DatabaseService.getKnex();
    
    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    updates.updatedAt = knex.fn.now();
    
    if (Object.keys(updates).length > 0) {
      await knex('users')
        .where('id', userId)
        .update(updates);
    }
    
    sendSuccessResponse(res, { message: 'Profile updated successfully' });
    
  } catch (error) {
    console.error('Profile update error:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Change password
router.put('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(res, { 
      message: 'Validation failed',
      details: errors.array()
    }, 400);
  }
  
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Get current user with password
    const user = await knex('users')
      .where('id', userId)
      .select('passwordHash')
      .first();
    
    if (!user) {
      return sendErrorResponse(res, { 
        message: 'User not found' 
      }, 404);
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return sendErrorResponse(res, { 
        message: 'Current password is incorrect' 
      }, 400);
    }
    
    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await knex('users')
      .where('id', userId)
      .update({
        passwordHash: newPasswordHash,
        updatedAt: knex.fn.now()
      });
    
    sendSuccessResponse(res, { message: 'Password changed successfully' });
    
  } catch (error) {
    console.error('Password change error:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Refresh token (optional - for token refresh logic)
router.post('/refresh', asyncHandler(async (req, res) => {
  // In a real app, you'd implement token refresh logic here
  // For now, we'll just return an error
  return sendErrorResponse(res, { 
    message: 'Token refresh not implemented' 
  }, 501);
}));

// Logout (optional - for server-side logout logic)
router.post('/logout', asyncHandler(async (req, res) => {
  // In a real app, you might implement token blacklisting here
  // For now, we'll just return success
  sendSuccessResponse(res, { message: 'Logged out successfully' });
}));

module.exports = router;
