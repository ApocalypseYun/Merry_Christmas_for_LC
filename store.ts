import { create } from 'zustand';
import { AppState } from './types';

interface AppStore {
  mode: AppState;
  setMode: (mode: AppState) => void;
  motionIntensity: number;
  setMotionIntensity: (val: number) => void;
  
  // Camera & Interaction
  webcamEnabled: boolean;
  setWebcamEnabled: (enabled: boolean) => void;
  cameraAccess: boolean;
  setCameraAccess: (access: boolean) => void;
  
  // Hand tracking state
  handPosition: { x: number; y: number }; // Normalized -1 to 1
  setHandPosition: (pos: { x: number; y: number }) => void;
  isInteracting: boolean;
  setIsInteracting: (is: boolean) => void;
}

export const useStore = create<AppStore>((set) => ({
  mode: AppState.FORMED,
  setMode: (mode) => set({ mode }),
  motionIntensity: 0,
  setMotionIntensity: (val) => set({ motionIntensity: val }),
  
  webcamEnabled: true, // Default to true, but user can toggle
  setWebcamEnabled: (enabled) => set({ webcamEnabled: enabled }),
  cameraAccess: false,
  setCameraAccess: (access) => set({ cameraAccess: access }),
  
  handPosition: { x: 0, y: 0 },
  setHandPosition: (pos) => set({ handPosition: pos }),
  isInteracting: false,
  setIsInteracting: (is) => set({ isInteracting: is }),
}));