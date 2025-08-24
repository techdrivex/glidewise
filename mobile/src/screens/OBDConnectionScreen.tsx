import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import OBDService from '../services/OBDService';
import { Device } from 'react-native-ble-plx';

export default function OBDConnectionScreen({ navigation }: any) {
  const { state, dispatch } = useAppContext();
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [connectionType, setConnectionType] = useState<'bluetooth' | 'wifi'>('bluetooth');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Check if already connected
    if (state.isOBDConnected) {
      navigation.replace('Main');
    }
  }, [state.isOBDConnected, navigation]);

  const startScan = async () => {
    if (connectionType === 'bluetooth') {
      await startBluetoothScan();
    } else {
      await startWifiScan();
    }
  };

  const startBluetoothScan = async () => {
    setIsScanning(true);
    setDevices([]);
    
    try {
      const foundDevices = await OBDService.scanForDevices();
      setDevices(foundDevices);
    } catch (error) {
      Alert.alert('Scan Error', 'Failed to scan for Bluetooth devices.');
    } finally {
      setIsScanning(false);
    }
  };

  const startWifiScan = async () => {
    setIsScanning(true);
    setDevices([]);
    
    try {
      // In a real app, you'd implement WiFi scanning
      // For now, we'll simulate finding some devices
      setTimeout(() => {
        setDevices([
          {
            id: 'wifi_1',
            name: 'OBD-II WiFi Adapter',
            localName: 'OBD-II WiFi Adapter',
            rssi: -45,
          } as Device,
          {
            id: 'wifi_2',
            name: 'ELM327 WiFi',
            localName: 'ELM327 WiFi',
            rssi: -52,
          } as Device,
        ]);
        setIsScanning(false);
      }, 3000);
    } catch (error) {
      Alert.alert('Scan Error', 'Failed to scan for WiFi devices.');
      setIsScanning(false);
    }
  };

  const connectToDevice = async (device: Device) => {
    setSelectedDevice(device);
    setIsConnecting(true);
    
    try {
      const success = await OBDService.connectToDevice(device);
      
      if (success) {
        dispatch({ type: 'SET_OBD_CONNECTED', payload: true });
        Alert.alert(
          'Connected!',
          `Successfully connected to ${device.name || 'OBD device'}`,
          [
            {
              text: 'Continue',
              onPress: () => navigation.replace('Main'),
            },
          ]
        );
      } else {
        Alert.alert('Connection Failed', 'Failed to connect to the selected device.');
      }
    } catch (error) {
      Alert.alert('Connection Error', 'An error occurred while connecting to the device.');
    } finally {
      setIsConnecting(false);
    }
  };

  const getDeviceIcon = (device: Device) => {
    if (connectionType === 'bluetooth') {
      return '📱'; // Bluetooth icon
    } else {
      return '📶'; // WiFi icon
    }
  };

  const getSignalStrength = (rssi: number) => {
    if (rssi >= -50) return '🔴'; // Strong
    if (rssi >= -70) return '🟡'; // Medium
    return '🟢'; // Weak
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Connect OBD Device</Text>
          <Text style={styles.subtitle}>
            Connect your OBD-II adapter to start coaching
          </Text>
        </View>

        {/* Connection Type Selector */}
        <View style={styles.connectionTypeCard}>
          <Text style={styles.sectionTitle}>Connection Type</Text>
          <View style={styles.connectionTypeRow}>
            <TouchableOpacity
              style={[
                styles.connectionTypeButton,
                connectionType === 'bluetooth' && styles.connectionTypeButtonActive,
              ]}
              onPress={() => setConnectionType('bluetooth')}
            >
              <Text style={[
                styles.connectionTypeText,
                connectionType === 'bluetooth' && styles.connectionTypeTextActive,
              ]}>
                📱 Bluetooth
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.connectionTypeButton,
                connectionType === 'wifi' && styles.connectionTypeButtonActive,
              ]}
              onPress={() => setConnectionType('wifi')}
            >
              <Text style={[
                styles.connectionTypeText,
                connectionType === 'wifi' && styles.connectionTypeTextActive,
              ]}>
                📶 WiFi
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scan Button */}
        <View style={styles.scanCard}>
          <TouchableOpacity
            style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
            onPress={startScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <View style={styles.scanButtonContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.scanButtonText}>Scanning...</Text>
              </View>
            ) : (
              <Text style={styles.scanButtonText}>
                {connectionType === 'bluetooth' ? 'Scan for Bluetooth Devices' : 'Scan for WiFi Devices'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Device List */}
        {devices.length > 0 && (
          <View style={styles.devicesCard}>
            <Text style={styles.sectionTitle}>
              Found Devices ({devices.length})
            </Text>
            
            {devices.map((device, index) => (
              <TouchableOpacity
                key={device.id || index}
                style={[
                  styles.deviceItem,
                  selectedDevice?.id === device.id && styles.deviceItemSelected,
                ]}
                onPress={() => setSelectedDevice(device)}
              >
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceIcon}>
                    {getDeviceIcon(device)}
                  </Text>
                  <View style={styles.deviceDetails}>
                    <Text style={styles.deviceName}>
                      {device.name || device.localName || 'Unknown Device'}
                    </Text>
                    <Text style={styles.deviceId}>
                      ID: {device.id}
                    </Text>
                    {device.rssi && (
                      <Text style={styles.deviceSignal}>
                        Signal: {getSignalStrength(device.rssi)} {device.rssi} dBm
                      </Text>
                    )}
                  </View>
                </View>
                
                {selectedDevice?.id === device.id && (
                  <View style={styles.deviceSelectedIndicator}>
                    <Text style={styles.deviceSelectedText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Connect Button */}
        {selectedDevice && (
          <View style={styles.connectCard}>
            <TouchableOpacity
              style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
              onPress={() => connectToDevice(selectedDevice)}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <View style={styles.connectButtonContent}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.connectButtonText}>Connecting...</Text>
                </View>
              ) : (
                <Text style={styles.connectButtonText}>
                  Connect to {selectedDevice.name || 'Device'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Help Section */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            • Make sure your OBD-II adapter is powered on{'\n'}
            • For Bluetooth: Enable Bluetooth and pair the device{'\n'}
            • For WiFi: Connect to the device's WiFi network{'\n'}
            • Ensure the adapter is properly connected to your vehicle's OBD-II port
          </Text>
        </View>

        {/* Skip Button for Demo */}
        <View style={styles.skipCard}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              dispatch({ type: 'SET_OBD_CONNECTED', payload: true });
              navigation.replace('Main');
            }}
          >
            <Text style={styles.skipButtonText}>Skip for Demo</Text>
          </TouchableOpacity>
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
    paddingVertical: 30,
    backgroundColor: '#2C3E50',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#BDC3C7',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  connectionTypeCard: {
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
  connectionTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  connectionTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  connectionTypeButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  connectionTypeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7F8C8D',
  },
  connectionTypeTextActive: {
    color: '#4CAF50',
  },
  scanCard: {
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
  scanButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  scanButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  scanButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  devicesCard: {
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
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  deviceItemSelected: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
  },
  deviceInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  deviceSignal: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  deviceSelectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceSelectedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectCard: {
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
  connectButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  connectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpCard: {
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
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  skipCard: {
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
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#7F8C8D',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
