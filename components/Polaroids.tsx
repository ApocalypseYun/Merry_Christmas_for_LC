import React, { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { AppState } from '../types';

const IMAGES = [
  'https://picsum.photos/id/1011/200/300',
  'https://picsum.photos/id/1025/200/300',
  'https://picsum.photos/id/1050/200/300',
  'https://picsum.photos/id/106/200/300',
  'https://picsum.photos/id/160/200/300',
  'https://picsum.photos/id/180/200/300',
  'https://picsum.photos/id/20/200/300',
];

export const Polaroids: React.FC = () => {
  const textures = useLoader(THREE.TextureLoader, IMAGES);
  const groupRef = useRef<THREE.Group>(null);
  const mode = useStore((s) => s.mode);

  const frames = useMemo(() => {
    return textures.map((tex, i) => {
        // Tree position: Spiral down
        const t = i / textures.length;
        const y = 10 - t * 10;
        const r = 4 * (1.0 - y / 13);
        const theta = t * Math.PI * 6; // 3 full turns
        
        const treePos = new THREE.Vector3(
            Math.cos(theta) * r,
            y,
            Math.sin(theta) * r + 1 // Push out slightly
        );

        // Chaos: Random
        const chaosPos = new THREE.Vector3(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20
        );

        return { 
            tex, 
            treePos, 
            chaosPos,
            currentPos: treePos.clone(),
            rotationZ: (Math.random() - 0.5) * 0.5
        };
    });
  }, [textures]);

  useFrame((state, delta) => {
     const isChaos = mode === AppState.CHAOS;
     const dt = delta * 2;

     frames.forEach((f, i) => {
         const target = isChaos ? f.chaosPos : f.treePos;
         f.currentPos.lerp(target, dt);

         const mesh = groupRef.current?.children[i];
         if (mesh) {
             mesh.position.copy(f.currentPos);
             // Look at camera but keep slight Z tilt
             mesh.lookAt(0, f.currentPos.y, 0); 
             mesh.rotateY(Math.PI); // Flip to face out
             mesh.rotateZ(f.rotationZ);
             
             if(isChaos) {
                 mesh.rotation.x += delta;
                 mesh.rotation.y += delta;
             }
         }
     });
  });

  return (
    <group ref={groupRef}>
      {frames.map((f, i) => (
        <group key={i} position={f.treePos}>
            {/* White Frame */}
            <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[1.2, 1.5]} />
                <meshBasicMaterial color="#fffff0" side={THREE.DoubleSide} />
            </mesh>
            {/* Photo */}
            <mesh position={[0, 0.1, 0]}>
                <planeGeometry args={[1.0, 1.0]} />
                <meshBasicMaterial map={f.tex} side={THREE.DoubleSide} />
            </mesh>
        </group>
      ))}
    </group>
  );
};