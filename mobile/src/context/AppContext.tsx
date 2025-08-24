import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export interface TripData {
  id: string;
  startTime: Date;
  endTime?: Date;
  distance: number;
  fuelConsumed: number;
  efficiency: number;
  ecoScore: number;
  route: Array<{ lat: number; lng: number; timestamp: Date }>;
  events: Array<{
    type: 'acceleration' | 'braking' | 'shifting' | 'regeneration';
    severity: 'low' | 'medium' | 'high';
    timestamp: Date;
    location: { lat: number; lng: number };
  }>;
}

export interface OBDData {
  engineRPM: number;
  vehicleSpeed: number;
  engineLoad: number;
  throttlePosition: number;
  fuelLevel: number;
  engineTemp: number;
  batteryVoltage: number;
  fuelConsumption: number;
  timestamp: Date;
}

export interface CoachingTip {
  id: string;
  type: 'acceleration' | 'braking' | 'shifting' | 'regeneration' | 'general';
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  isRead: boolean;
}

interface AppState {
  isOBDConnected: boolean;
  currentTrip: TripData | null;
  tripHistory: TripData[];
  currentOBDData: OBDData | null;
  coachingTips: CoachingTip[];
  ecoScore: number;
  isDriving: boolean;
  userPreferences: {
    ecoMode: boolean;
    hapticFeedback: boolean;
    voicePrompts: boolean;
    autoStartTrips: boolean;
  };
}

type AppAction =
  | { type: 'SET_OBD_CONNECTED'; payload: boolean }
  | { type: 'SET_CURRENT_TRIP'; payload: TripData | null }
  | { type: 'ADD_TRIP_HISTORY'; payload: TripData }
  | { type: 'SET_OBD_DATA'; payload: OBDData }
  | { type: 'ADD_COACHING_TIP'; payload: CoachingTip }
  | { type: 'MARK_TIP_READ'; payload: string }
  | { type: 'SET_ECO_SCORE'; payload: number }
  | { type: 'SET_DRIVING_STATUS'; payload: boolean }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<AppState['userPreferences']> };

const initialState: AppState = {
  isOBDConnected: false,
  currentTrip: null,
  tripHistory: [],
  currentOBDData: null,
  coachingTips: [],
  ecoScore: 85,
  isDriving: false,
  userPreferences: {
    ecoMode: true,
    hapticFeedback: true,
    voicePrompts: false,
    autoStartTrips: true,
  },
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_OBD_CONNECTED':
      return { ...state, isOBDConnected: action.payload };
    
    case 'SET_CURRENT_TRIP':
      return { ...state, currentTrip: action.payload };
    
    case 'ADD_TRIP_HISTORY':
      return { 
        ...state, 
        tripHistory: [action.payload, ...state.tripHistory].slice(0, 100) 
      };
    
    case 'SET_OBD_DATA':
      return { ...state, currentOBDData: action.payload };
    
    case 'ADD_COACHING_TIP':
      return { 
        ...state, 
        coachingTips: [action.payload, ...state.coachingTips].slice(0, 50) 
      };
    
    case 'MARK_TIP_READ':
      return {
        ...state,
        coachingTips: state.coachingTips.map(tip =>
          tip.id === action.payload ? { ...tip, isRead: true } : tip
        ),
      };
    
    case 'SET_ECO_SCORE':
      return { ...state, ecoScore: action.payload };
    
    case 'SET_DRIVING_STATUS':
      return { ...state, isDriving: action.payload };
    
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        userPreferences: { ...state.userPreferences, ...action.payload },
      };
    
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
