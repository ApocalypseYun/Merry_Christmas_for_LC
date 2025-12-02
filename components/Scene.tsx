import React, { Suspense, useRef } from 'react';
import { OrbitControls, Environment, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Foliage } from './Foliage';
import { InstancedDecor } from './InstancedDecor';
import { Polaroids } from './Polaroids';
import { useStore } from '../store';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CameraController = () => {
    const { motionIntensity, handPosition, isInteracting, webcamEnabled } = useStore();
    const controlsRef = useRef<any>(null);

    useFrame(({ camera }, delta) => {
       // 1. Shake Effect (only when high motion)
       if (webcamEnabled && motionIntensity > 50) {
           const shake = Math.min(motionIntensity, 80) * 0.0003;
           camera.position.x += (Math.random() - 0.5) * shake;
       }

       if (controlsRef.current) {
           // === MODE A: WEBCAM CONTROL ===
           if (webcamEnabled && isInteracting) {
               controlsRef.current.enableRotate = false; // Disable mouse fight
               controlsRef.current.autoRotate = false;

               // Joystick-style rotation
               // Hand position is normalized -1 to 1
               const rotationSpeed = 2.0; 
               const targetAzimuthChange = -handPosition.x * rotationSpeed * delta;
               
               controlsRef.current.setAzimuthalAngle(
                   controlsRef.current.getAzimuthalAngle() + targetAzimuthChange
               );
               
               // Vertical Tilt (Polar)
               // Center (0) = PI/2.3. Range +/- 0.4
               const targetPolar = (Math.PI / 2.3) - (handPosition.y * 0.5);
               const damping = delta * 4;
               
               // Smoothly interpolate bounds to allow the look
               controlsRef.current.minPolarAngle = THREE.MathUtils.lerp(controlsRef.current.minPolarAngle, targetPolar - 0.1, damping);
               controlsRef.current.maxPolarAngle = THREE.MathUtils.lerp(controlsRef.current.maxPolarAngle, targetPolar + 0.1, damping);
           } 
           // === MODE B: MOUSE/TOUCH CONTROL (Fallback) ===
           else {
               controlsRef.current.enableRotate = true;
               controlsRef.current.autoRotate = true;
               
               // Restore comfortable viewing angles
               const damping = delta * 2;
               controlsRef.current.minPolarAngle = THREE.MathUtils.lerp(controlsRef.current.minPolarAngle, Math.PI / 3.5, damping);
               controlsRef.current.maxPolarAngle = THREE.MathUtils.lerp(controlsRef.current.maxPolarAngle, Math.PI / 1.8, damping);
           }
           
           controlsRef.current.update();
       }
    });

    return (
        <OrbitControls 
            ref={controlsRef}
            enablePan={false} 
            minPolarAngle={Math.PI / 3.5} 
            maxPolarAngle={Math.PI / 1.8}
            minDistance={10}
            maxDistance={35}
            autoRotateSpeed={0.8}
            enableDamping
            dampingFactor={0.05}
        />
    );
}

export const Scene: React.FC = () => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 4, 20]} fov={50} />
      <CameraController />

      <Environment preset="lobby" background={false} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Lighting */}
      <ambientLight intensity={0.5} color="#001a0f" />
      <directionalLight position={[10, 20, 10]} intensity={2} color="#ffd700" castShadow />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#ff4500" />
      
      {/* Tree Content */}
      <group position={[0, -5, 0]}>
        <Foliage />
        <InstancedDecor type="ball" count={200} color="#D4AF37" scale={0.4} />
        <InstancedDecor type="ball" count={150} color="#8B0000" scale={0.35} />
        <InstancedDecor type="gift" count={60} color="#FFFFFF" scale={0.5} />
        <InstancedDecor type="light" count={500} color="#FFD700" scale={0.1} emissive />
        <Suspense fallback={null}>
            <Polaroids />
        </Suspense>
        
        {/* Base / Pot */}
        <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[2, 2.5, 3, 32]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Post Processing */}
      <EffectComposer disableNormalPass>
        <Bloom 
            luminanceThreshold={0.85} 
            mipmapBlur 
            intensity={1.5} 
            radius={0.5}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </>
  );
};