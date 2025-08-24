const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid authentication token'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret);
    
    // Add user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user'
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your authentication token has expired. Please log in again.'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided authentication token is invalid.'
      });
    } else {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Failed to authenticate the provided token.'
      });
    }
  }
};

const authenticateAdmin = (req, res, next) => {
  authenticateToken(req, res, (err) => {
    if (err) return next(err);
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin privileges required for this operation'
      });
    }
    
    next();
  });
};

const authenticatePremium = (req, res, next) => {
  authenticateToken(req, res, (err) => {
    if (err) return next(err);
    
    if (req.user.role !== 'admin' && req.user.role !== 'premium') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Premium subscription required for this feature'
      });
    }
    
    next();
  });
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, secret);
      
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user'
      };
    } catch (error) {
      // Token is invalid, but we continue without authentication
      req.user = null;
    }
  } else {
    req.user = null;
  }
  
  next();
};

const generateToken = (userId, email, role = 'user') => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign(
    { userId, email, role },
    secret,
    { expiresIn }
  );
};

const verifyToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  authenticateAdmin,
  authenticatePremium,
  optionalAuth,
  generateToken,
  verifyToken
};
