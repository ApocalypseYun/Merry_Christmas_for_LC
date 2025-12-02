import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './components/Scene';
import { MotionDetector } from './components/MotionDetector';
import { useStore } from './store';
import { AppState } from './types';

const App: React.FC = () => {
  const { mode, setMode, webcamEnabled, setWebcamEnabled } = useStore();

  const toggleMode = () => {
    setMode(mode === AppState.FORMED ? AppState.CHAOS : AppState.FORMED);
  };

  return (
    <div className="relative w-full h-full bg-[#001a0f]">
      <Canvas shadows dpr={[1, 2]}>
        <Scene />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-6 md:p-8 z-10">
        
        {/* Header */}
        <div className="flex flex-col items-center pointer-events-auto">
            <h1 className="text-4xl md:text-6xl text-amber-400 font-serif-display font-bold tracking-widest drop-shadow-[0_2px_10px_rgba(212,175,55,0.5)] text-center">
                NOËL GRANDIOSE
            </h1>
            <div className="h-px w-32 bg-amber-400 mt-4 opacity-70"></div>
            
            {/* Control Toggle */}
            <div className="mt-6 flex items-center gap-4 bg-black/40 backdrop-blur-md rounded-full px-4 py-2 border border-amber-500/30">
                <span className={`text-[10px] font-luxury tracking-widest ${!webcamEnabled ? 'text-amber-400' : 'text-gray-500'}`}>TOUCH</span>
                
                <button 
                   onClick={() => setWebcamEnabled(!webcamEnabled)}
                   className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${webcamEnabled ? 'bg-amber-600' : 'bg-gray-700'}`}
                >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${webcamEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
                
                <span className={`text-[10px] font-luxury tracking-widest ${webcamEnabled ? 'text-amber-400' : 'text-gray-500'}`}>SENSOR</span>
            </div>
        </div>

        {/* Footer Controls */}
        <div className="flex flex-col items-center gap-4 pointer-events-auto pb-4">
            
            <div className="text-center opacity-80">
                 <p className="text-amber-100 font-luxury text-xs tracking-wider mb-1">
                    {webcamEnabled ? 'OPTICAL SENSOR ACTIVE' : 'MANUAL OVERRIDE'}
                 </p>
                 <p className="text-amber-500/60 text-[10px] italic uppercase tracking-widest">
                    {webcamEnabled ? 'Skeletal Hand Tracking • Gesture Recognition' : 'Drag to Rotate • Click to Toggle'}
                 </p>
            </div>

            <button 
                onClick={toggleMode}
                className={`
                    group relative px-10 py-4 overflow-hidden rounded-full 
                    border-2 transition-all duration-500 shadow-[0_0_30px_rgba(0,0,0,0.5)]
                    ${mode === AppState.CHAOS 
                        ? 'bg-red-950/80 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
                        : 'bg-emerald-950/80 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'}
                `}
            >
                {/* Glow Effect */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                
                <span className={`relative font-luxury tracking-[0.2em] text-sm font-bold uppercase ${mode === AppState.CHAOS ? 'text-red-100' : 'text-emerald-100'}`}>
                    {mode === AppState.CHAOS ? 'RESTORE ORDER' : 'UNLEASH CHAOS'}
                </span>
            </button>
        </div>
      </div>

      <MotionDetector />
    </div>
  );
};

export default App;