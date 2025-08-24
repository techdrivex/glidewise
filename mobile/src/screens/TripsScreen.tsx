import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { TripData } from '../context/AppContext';

export default function TripsScreen() {
  const { state } = useAppContext();
  const [selectedTrip, setSelectedTrip] = useState<TripData | null>(null);

  const formatDuration = (startTime: Date, endTime: Date): string => {
    const duration = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
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

  const renderTripItem = ({ item }: { item: TripData }) => (
    <TouchableOpacity
      style={styles.tripItem}
      onPress={() => setSelectedTrip(selectedTrip?.id === item.id ? null : item)}
    >
      <View style={styles.tripHeader}>
        <View style={styles.tripDate}>
          <Text style={styles.tripDateText}>{formatDate(item.startTime)}</Text>
          <Text style={styles.tripTimeText}>
            {item.startTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        
        <View style={styles.tripStats}>
          <View style={styles.tripStat}>
            <Text style={styles.tripStatValue}>{item.distance.toFixed(1)}</Text>
            <Text style={styles.tripStatLabel}>km</Text>
          </View>
          <View style={styles.tripStat}>
            <Text style={styles.tripStatValue}>
              {item.endTime ? formatDuration(item.startTime, item.endTime) : '--'}
            </Text>
            <Text style={styles.tripStatLabel}>time</Text>
          </View>
          <View style={styles.tripStat}>
            <Text style={styles.tripStatValue}>{item.fuelConsumed.toFixed(1)}</Text>
            <Text style={styles.tripStatLabel}>L</Text>
          </View>
        </View>
      </View>

      <View style={styles.tripFooter}>
        <View style={styles.ecoScoreContainer}>
          <Text style={styles.ecoScoreLabel}>Eco Score:</Text>
          <View style={styles.ecoScoreBadge}>
            <Text style={[styles.ecoScoreValue, { color: getEcoScoreColor(item.ecoScore) }]}>
              {item.ecoScore}
            </Text>
          </View>
          <Text style={[styles.ecoScoreText, { color: getEcoScoreColor(item.ecoScore) }]}>
            {getEcoScoreText(item.ecoScore)}
          </Text>
        </View>
        
        <Text style={styles.efficiencyText}>
          {item.efficiency.toFixed(1)} L/100km
        </Text>
      </View>

      {selectedTrip?.id === item.id && (
        <View style={styles.tripDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Start:</Text>
            <Text style={styles.detailValue}>
              {item.startTime.toLocaleString()}
            </Text>
          </View>
          
          {item.endTime && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>End:</Text>
              <Text style={styles.detailValue}>
                {item.endTime.toLocaleString()}
              </Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Route Points:</Text>
            <Text style={styles.detailValue}>
              {item.route.length} locations
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Events:</Text>
            <Text style={styles.detailValue}>
              {item.events.length} recorded
            </Text>
          </View>
          
          {item.events.length > 0 && (
            <View style={styles.eventsContainer}>
              <Text style={styles.eventsTitle}>Driving Events:</Text>
              {item.events.slice(0, 3).map((event, index) => (
                <View key={index} style={styles.eventItem}>
                  <Text style={styles.eventType}>{event.type}</Text>
                  <Text style={styles.eventSeverity}>{event.severity}</Text>
                  <Text style={styles.eventTime}>
                    {event.timestamp.toLocaleTimeString()}
                  </Text>
                </View>
              ))}
              {item.events.length > 3 && (
                <Text style={styles.moreEvents}>
                  +{item.events.length - 3} more events
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const getTotalStats = () => {
    if (state.tripHistory.length === 0) return null;

    const totalDistance = state.tripHistory.reduce((sum, trip) => sum + trip.distance, 0);
    const totalFuel = state.tripHistory.reduce((sum, trip) => sum + trip.fuelConsumed, 0);
    const avgEcoScore = state.tripHistory.reduce((sum, trip) => sum + trip.ecoScore, 0) / state.tripHistory.length;
    const totalTrips = state.tripHistory.length;

    return {
      totalDistance,
      totalFuel,
      avgEcoScore: Math.round(avgEcoScore),
      totalTrips,
    };
  };

  const totalStats = getTotalStats();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Trip History</Text>
          <Text style={styles.subtitle}>
            {state.tripHistory.length} trips completed
          </Text>
        </View>

        {/* Total Stats */}
        {totalStats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Overall Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalStats.totalTrips}</Text>
                <Text style={styles.statLabel}>Trips</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalStats.totalDistance.toFixed(1)}</Text>
                <Text style={styles.statLabel}>km</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalStats.totalFuel.toFixed(1)}</Text>
                <Text style={styles.statLabel}>L</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: getEcoScoreColor(totalStats.avgEcoScore) }]}>
                  {totalStats.avgEcoScore}
                </Text>
                <Text style={styles.statLabel}>Avg Score</Text>
              </View>
            </View>
          </View>
        )}

        {/* Trip List */}
        <View style={styles.tripsCard}>
          <Text style={styles.tripsTitle}>Recent Trips</Text>
          
          {state.tripHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No trips yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start your first trip from the Dashboard to see it here
              </Text>
            </View>
          ) : (
            <FlatList
              data={state.tripHistory}
              renderItem={renderTripItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  statsCard: {
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
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  tripsCard: {
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
  tripsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  tripItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripDate: {
    flex: 1,
  },
  tripDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tripTimeText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 2,
  },
  tripStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripStat: {
    alignItems: 'center',
    marginLeft: 16,
  },
  tripStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  tripStatLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ecoScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ecoScoreLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginRight: 8,
  },
  ecoScoreBadge: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  ecoScoreValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  ecoScoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  efficiencyText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  tripDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#2C3E50',
  },
  eventsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  eventsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  eventItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  eventType: {
    fontSize: 12,
    color: '#2C3E50',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  eventSeverity: {
    fontSize: 12,
    color: '#7F8C8D',
    textTransform: 'capitalize',
  },
  eventTime: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  moreEvents: {
    fontSize: 12,
    color: '#3498DB',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#BDC3C7',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
