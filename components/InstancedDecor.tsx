import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { AppState } from '../types';

interface DecorProps {
  type: 'ball' | 'gift' | 'light';
  count: number;
  color: string;
  scale: number;
  emissive?: boolean;
}

export const InstancedDecor: React.FC<DecorProps> = ({ type, count, color, scale, emissive = false }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const mode = useStore((s) => s.mode);

  // Store dual positions
  const data = useMemo(() => {
    const treePos = new Float32Array(count * 3);
    const chaosPos = new Float32Array(count * 3);
    const rotations = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      // Tree: Surface of cone mostly
      const y = Math.random() * 11; // Slightly shorter than tree top
      const radiusAtHeight = 4.2 * (1.0 - y / 12.0); 
      // Add slight randomness to depth so they aren't perfectly on surface
      const r = radiusAtHeight * (0.8 + Math.random() * 0.4); 
      const theta = Math.random() * Math.PI * 2;

      treePos[i * 3] = r * Math.cos(theta);
      treePos[i * 3 + 1] = y - 1.8;
      treePos[i * 3 + 2] = r * Math.sin(theta);

      // Chaos: Random vector
      const vec = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize().multiplyScalar(15 + Math.random() * 15);
      chaosPos[i * 3] = vec.x;
      chaosPos[i * 3 + 1] = vec.y;
      chaosPos[i * 3 + 2] = vec.z;

      rotations[i * 3] = Math.random() * Math.PI;
      rotations[i * 3 + 1] = Math.random() * Math.PI;
      rotations[i * 3 + 2] = Math.random() * Math.PI;

      speeds[i] = 0.5 + Math.random();
    }
    return { treePos, chaosPos, rotations, speeds };
  }, [count]);

  // Temp objects to avoid GC
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const vec3 = useMemo(() => new THREE.Vector3(), []);
  const targetVec = useMemo(() => new THREE.Vector3(), []);
  const currentPos = useMemo(() => {
     // Initial state based on tree positions
     return Array.from({ length: count }).map((_, i) => 
       new THREE.Vector3(data.treePos[i*3], data.treePos[i*3+1], data.treePos[i*3+2])
     );
  }, [count, data]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const isChaos = mode === AppState.CHAOS;
    const lerpFactor = delta * 3.0; // Base animation speed

    for (let i = 0; i < count; i++) {
      // Determine target
      if (isChaos) {
        targetVec.set(data.chaosPos[i*3], data.chaosPos[i*3+1], data.chaosPos[i*3+2]);
      } else {
        targetVec.set(data.treePos[i*3], data.treePos[i*3+1], data.treePos[i*3+2]);
      }

      // Current position lerp
      currentPos[i].lerp(targetVec, lerpFactor * data.speeds[i]);

      dummy.position.copy(currentPos[i]);
      
      // Rotate objects for visual interest
      dummy.rotation.x = data.rotations[i*3] + state.clock.elapsedTime * (isChaos ? 1 : 0.2);
      dummy.rotation.y = data.rotations[i*3+1] + state.clock.elapsedTime * (isChaos ? 1 : 0.2);
      
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    if (type === 'ball') return new THREE.SphereGeometry(1, 32, 32);
    if (type === 'gift') return new THREE.BoxGeometry(1, 1, 1);
    return new THREE.SphereGeometry(0.5, 16, 16);
  }, [type]);

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]} castShadow receiveShadow>
      {emissive ? (
         <meshStandardMaterial 
            color={color} 
            emissive={color} 
            emissiveIntensity={4} 
            toneMapped={false}
         />
      ) : (
        <meshPhysicalMaterial 
            color={color} 
            roughness={0.15} 
            metalness={0.9} 
            clearcoat={1.0}
            clearcoatRoughness={0.1}
        />
      )}
    </instancedMesh>
  );
};