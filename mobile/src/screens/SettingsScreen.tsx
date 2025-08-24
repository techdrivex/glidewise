import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import OBDService from '../services/OBDService';

export default function SettingsScreen() {
  const { state, dispatch } = useAppContext();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const updatePreference = (key: keyof typeof state.userPreferences, value: boolean) => {
    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: { [key]: value },
    });
  };

  const disconnectOBD = async () => {
    Alert.alert(
      'Disconnect OBD',
      'Are you sure you want to disconnect from your OBD device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setIsDisconnecting(true);
            try {
              OBDService.disconnect();
              dispatch({ type: 'SET_OBD_CONNECTED', payload: false });
              Alert.alert('Disconnected', 'Successfully disconnected from OBD device.');
            } catch (error) {
              Alert.alert('Error', 'Failed to disconnect from OBD device.');
            } finally {
              setIsDisconnecting(false);
            }
          },
        },
      ]
    );
  };

  const resetAppData = () => {
    Alert.alert(
      'Reset App Data',
      'This will clear all trip history, coaching tips, and preferences. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            // Reset all app data
            dispatch({ type: 'SET_CURRENT_TRIP', payload: null });
            // Note: In a real app, you'd dispatch actions to clear all data
            Alert.alert('Reset Complete', 'All app data has been cleared.');
          },
        },
      ]
    );
  };

  const exportData = () => {
    Alert.alert(
      'Export Data',
      'Export your trip data and coaching history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            // In a real app, you'd implement data export functionality
            Alert.alert('Export Started', 'Your data export is being prepared...');
          },
        },
      ]
    );
  };

  const aboutApp = () => {
    Alert.alert(
      'About GlideWise',
      'Version 1.0.0\n\nAI Driving Coach for Fuel & Energy Efficiency\n\nDrive smoother. Spend less. Emit less.\n\n© 2025 GlideWise Contributors',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Configure your GlideWise experience</Text>
        </View>

        {/* OBD Connection */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>OBD Connection</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Connection Status</Text>
              <Text style={[
                styles.settingValue,
                { color: state.isOBDConnected ? '#4CAF50' : '#F44336' }
              ]}>
                {state.isOBDConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
            {state.isOBDConnected && (
              <TouchableOpacity
                style={[styles.disconnectButton, isDisconnecting && styles.disconnectButtonDisabled]}
                onPress={disconnectOBD}
                disabled={isDisconnecting}
              >
                <Text style={styles.disconnectButtonText}>
                  {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* App Preferences */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Eco Mode</Text>
              <Text style={styles.settingDescription}>
                Prioritize fuel efficiency over performance
              </Text>
            </View>
            <Switch
              value={state.userPreferences.ecoMode}
              onValueChange={(value) => updatePreference('ecoMode', value)}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={state.userPreferences.ecoMode ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDescription}>
                Vibrate device for important alerts
              </Text>
            </View>
            <Switch
              value={state.userPreferences.hapticFeedback}
              onValueChange={(value) => updatePreference('hapticFeedback', value)}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={state.userPreferences.hapticFeedback ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Voice Prompts</Text>
              <Text style={styles.settingDescription}>
                Audio coaching tips while driving
              </Text>
            </View>
            <Switch
              value={state.userPreferences.voicePrompts}
              onValueChange={(value) => updatePreference('voicePrompts', value)}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={state.userPreferences.voicePrompts ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Start Trips</Text>
              <Text style={styles.settingDescription}>
                Automatically start tracking when driving
              </Text>
            </View>
            <Switch
              value={state.userPreferences.autoStartTrips}
              onValueChange={(value) => updatePreference('autoStartTrips', value)}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor={state.userPreferences.autoStartTrips ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity style={styles.settingButton} onPress={exportData}>
            <View style={styles.settingButtonContent}>
              <Text style={styles.settingButtonIcon}>📤</Text>
              <View style={styles.settingButtonInfo}>
                <Text style={styles.settingButtonLabel}>Export Data</Text>
                <Text style={styles.settingButtonDescription}>
                  Download your trip history and analytics
                </Text>
              </View>
              <Text style={styles.settingButtonArrow}>→</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingButton} onPress={resetAppData}>
            <View style={styles.settingButtonContent}>
              <Text style={styles.settingButtonIcon}>🗑️</Text>
              <View style={styles.settingButtonInfo}>
                <Text style={styles.settingButtonLabel}>Reset App Data</Text>
                <Text style={styles.settingButtonDescription}>
                  Clear all data and start fresh
                </Text>
              </View>
              <Text style={styles.settingButtonArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Privacy & Security */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Location Services</Text>
              <Text style={styles.settingDescription}>
                Required for route tracking and analytics
              </Text>
            </View>
            <Text style={styles.settingValue}>Always</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Bluetooth</Text>
              <Text style={styles.settingDescription}>
                Required for OBD-II device connection
              </Text>
            </View>
            <Text style={styles.settingValue}>Always</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Data Sync</Text>
              <Text style={styles.settingDescription}>
                Sync data with cloud for backup
              </Text>
            </View>
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Support & About */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Support & About</Text>
          
          <TouchableOpacity style={styles.settingButton}>
            <View style={styles.settingButtonContent}>
              <Text style={styles.settingButtonIcon}>📧</Text>
              <View style={styles.settingButtonInfo}>
                <Text style={styles.settingButtonLabel}>Contact Support</Text>
                <Text style={styles.settingButtonDescription}>
                  Get help with app issues
                </Text>
              </View>
              <Text style={styles.settingButtonArrow}>→</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingButton}>
            <View style={styles.settingButtonContent}>
              <Text style={styles.settingButtonIcon}>📖</Text>
              <View style={styles.settingButtonInfo}>
                <Text style={styles.settingButtonLabel}>User Manual</Text>
                <Text style={styles.settingButtonDescription}>
                  Learn how to use GlideWise
                </Text>
              </View>
              <Text style={styles.settingButtonArrow}>→</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingButton} onPress={aboutApp}>
            <View style={styles.settingButtonContent}>
              <Text style={styles.settingButtonIcon}>ℹ️</Text>
              <View style={styles.settingButtonInfo}>
                <Text style={styles.settingButtonLabel}>About</Text>
                <Text style={styles.settingButtonDescription}>
                  App version and information
                </Text>
              </View>
              <Text style={styles.settingButtonArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionCard}>
          <Text style={styles.versionText}>GlideWise v1.0.0</Text>
          <Text style={styles.versionSubtext}>AI Driving Coach</Text>
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
  sectionCard: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
  },
  disconnectButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disconnectButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  disconnectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  settingButton: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingButtonIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  settingButtonInfo: {
    flex: 1,
  },
  settingButtonLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
    marginBottom: 4,
  },
  settingButtonDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  settingButtonArrow: {
    fontSize: 18,
    color: '#7F8C8D',
    marginLeft: 8,
  },
  versionCard: {
    alignItems: 'center',
    paddingVertical: 20,
    margin: 16,
  },
  versionText: {
    fontSize: 16,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  versionSubtext: {
    fontSize: 14,
    color: '#BDC3C7',
    marginTop: 4,
  },
});
