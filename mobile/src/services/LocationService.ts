import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';

export interface LocationData {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: Date;
}

export interface RouteSegment {
  startLocation: LocationData;
  endLocation: LocationData;
  distance: number;
  duration: number;
  averageSpeed: number;
  elevationChange: number;
}

class LocationService {
  private isInitialized = false;
  private isTracking = false;
  private currentLocation: LocationData | null = null;
  private routeData: LocationData[] = [];
  private locationSubscription: number | null = null;
  private onLocationUpdate: ((location: LocationData) => void) | null = null;
  private onRouteUpdate: ((route: LocationData[]) => void) | null = null;

  async initialize(): Promise<void> {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (hasPermission) {
        this.isInitialized = true;
        console.log('Location Service initialized successfully');
      } else {
        console.log('Location permission denied');
      }
    } catch (error) {
      console.error('Failed to initialize Location Service:', error);
    }
  }

  private async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      // iOS permissions are handled in Info.plist
      return true;
    }

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'GlideWise needs access to your location to track your driving routes.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Location permission request failed:', err);
        return false;
      }
    }

    return false;
  }

  async getCurrentLocation(): Promise<LocationData | null> {
    if (!this.isInitialized) {
      console.warn('Location Service not initialized');
      return null;
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude || 0,
            accuracy: position.coords.accuracy || 0,
            speed: position.coords.speed || 0,
            heading: position.coords.heading || 0,
            timestamp: new Date(position.timestamp),
          };
          
          this.currentLocation = location;
          resolve(location);
        },
        (error) => {
          console.error('Failed to get current location:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  startTracking(): void {
    if (!this.isInitialized || this.isTracking) return;

    this.isTracking = true;
    this.routeData = [];
    
    // Get initial location
    this.getCurrentLocation().then(location => {
      if (location) {
        this.routeData.push(location);
      }
    });

    // Start continuous tracking
    this.locationSubscription = Geolocation.watchPosition(
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude || 0,
          accuracy: position.coords.accuracy || 0,
          speed: position.coords.speed || 0,
          heading: position.coords.heading || 0,
          timestamp: new Date(position.timestamp),
        };

        this.currentLocation = location;
        this.routeData.push(location);

        // Notify listeners
        if (this.onLocationUpdate) {
          this.onLocationUpdate(location);
        }
        if (this.onRouteUpdate) {
          this.onRouteUpdate([...this.routeData]);
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 1000, // Update every second
        fastestInterval: 500, // Fastest update interval
      }
    );

    console.log('Location tracking started');
  }

  stopTracking(): LocationData[] {
    if (this.locationSubscription !== null) {
      Geolocation.clearWatch(this.locationSubscription);
      this.locationSubscription = null;
    }

    this.isTracking = false;
    const finalRoute = [...this.routeData];
    this.routeData = [];
    
    console.log('Location tracking stopped');
    return finalRoute;
  }

  getRouteData(): LocationData[] {
    return [...this.routeData];
  }

  getCurrentLocationData(): LocationData | null {
    return this.currentLocation;
  }

  calculateRouteDistance(): number {
    if (this.routeData.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < this.routeData.length; i++) {
      totalDistance += this.calculateDistance(
        this.routeData[i - 1],
        this.routeData[i]
      );
    }

    return totalDistance;
  }

  private calculateDistance(loc1: LocationData, loc2: LocationData): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(loc2.latitude - loc1.latitude);
    const dLon = this.deg2rad(loc2.longitude - loc1.longitude);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(loc1.latitude)) *
        Math.cos(this.deg2rad(loc2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  calculateRouteSegments(): RouteSegment[] {
    if (this.routeData.length < 2) return [];

    const segments: RouteSegment[] = [];
    
    for (let i = 1; i < this.routeData.length; i++) {
      const start = this.routeData[i - 1];
      const end = this.routeData[i];
      
      const distance = this.calculateDistance(start, end);
      const duration = (end.timestamp.getTime() - start.timestamp.getTime()) / 1000; // seconds
      const averageSpeed = distance / (duration / 3600); // km/h
      const elevationChange = end.altitude - start.altitude;
      
      segments.push({
        startLocation: start,
        endLocation: end,
        distance,
        duration,
        averageSpeed,
        elevationChange,
      });
    }

    return segments;
  }

  getRouteSummary(): {
    totalDistance: number;
    totalDuration: number;
    averageSpeed: number;
    maxSpeed: number;
    elevationGain: number;
    elevationLoss: number;
  } {
    if (this.routeData.length < 2) {
      return {
        totalDistance: 0,
        totalDuration: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        elevationGain: 0,
        elevationLoss: 0,
      };
    }

    const totalDistance = this.calculateRouteDistance();
    const totalDuration = (this.routeData[this.routeData.length - 1].timestamp.getTime() - 
                          this.routeData[0].timestamp.getTime()) / 1000; // seconds
    const averageSpeed = totalDistance / (totalDuration / 3600); // km/h
    const maxSpeed = Math.max(...this.routeData.map(loc => loc.speed));
    
    let elevationGain = 0;
    let elevationLoss = 0;
    
    for (let i = 1; i < this.routeData.length; i++) {
      const elevationChange = this.routeData[i].altitude - this.routeData[i - 1].altitude;
      if (elevationChange > 0) {
        elevationGain += elevationChange;
      } else {
        elevationLoss += Math.abs(elevationChange);
      }
    }

    return {
      totalDistance,
      totalDuration,
      averageSpeed,
      maxSpeed,
      elevationGain,
      elevationLoss,
    };
  }

  setLocationUpdateCallback(callback: (location: LocationData) => void): void {
    this.onLocationUpdate = callback;
  }

  setRouteUpdateCallback(callback: (route: LocationData[]) => void): void {
    this.onRouteUpdate = callback;
  }

  isLocationTracking(): boolean {
    return this.isTracking;
  }

  clearRouteData(): void {
    this.routeData = [];
  }

  destroy(): void {
    this.stopTracking();
    this.isInitialized = false;
    this.currentLocation = null;
    this.onLocationUpdate = null;
    this.onRouteUpdate = null;
  }
}

export default new LocationService();
