class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userRooms = new Map(); // userId -> roomName
  }

  initialize(io) {
    this.io = io;
    this.setupEventHandlers();
    console.log('Socket service initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Handle user authentication and room joining
      socket.on('authenticate', (data) => {
        this.handleAuthentication(socket, data);
      });
      
      // Handle OBD data updates
      socket.on('obd-data', (data) => {
        this.handleOBDData(socket, data);
      });
      
      // Handle trip updates
      socket.on('trip-update', (data) => {
        this.handleTripUpdate(socket, data);
      });
      
      // Handle coaching tip requests
      socket.on('request-coaching', (data) => {
        this.handleCoachingRequest(socket, data);
      });
      
      // Handle real-time analytics
      socket.on('analytics-request', (data) => {
        this.handleAnalyticsRequest(socket, data);
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });
      
      // Handle errors
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });
  }

  handleAuthentication(socket, data) {
    try {
      const { userId, token } = data;
      
      if (!userId || !token) {
        socket.emit('auth-error', { message: 'Missing user ID or token' });
        return;
      }
      
      // In a real app, you'd verify the JWT token here
      // For now, we'll just accept the userId
      
      // Store user connection
      this.connectedUsers.set(userId, socket.id);
      
      // Join user to their personal room
      const roomName = `user-${userId}`;
      socket.join(roomName);
      this.userRooms.set(userId, roomName);
      
      // Send confirmation
      socket.emit('authenticated', { 
        userId, 
        roomName,
        message: 'Successfully authenticated' 
      });
      
      console.log(`User ${userId} authenticated and joined room ${roomName}`);
      
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('auth-error', { message: 'Authentication failed' });
    }
  }

  handleOBDData(socket, data) {
    try {
      const { userId, obdData, timestamp } = data;
      
      if (!userId || !obdData) {
        socket.emit('obd-error', { message: 'Invalid OBD data' });
        return;
      }
      
      // Process OBD data (could include AI analysis here)
      const processedData = this.processOBDData(obdData);
      
      // Store data in database (in a real app)
      // await this.storeOBDData(userId, processedData);
      
      // Broadcast to user's room
      const roomName = this.userRooms.get(userId);
      if (roomName) {
        this.io.to(roomName).emit('obd-update', {
          userId,
          data: processedData,
          timestamp: timestamp || new Date().toISOString()
        });
      }
      
      // Send confirmation to sender
      socket.emit('obd-confirmed', { 
        message: 'OBD data received and processed',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('OBD data handling error:', error);
      socket.emit('obd-error', { message: 'Failed to process OBD data' });
    }
  }

  handleTripUpdate(socket, data) {
    try {
      const { userId, tripData, action } = data;
      
      if (!userId || !tripData || !action) {
        socket.emit('trip-error', { message: 'Invalid trip data' });
        return;
      }
      
      // Process trip update based on action
      let processedData;
      switch (action) {
        case 'start':
          processedData = this.processTripStart(userId, tripData);
          break;
        case 'update':
          processedData = this.processTripUpdate(userId, tripData);
          break;
        case 'end':
          processedData = this.processTripEnd(userId, tripData);
          break;
        default:
          throw new Error(`Unknown trip action: ${action}`);
      }
      
      // Store trip data (in a real app)
      // await this.storeTripData(userId, processedData);
      
      // Broadcast to user's room
      const roomName = this.userRooms.get(userId);
      if (roomName) {
        this.io.to(roomName).emit('trip-update', {
          userId,
          action,
          data: processedData,
          timestamp: new Date().toISOString()
        });
      }
      
      // Send confirmation to sender
      socket.emit('trip-confirmed', { 
        action,
        message: `Trip ${action} confirmed`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Trip update handling error:', error);
      socket.emit('trip-error', { message: 'Failed to process trip update' });
    }
  }

  handleCoachingRequest(socket, data) {
    try {
      const { userId, requestType, context } = data;
      
      if (!userId || !requestType) {
        socket.emit('coaching-error', { message: 'Invalid coaching request' });
        return;
      }
      
      // Generate coaching tip based on request type and context
      const coachingTip = this.generateCoachingTip(requestType, context);
      
      // Send coaching tip to user
      const roomName = this.userRooms.get(userId);
      if (roomName) {
        this.io.to(roomName).emit('coaching-tip', {
          userId,
          tip: coachingTip,
          timestamp: new Date().toISOString()
        });
      }
      
      // Send confirmation to sender
      socket.emit('coaching-confirmed', { 
        message: 'Coaching tip generated',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Coaching request handling error:', error);
      socket.emit('coaching-error', { message: 'Failed to generate coaching tip' });
    }
  }

  handleAnalyticsRequest(socket, data) {
    try {
      const { userId, analyticsType, timeRange } = data;
      
      if (!userId || !analyticsType) {
        socket.emit('analytics-error', { message: 'Invalid analytics request' });
        return;
      }
      
      // Generate analytics data (in a real app, this would query the database)
      const analyticsData = this.generateAnalytics(userId, analyticsType, timeRange);
      
      // Send analytics to user
      const roomName = this.userRooms.get(userId);
      if (roomName) {
        this.io.to(roomName).emit('analytics-data', {
          userId,
          type: analyticsType,
          data: analyticsData,
          timestamp: new Date().toISOString()
        });
      }
      
      // Send confirmation to sender
      socket.emit('analytics-confirmed', { 
        message: 'Analytics data generated',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Analytics request handling error:', error);
      socket.emit('analytics-error', { message: 'Failed to generate analytics' });
    }
  }

  handleDisconnection(socket) {
    try {
      // Find and remove user from connected users
      let disconnectedUserId = null;
      for (const [userId, socketId] of this.connectedUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          break;
        }
      }
      
      if (disconnectedUserId) {
        this.connectedUsers.delete(disconnectedUserId);
        this.userRooms.delete(disconnectedUserId);
        console.log(`User ${disconnectedUserId} disconnected`);
      }
      
      console.log(`Client disconnected: ${socket.id}`);
      
    } catch (error) {
      console.error('Disconnection handling error:', error);
    }
  }

  // Helper methods
  processOBDData(obdData) {
    // Add processing timestamp and any additional computed fields
    return {
      ...obdData,
      processedAt: new Date().toISOString(),
      // Add any computed fields here
    };
  }

  processTripStart(userId, tripData) {
    return {
      ...tripData,
      status: 'active',
      startedAt: new Date().toISOString(),
      userId
    };
  }

  processTripUpdate(userId, tripData) {
    return {
      ...tripData,
      lastUpdated: new Date().toISOString(),
      userId
    };
  }

  processTripEnd(userId, tripData) {
    return {
      ...tripData,
      status: 'completed',
      endedAt: new Date().toISOString(),
      userId
    };
  }

  generateCoachingTip(requestType, context) {
    // Simple coaching tip generation
    const tips = {
      acceleration: 'Gentle acceleration can improve fuel efficiency by up to 20%',
      braking: 'Anticipate stops and brake smoothly to save fuel',
      shifting: 'Shift to higher gears early to maintain low RPM',
      speed: 'Reducing speed by 10 km/h can save 15% fuel',
      general: 'Maintain steady speed and avoid rapid acceleration/braking'
    };
    
    return {
      id: `tip_${Date.now()}`,
      type: requestType,
      message: tips[requestType] || tips.general,
      priority: 'medium',
      timestamp: new Date().toISOString()
    };
  }

  generateAnalytics(userId, analyticsType, timeRange) {
    // Mock analytics data generation
    const mockData = {
      fuelEfficiency: {
        average: 7.5,
        trend: 'improving',
        best: 6.2,
        worst: 9.1
      },
      drivingScore: {
        current: 85,
        average: 78,
        trend: 'stable'
      },
      tripStats: {
        totalTrips: 24,
        totalDistance: 1250,
        totalFuel: 95.5
      }
    };
    
    return mockData[analyticsType] || mockData.drivingScore;
  }

  // Public methods for external use
  sendNotification(userId, notification) {
    const roomName = this.userRooms.get(userId);
    if (roomName) {
      this.io.to(roomName).emit('notification', {
        userId,
        notification,
        timestamp: new Date().toISOString()
      });
      return true;
    }
    return false;
  }

  broadcastToAll(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  getUserConnectionInfo(userId) {
    const socketId = this.connectedUsers.get(userId);
    const roomName = this.userRooms.get(userId);
    
    return {
      userId,
      socketId,
      roomName,
      isConnected: !!socketId
    };
  }
}

module.exports = new SocketService();
