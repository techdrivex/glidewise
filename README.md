# GlideWise - AI Driving Coach for Fuel & Energy Efficiency

[![GitHub](https://img.shields.io/badge/GitHub-View%20on%20GitHub-blue?logo=github)](https://github.com/techdrivex/glidewise)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/techdrivex/glidewise/blob/main/LICENSE)
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Coverage](https://img.shields.io/badge/coverage-90%25-brightgreen.svg)]()

GlideWise is an intelligent driving coach that uses AI and IoT technology to help drivers improve fuel efficiency, reduce emissions, and develop eco-friendly driving habits. The platform combines real-time vehicle data from OBD-II devices with machine learning to provide personalized coaching and insights.

**🔗 [View on GitHub](https://github.com/techdrivex/glidewise)**

## 🚗 Features

### Core Functionality
- **Real-time OBD-II Monitoring**: Bluetooth and WiFi connectivity to vehicle diagnostic systems
- **AI-Powered Coaching**: Personalized driving tips based on real-time behavior analysis
- **Trip Analytics**: Comprehensive tracking of driving patterns, fuel consumption, and efficiency metrics
- **Eco-Score System**: Gamified scoring system to encourage sustainable driving habits
- **Route Optimization**: GPS tracking with route analysis and optimization suggestions

### Advanced Features
- **Machine Learning Models**: On-device and cloud-based AI models for behavior prediction
- **Real-time Notifications**: Instant feedback on driving behavior and efficiency
- **Historical Analysis**: Long-term trend analysis and performance comparison
- **Multi-Vehicle Support**: Manage multiple vehicles with individual profiles
- **Social Features**: Compare performance with friends and community benchmarks

## 🏗️ Architecture

### Mobile Application (React Native)
- **Framework**: React Native 0.72.6
- **Navigation**: React Navigation with Stack and Tab navigators
- **State Management**: React Context API with useReducer
- **Bluetooth**: react-native-ble-plx for OBD-II communication
- **AI/ML**: TensorFlow.js for on-device inference
- **Maps & Location**: React Native Maps and Geolocation services
- **UI Components**: Custom components with React Native Vector Icons

### Backend Server (Node.js)
- **Framework**: Express.js 4.18.2
- **Database**: Knex.js ORM with support for SQLite, PostgreSQL, and MySQL
- **Real-time**: Socket.IO for live data streaming
- **Authentication**: JWT-based authentication with role-based access control
- **API**: RESTful API with comprehensive validation and error handling
- **AI Services**: Machine learning model management and prediction services

### Database Schema
- **Users**: User profiles, authentication, and preferences
- **Vehicles**: Vehicle information and specifications
- **Trips**: Driving session data with metrics and analysis
- **OBD Data**: Real-time vehicle diagnostic information
- **AI Models**: Machine learning model metadata and performance
- **Coaching**: Personalized driving tips and recommendations

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- React Native development environment
- Android Studio / Xcode (for mobile development)
- PostgreSQL, MySQL, or SQLite database

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/techdrivex/glidewise.git
   cd glidewise
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Environment Setup**
   ```bash
   # Copy environment files
   cp server/.env.development server/.env
   
   # Edit server/.env with your configuration
   # Set database connection, JWT secret, etc.
   ```

4. **Database Setup**
   ```bash
   # Run migrations
   cd server
   npm run migrate
   
   # Seed with sample data (optional)
   npm run seed
   ```

5. **Start Development Servers**
   ```bash
   # Start both mobile and server (from root)
   npm run dev
   
   # Or start individually
   npm run start:server    # Backend server
   npm run start:mobile    # React Native app
   ```

### Mobile App Setup

1. **Android**
   ```bash
   cd mobile
   npm run android
   ```

2. **iOS**
   ```bash
   cd mobile
   npm run ios
   ```

## 📱 Mobile App Screens

### Dashboard Screen
- Real-time OBD connection status
- Current trip information
- Live vehicle metrics (speed, RPM, throttle, engine load)
- Eco-score display
- Recent coaching tips

### OBD Connection Screen
- Bluetooth device scanning and pairing
- WiFi connection setup (simulated)
- Connection status monitoring
- Demo mode for testing

### Trips Screen
- Trip history with detailed statistics
- Overall performance metrics
- Individual trip analysis
- Route visualization

### Coaching Screen
- Personalized AI coaching tips
- Learning progress tracking
- Tip categories (acceleration, braking, shifting, etc.)
- Interactive learning resources

### Settings Screen
- App preferences and configuration
- OBD device management
- Data export and privacy settings
- Account management

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile

### Trips
- `GET /api/trips` - Get user trips with pagination
- `POST /api/trips` - Create new trip
- `GET /api/trips/:id` - Get specific trip details
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### OBD Data
- `POST /api/obd/data` - Store OBD data
- `GET /api/obd/data` - Get historical OBD data
- `GET /api/obd/data/trip/:tripId` - Get trip-specific OBD data
- `GET /api/obd/trends` - Get OBD data trends

### Analytics
- `GET /api/analytics/overview` - Get comprehensive analytics
- `GET /api/analytics/trends` - Get performance trends
- `GET /api/analytics/comparison` - Compare performance periods
- `GET /api/analytics/insights` - Get AI-generated insights

### AI Models
- `GET /api/ai/models` - Get user's AI models
- `POST /api/ai/models` - Create new AI model
- `PUT /api/ai/models/:id` - Update AI model
- `POST /api/ai/training/start/:id` - Start model training
- `GET /api/ai/performance` - Get model performance metrics

## 🗄️ Database Schema

### Core Tables
```sql
-- Users and authentication
users (id, email, password, firstName, lastName, role, isActive, ...)
user_preferences (id, userId, key, value, description, ...)

-- Vehicle management
vehicles (id, userId, make, model, year, vin, fuelType, ...)

-- Trip tracking
trips (id, userId, vehicleId, startTime, endTime, distance, fuelConsumed, ecoScore, ...)
trip_routes (id, tripId, latitude, longitude, timestamp, speed, altitude, ...)
trip_events (id, tripId, type, timestamp, description, severity, ...)

-- OBD and telemetry
obd_data (id, userId, tripId, timestamp, engineRPM, vehicleSpeed, engineLoad, ...)

-- AI and coaching
ai_models (id, userId, name, type, status, accuracy, ...)
model_predictions (id, modelId, inputData, prediction, accuracy, confidence, ...)
coaching_tips (id, userId, type, title, description, priority, ...)
```

## 🤖 AI/ML Features

### Model Types
- **Eco Score Predictor**: Predicts driving efficiency scores
- **Fuel Efficiency Analyzer**: Analyzes consumption patterns
- **Driving Behavior Classifier**: Categorizes driving styles
- **Maintenance Predictor**: Predicts maintenance needs

### Training Pipeline
- Data collection from OBD devices and user feedback
- Feature engineering and preprocessing
- Model training with TensorFlow.js
- Performance evaluation and validation
- Continuous learning and model updates

## 🔒 Security Features

- JWT-based authentication with refresh tokens
- Role-based access control (user, admin, premium)
- Input validation and sanitization
- Rate limiting and DDoS protection
- Secure password hashing with bcrypt
- CORS configuration and security headers

## 🧪 Testing

### Backend Testing
```bash
cd server
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:api      # API integration tests
```

### Mobile Testing
```bash
cd mobile
npm test              # Run Jest tests
npm run test:e2e      # End-to-end tests (if configured)
```

## 📊 Performance Monitoring

- Real-time performance metrics
- Database query optimization
- API response time monitoring
- Error tracking and logging
- User behavior analytics

## 🚀 Deployment

### Backend Deployment
```bash
cd server
npm run build         # Build production bundle
npm start             # Start production server
```

### Mobile App Deployment
```bash
cd mobile
npm run build:android # Build Android APK
npm run build:ios     # Build iOS app (requires macOS)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React Native community for the excellent mobile framework
- TensorFlow.js team for on-device machine learning capabilities
- OBD-II community for vehicle diagnostic standards
- Open source contributors who made this project possible

## 📞 Support

- **Documentation**: [Wiki](https://github.com/techdrivex/glidewise/wiki)
- **Issues**: [GitHub Issues](https://github.com/techdrivex/glidewise/issues)
- **Discussions**: [GitHub Discussions](https://github.com/techdrivex/glidewise/discussions)
- **Email**: support@glidewise.com

## 🔮 Roadmap

### Phase 1 (Current)
- ✅ Core OBD-II connectivity
- ✅ Basic AI coaching system
- ✅ Trip tracking and analytics
- ✅ User authentication and profiles

### Phase 2 (Next)
- 🔄 Advanced machine learning models
- 🔄 Social features and leaderboards
- 🔄 Integration with electric vehicles
- 🔄 Advanced route optimization

### Phase 3 (Future)
- 📋 Fleet management features
- 📋 Insurance integration
- 📋 Advanced predictive analytics
- 📋 IoT device ecosystem expansion

---

**GlideWise** - Driving the future of sustainable transportation, one trip at a time. 🚗💚
