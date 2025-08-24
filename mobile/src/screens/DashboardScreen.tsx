import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import OBDService from '../services/OBDService';
import AIService from '../services/AIService';
import LocationService from '../services/LocationService';
import { TripData, OBDData, CoachingTip } from '../context/AppContext';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { state, dispatch } = useAppContext();
  const [isDriving, setIsDriving] = useState(false);
  const [tripStartTime, setTripStartTime] = useState<Date | null>(null);

  useEffect(() => {
    // Set up OBD data callback
    OBDService.setDataCallback((data: OBDData) => {
      dispatch({ type: 'SET_OBD_DATA', payload: data });
      
      // Analyze driving behavior with AI
      AIService.analyzeDrivingBehavior(data).then(({ ecoScore, coachingTips }) => {
        dispatch({ type: 'SET_ECO_SCORE', payload: ecoScore });
        
        // Add new coaching tips
        coachingTips.forEach(tip => {
          dispatch({ type: 'ADD_COACHING_TIP', payload: tip });
        });
      });
    });

    // Set up location callbacks
    LocationService.setLocationUpdateCallback((location) => {
      if (isDriving && state.currentTrip) {
        // Update current trip with new location
        const updatedTrip = {
          ...state.currentTrip,
          route: [...state.currentTrip.route, {
            lat: location.latitude,
            lng: location.longitude,
            timestamp: location.timestamp,
          }],
        };
        dispatch({ type: 'SET_CURRENT_TRIP', payload: updatedTrip });
      }
    });

    return () => {
      OBDService.setDataCallback(null);
    };
  }, [isDriving, state.currentTrip]);

  const startTrip = () => {
    if (!state.isOBDConnected) {
      Alert.alert('OBD Not Connected', 'Please connect to your OBD-II device first.');
      return;
    }

    const newTrip: TripData = {
      id: `trip_${Date.now()}`,
      startTime: new Date(),
      distance: 0,
      fuelConsumed: 0,
      efficiency: 0,
      ecoScore: state.ecoScore,
      route: [],
      events: [],
    };

    dispatch({ type: 'SET_CURRENT_TRIP', payload: newTrip });
    setTripStartTime(new Date());
    setIsDriving(true);
    
    // Start location tracking
    LocationService.startTracking();
    
    dispatch({ type: 'SET_DRIVING_STATUS', payload: true });
  };

  const endTrip = () => {
    if (!state.currentTrip) return;

    const endTime = new Date();
    const duration = endTime.getTime() - tripStartTime!.getTime();
    const routeData = LocationService.stopTracking();
    
    // Calculate final trip data
    const finalTrip: TripData = {
      ...state.currentTrip,
      endTime,
      distance: LocationService.calculateRouteDistance(),
      fuelConsumed: calculateFuelConsumption(),
      efficiency: calculateEfficiency(),
      route: routeData.map(loc => ({
        lat: loc.latitude,
        lng: loc.longitude,
        timestamp: loc.timestamp,
      })),
    };

    dispatch({ type: 'ADD_TRIP_HISTORY', payload: finalTrip });
    dispatch({ type: 'SET_CURRENT_TRIP', payload: null });
    dispatch({ type: 'SET_DRIVING_STATUS', payload: false });
    
    setIsDriving(false);
    setTripStartTime(null);
    
    // Show trip summary
    showTripSummary(finalTrip);
  };

  const calculateFuelConsumption = (): number => {
    if (!state.currentOBDData) return 0;
    
    // Simple calculation - in a real app, this would be more sophisticated
    const distance = LocationService.calculateRouteDistance();
    const baseConsumption = 7.5; // L/100km base
    const ecoMultiplier = state.ecoScore / 100;
    
    return (distance * baseConsumption * ecoMultiplier) / 100;
  };

  const calculateEfficiency = (): number => {
    const fuelConsumed = calculateFuelConsumption();
    const distance = LocationService.calculateRouteDistance();
    
    if (distance === 0) return 0;
    return (fuelConsumed / distance) * 100; // L/100km
  };

  const showTripSummary = (trip: TripData) => {
    const duration = trip.endTime!.getTime() - trip.startTime.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    Alert.alert(
      'Trip Complete!',
      `Distance: ${trip.distance.toFixed(2)} km\n` +
      `Duration: ${hours}h ${minutes}m\n` +
      `Fuel: ${trip.fuelConsumed.toFixed(2)} L\n` +
      `Efficiency: ${trip.efficiency.toFixed(1)} L/100km\n` +
      `Eco Score: ${trip.ecoScore}/100`,
      [{ text: 'OK' }]
    );
  };

  const getEcoScoreColor = (score: number): string => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const getEcoScoreText = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>GlideWise</Text>
          <Text style={styles.subtitle}>AI Driving Coach</Text>
        </View>

        {/* OBD Connection Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: state.isOBDConnected ? '#4CAF50' : '#F44336' }]} />
            <Text style={styles.statusText}>
              {state.isOBDConnected ? 'OBD Connected' : 'OBD Disconnected'}
            </Text>
          </View>
          {state.isOBDConnected && (
            <Text style={styles.statusSubtext}>
              Vehicle data streaming...
            </Text>
          )}
        </View>

        {/* Eco Score */}
        <View style={styles.ecoScoreCard}>
          <Text style={styles.ecoScoreLabel}>Your Eco Score</Text>
          <View style={styles.ecoScoreCircle}>
            <Text style={[styles.ecoScoreValue, { color: getEcoScoreColor(state.ecoScore) }]}>
              {state.ecoScore}
            </Text>
            <Text style={styles.ecoScoreUnit}>/100</Text>
          </View>
          <Text style={[styles.ecoScoreText, { color: getEcoScoreColor(state.ecoScore) }]}>
            {getEcoScoreText(state.ecoScore)}
          </Text>
        </View>

        {/* Current Trip */}
        {state.currentTrip && (
          <View style={styles.tripCard}>
            <Text style={styles.tripTitle}>Current Trip</Text>
            <View style={styles.tripStats}>
              <View style={styles.tripStat}>
                <Text style={styles.tripStatValue}>
                  {LocationService.calculateRouteDistance().toFixed(2)}
                </Text>
                <Text style={styles.tripStatLabel}>km</Text>
              </View>
              <View style={styles.tripStat}>
                <Text style={styles.tripStatValue}>
                  {tripStartTime ? Math.floor((Date.now() - tripStartTime.getTime()) / (1000 * 60)) : 0}
                </Text>
                <Text style={styles.tripStatLabel}>min</Text>
              </View>
              <View style={styles.tripStat}>
                <Text style={styles.tripStatValue}>
                  {calculateFuelConsumption().toFixed(2)}
                </Text>
                <Text style={styles.tripStatLabel}>L</Text>
              </View>
            </View>
          </View>
        )}

        {/* OBD Data */}
        {state.currentOBDData && (
          <View style={styles.obdCard}>
            <Text style={styles.obdTitle}>Vehicle Data</Text>
            <View style={styles.obdGrid}>
              <View style={styles.obdItem}>
                <Text style={styles.obdLabel}>Speed</Text>
                <Text style={styles.obdValue}>{state.currentOBDData.vehicleSpeed} km/h</Text>
              </View>
              <View style={styles.obdItem}>
                <Text style={styles.obdLabel}>RPM</Text>
                <Text style={styles.obdValue}>{state.currentOBDData.engineRPM}</Text>
              </View>
              <View style={styles.obdItem}>
                <Text style={styles.obdLabel}>Throttle</Text>
                <Text style={styles.obdValue}>{state.currentOBDData.throttlePosition}%</Text>
              </View>
              <View style={styles.obdItem}>
                <Text style={styles.obdLabel}>Engine Load</Text>
                <Text style={styles.obdValue}>{state.currentOBDData.engineLoad}%</Text>
              </View>
            </View>
          </View>
        )}

        {/* Coaching Tips */}
        {state.coachingTips.length > 0 && (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Coaching Tips</Text>
            {state.coachingTips.slice(0, 3).map((tip) => (
              <TouchableOpacity
                key={tip.id}
                style={[styles.tipItem, { borderLeftColor: getTipColor(tip.type) }]}
                onPress={() => dispatch({ type: 'MARK_TIP_READ', payload: tip.id })}
              >
                <Text style={styles.tipMessage}>{tip.message}</Text>
                <Text style={styles.tipTime}>
                  {tip.timestamp.toLocaleTimeString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Trip Controls */}
        <View style={styles.controlsCard}>
          {!isDriving ? (
            <TouchableOpacity
              style={[styles.controlButton, styles.startButton]}
              onPress={startTrip}
              disabled={!state.isOBDConnected}
            >
              <Text style={styles.startButtonText}>Start Trip</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={endTrip}
            >
              <Text style={styles.stopButtonText}>End Trip</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getTipColor = (type: string): string => {
  switch (type) {
    case 'acceleration': return '#FF9800';
    case 'braking': return '#F44336';
    case 'shifting': return '#2196F3';
    case 'regeneration': return '#4CAF50';
    default: return '#9C27B0';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#2C3E50',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#BDC3C7',
    marginTop: 5,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 8,
  },
  ecoScoreCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ecoScoreLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  ecoScoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ecoScoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  ecoScoreUnit: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  ecoScoreText: {
    fontSize: 20,
    fontWeight: '600',
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tripStat: {
    alignItems: 'center',
  },
  tripStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  tripStatLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  obdCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  obdTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  obdGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  obdItem: {
    width: (width - 64) / 2 - 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  obdLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  obdValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  tipItem: {
    borderLeftWidth: 4,
    paddingLeft: 16,
    marginBottom: 12,
    paddingVertical: 8,
  },
  tipMessage: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  tipTime: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  controlsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  controlButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
