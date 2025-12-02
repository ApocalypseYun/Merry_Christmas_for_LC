import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { AppState } from '../types';
import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';

export const MotionDetector: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const debugCanvasRef = useRef<HTMLCanvasElement>(null); 
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);

  const { 
    setMode, 
    setMotionIntensity, 
    setCameraAccess, 
    setHandPosition, 
    setIsInteracting,
    mode,
    webcamEnabled, 
    cameraAccess
  } = useStore();
  
  const [error, setError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [detectedGesture, setDetectedGesture] = useState<string>("None");
  const [confidence, setConfidence] = useState<number>(0);

  // 1. Initialize MediaPipe Gesture Recognizer
  useEffect(() => {
    let recognizer: GestureRecognizer | null = null;

    const loadModel = async () => {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
            );
            
            recognizer = await GestureRecognizer.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numHands: 1
            });
            
            recognizerRef.current = recognizer;
            setIsModelLoading(false);
            console.log("MediaPipe Gesture Recognizer Loaded");
        } catch (err) {
            console.error("Failed to load MediaPipe model:", err);
            setError("AI Model Load Failed");
            setIsModelLoading(false);
        }
    };
    loadModel();

    return () => {
        if (recognizer) recognizer.close();
    };
  }, []);

  // 2. Manage Camera Stream
  useEffect(() => {
    if (!webcamEnabled) {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        setCameraAccess(false);
        setIsInteracting(false);
        return;
    }

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 }, 
                height: { ideal: 480 },
                facingMode: 'user'
            } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setCameraAccess(true);
            setError(null);
          };
        }
      } catch (err) {
        console.error("Camera access denied", err);
        setError("Camera Access Denied");
        setCameraAccess(false);
      }
    };
    
    startVideo();
  }, [webcamEnabled, setCameraAccess]);

  // 3. Detection Loop
  useEffect(() => {
    if (!webcamEnabled || !cameraAccess) return;

    const video = videoRef.current;
    const canvas = debugCanvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Smoothing variables
    let smoothedX = 0;
    let smoothedY = 0;

    const renderLoop = () => {
        if (!recognizerRef.current || !video.videoWidth) {
             requestRef.current = requestAnimationFrame(renderLoop);
             return;
        }

        const nowInMs = Date.now();
        if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;
            
            // Detect
            const result = recognizerRef.current.recognizeForVideo(video, nowInMs);

            // Clear & Prep Canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(-1, 1); // Mirror context
            ctx.translate(-canvas.width, 0);

            if (result.landmarks && result.landmarks.length > 0) {
                setIsInteracting(true);
                const landmarks = result.landmarks[0];
                const gesture = result.gestures[0]?.[0];

                // --- Draw Skeleton ---
                ctx.lineWidth = 3;
                ctx.strokeStyle = mode === AppState.CHAOS ? '#ef4444' : '#10b981';
                
                // Helper to draw connections
                const drawLine = (start: number, end: number) => {
                    ctx.beginPath();
                    ctx.moveTo(landmarks[start].x * canvas.width, landmarks[start].y * canvas.height);
                    ctx.lineTo(landmarks[end].x * canvas.width, landmarks[end].y * canvas.height);
                    ctx.stroke();
                };

                // Fingers
                [0, 1, 2, 3, 4].reduce((a, b) => { drawLine(a, b); return b; }); // Thumb
                [0, 5, 6, 7, 8].reduce((a, b) => { drawLine(a, b); return b; }); // Index
                [0, 9, 10, 11, 12].reduce((a, b) => { drawLine(a, b); return b; }); // Middle
                [0, 13, 14, 15, 16].reduce((a, b) => { drawLine(a, b); return b; }); // Ring
                [0, 17, 18, 19, 20].reduce((a, b) => { drawLine(a, b); return b; }); // Pinky
                
                // Palm base
                drawLine(5, 9); drawLine(9, 13); drawLine(13, 17); drawLine(5, 17);

                // Joints
                ctx.fillStyle = '#fbbf24';
                for (const lm of landmarks) {
                    ctx.beginPath();
                    ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 3, 0, 2 * Math.PI);
                    ctx.fill();
                }

                // --- Coordinate Calculation ---
                // Average of Wrist(0) and Middle Knuckle(9) for stable center
                const rawX = (landmarks[0].x + landmarks[9].x) / 2;
                const rawY = (landmarks[0].y + landmarks[9].y) / 2;

                // Smooth
                smoothedX += (rawX - smoothedX) * 0.15;
                smoothedY += (rawY - smoothedY) * 0.15;

                // Map Coordinates:
                // Raw X: 0 (Left in Frame) -> 1 (Right in Frame)
                // Mirrored View: User moves Right -> Frame Left (0) -> Screen Right
                // We want Screen Right to equal +1 control value.
                // So: (0.5 - rawX) * 2 maps 0 to +1, and 1 to -1.
                const normX = (0.5 - smoothedX) * 2.5; // 2.5 multiplier for sensitivity
                const normY = (smoothedY - 0.5) * 2.0;

                setHandPosition({ 
                    x: Math.max(-1, Math.min(1, normX)), 
                    y: Math.max(-1, Math.min(1, normY)) 
                });

                // --- Gesture Logic ---
                if (gesture) {
                    setDetectedGesture(gesture.categoryName);
                    setConfidence(gesture.score);

                    if (gesture.score > 0.5) {
                        if (gesture.categoryName === 'Open_Palm' || gesture.categoryName === 'Victory') {
                            setMode(AppState.CHAOS);
                            setMotionIntensity(100);
                        } else if (gesture.categoryName === 'Closed_Fist' || gesture.categoryName === 'Pointing_Up') {
                            setMode(AppState.FORMED);
                            setMotionIntensity(10);
                        }
                    }
                }

            } else {
                setIsInteracting(false);
                setDetectedGesture("None");
                setMotionIntensity(0);
            }

            ctx.restore();
        }
        requestRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => cancelAnimationFrame(requestRef.current);
  }, [webcamEnabled, cameraAccess, mode]);

  if (!webcamEnabled) return null;

  return (
    <div className="absolute bottom-4 left-4 z-50 pointer-events-none">
        <div className={`relative w-48 h-36 border-2 ${cameraAccess ? 'border-amber-500/50' : 'border-red-500/50'} rounded-lg overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.3)] bg-black/80 transition-all duration-300`}>
            
            {/* Mirror Video & Canvas */}
            <video 
                ref={videoRef} 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover opacity-60 transform scale-x-[-1]" 
            />
            <canvas 
                ref={debugCanvasRef} 
                width="640" 
                height="480" 
                className="absolute inset-0 w-full h-full object-cover" 
            />
            
            {/* Overlay UI */}
            <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur px-3 py-2 flex justify-between items-center border-t border-white/10">
                <div className="flex flex-col">
                    <span className="text-[8px] text-gray-400 uppercase tracking-wider font-luxury">GESTURE</span>
                    <span className="text-xs text-amber-300 font-bold uppercase font-sans">
                        {detectedGesture === "None" ? "--" : detectedGesture}
                    </span>
                </div>
                <div className="flex flex-col items-end">
                    <div className={`w-2 h-2 rounded-full ${cameraAccess ? 'bg-green-500 animate-pulse' : 'bg-red-500'} mb-1`} />
                    <span className="text-[8px] text-gray-500">
                        {Math.round(confidence * 100)}%
                    </span>
                </div>
            </div>

            {/* Loading / Error States */}
            {isModelLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <span className="text-amber-500 text-[8px] font-luxury tracking-widest">INITIALIZING AI</span>
                </div>
            )}
            {error && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20 p-2 text-center">
                     <span className="text-red-500 text-[10px] font-bold leading-tight">{error}</span>
                 </div>
            )}
        </div>
    </div>
  );
};