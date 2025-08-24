import { BleManager, Device, State } from 'react-native-ble-plx';
import { OBDData } from '../context/AppContext';

class OBDService {
  private bleManager: BleManager;
  private connectedDevice: Device | null = null;
  private isConnected = false;
  private dataInterval: NodeJS.Timeout | null = null;
  private onDataCallback: ((data: OBDData) => void) | null = null;

  constructor() {
    this.bleManager = new BleManager();
  }

  async initialize(): Promise<void> {
    try {
      const state = await this.bleManager.state();
      if (state === State.PoweredOn) {
        console.log('Bluetooth is powered on');
      } else {
        console.log('Bluetooth state:', state);
      }
    } catch (error) {
      console.error('Failed to initialize OBD service:', error);
    }
  }

  async scanForDevices(): Promise<Device[]> {
    try {
      const devices: Device[] = [];
      
      this.bleManager.startDeviceScan(
        null, // null means scan for all devices
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('Scan error:', error);
            return;
          }
          
          if (device && this.isOBDDevice(device)) {
            devices.push(device);
          }
        }
      );

      // Stop scanning after 10 seconds
      setTimeout(() => {
        this.bleManager.stopDeviceScan();
      }, 10000);

      return devices;
    } catch (error) {
      console.error('Failed to scan for devices:', error);
      return [];
    }
  }

  private isOBDDevice(device: Device): boolean {
    // Check if device name contains OBD-related keywords
    const name = device.name || '';
    const keywords = ['OBD', 'ELM327', 'Bluetooth', 'WiFi', 'Adapter'];
    return keywords.some(keyword => 
      name.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  async connectToDevice(device: Device): Promise<boolean> {
    try {
      console.log('Connecting to device:', device.name);
      
      const connectedDevice = await device.connect();
      const discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics();
      
      this.connectedDevice = discoveredDevice;
      this.isConnected = true;
      
      console.log('Successfully connected to OBD device');
      
      // Start data polling
      this.startDataPolling();
      
      return true;
    } catch (error) {
      console.error('Failed to connect to device:', error);
      return false;
    }
  }

  private async startDataPolling(): Promise<void> {
    if (!this.connectedDevice) return;

    this.dataInterval = setInterval(async () => {
      try {
        const data = await this.readOBDData();
        if (data && this.onDataCallback) {
          this.onDataCallback(data);
        }
      } catch (error) {
        console.error('Failed to read OBD data:', error);
      }
    }, 1000); // Poll every second
  }

  private async readOBDData(): Promise<OBDData | null> {
    if (!this.connectedDevice) return null;

    try {
      // Read various OBD-II PIDs
      const engineRPM = await this.readPID('0C'); // Engine RPM
      const vehicleSpeed = await this.readPID('0D'); // Vehicle Speed
      const engineLoad = await this.readPID('04'); // Calculated Engine Load
      const throttlePosition = await this.readPID('11'); // Throttle Position
      const fuelLevel = await this.readPID('2F'); // Fuel Level
      const engineTemp = await this.readPID('05'); // Engine Coolant Temperature
      const batteryVoltage = await this.readPID('42'); // Control Module Voltage

      const data: OBDData = {
        engineRPM: this.parseEngineRPM(engineRPM),
        vehicleSpeed: this.parseVehicleSpeed(vehicleSpeed),
        engineLoad: this.parseEngineLoad(engineLoad),
        throttlePosition: this.parseThrottlePosition(throttlePosition),
        fuelLevel: this.parseFuelLevel(fuelLevel),
        engineTemp: this.parseEngineTemp(engineTemp),
        batteryVoltage: this.parseBatteryVoltage(batteryVoltage),
        fuelConsumption: 0, // Calculated from other data
        timestamp: new Date(),
      };

      return data;
    } catch (error) {
      console.error('Failed to read OBD data:', error);
      return null;
    }
  }

  private async readPID(pid: string): Promise<string> {
    if (!this.connectedDevice) throw new Error('No device connected');

    // ELM327 command format
    const command = `01${pid}\r`;
    
    // This is a simplified implementation
    // In a real app, you'd need to find the correct service and characteristic
    // and implement proper ELM327 protocol handling
    
    return '00'; // Placeholder
  }

  private parseEngineRPM(data: string): number {
    // Parse engine RPM from OBD response
    // Format: A B C D where RPM = ((A * 256) + B) / 4
    return 0; // Placeholder
  }

  private parseVehicleSpeed(data: string): number {
    // Parse vehicle speed from OBD response
    // Format: A where speed = A km/h
    return 0; // Placeholder
  }

  private parseEngineLoad(data: string): number {
    // Parse engine load from OBD response
    // Format: A where load = A * 100 / 255 %
    return 0; // Placeholder
  }

  private parseThrottlePosition(data: string): number {
    // Parse throttle position from OBD response
    // Format: A where position = A * 100 / 255 %
    return 0; // Placeholder
  }

  private parseFuelLevel(data: string): number {
    // Parse fuel level from OBD response
    // Format: A where level = A * 100 / 255 %
    return 0; // Placeholder
  }

  private parseEngineTemp(data: string): number {
    // Parse engine temperature from OBD response
    // Format: A where temp = A - 40 °C
    return 0; // Placeholder
  }

  private parseBatteryVoltage(data: string): number {
    // Parse battery voltage from OBD response
    // Format: A B where voltage = ((A * 256) + B) / 1000 V
    return 0; // Placeholder
  }

  setDataCallback(callback: (data: OBDData) => void): void {
    this.onDataCallback = callback;
  }

  disconnect(): void {
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
      this.dataInterval = null;
    }

    if (this.connectedDevice) {
      this.connectedDevice.cancelConnection();
      this.connectedDevice = null;
    }

    this.isConnected = false;
    console.log('Disconnected from OBD device');
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  destroy(): void {
    this.disconnect();
    this.bleManager.destroy();
  }
}

export default new OBDService();
