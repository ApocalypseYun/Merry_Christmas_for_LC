import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { AppState } from '../types';

// Custom Shader for Emerald Luxury Needles
const foliageVertexShader = `
  uniform float uTime;
  uniform float uMixFactor; // 0 = Tree, 1 = Chaos
  
  attribute vec3 aTreePos;
  attribute vec3 aChaosPos;
  attribute float aRandom;
  attribute float aSize;

  varying float vAlpha;
  varying vec3 vColor;

  // Cubic Ease In Out
  float easeInOutCubic(float x) {
    return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
  }

  void main() {
    float easedMix = easeInOutCubic(uMixFactor);
    
    // Interpolate positions
    vec3 pos = mix(aTreePos, aChaosPos, easedMix);
    
    // Add some "breathing" movement
    pos.x += sin(uTime * 2.0 + aRandom * 10.0) * 0.05 * easedMix;
    pos.y += cos(uTime * 1.5 + aRandom * 10.0) * 0.05 * easedMix;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    
    // Color Mix: Deep Emerald to lighter Green
    vec3 colorA = vec3(0.0, 0.2, 0.1); // Deep Emerald
    vec3 colorB = vec3(0.1, 0.5, 0.3); // Fresh Pine
    vColor = mix(colorA, colorB, aRandom);
    
    vAlpha = 1.0;
  }
`;

const foliageFragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    // Circular particle
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;
    
    // Soft edge
    float glow = 1.0 - (r * 2.0);
    glow = pow(glow, 1.5);

    gl_FragColor = vec4(vColor * 1.5, glow); // Boost brightness for bloom
  }
`;

export const Foliage: React.FC = () => {
  const mode = useStore((s) => s.mode);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  // Needles count
  const COUNT = 15000;

  const { positions, chaosPositions, randoms, sizes } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const chaos = new Float32Array(COUNT * 3);
    const rnd = new Float32Array(COUNT);
    const sz = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      // TREE FORM: Cone
      // Height 0 to 12
      const y = Math.random() * 12;
      const radiusAtHeight = 4.5 * (1.0 - y / 12.5); // Tapering cone
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * radiusAtHeight; // Fill inside
      
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      
      pos[i * 3] = x;
      pos[i * 3 + 1] = y - 2; // Offset Y
      pos[i * 3 + 2] = z;

      // CHAOS FORM: Sphere Explosion
      const phi = Math.acos(-1 + (2 * i) / COUNT);
      const sq = Math.sqrt(COUNT * Math.PI * phi);
      const chaosR = 15 + Math.random() * 10;
      
      chaos[i * 3] = chaosR * Math.cos(sq) * Math.sin(phi);
      chaos[i * 3 + 1] = chaosR * Math.sin(sq) * Math.sin(phi);
      chaos[i * 3 + 2] = chaosR * Math.cos(phi);

      rnd[i] = Math.random();
      sz[i] = 0.5 + Math.random() * 1.5;
    }

    return {
      positions: pos,
      chaosPositions: chaos,
      randoms: rnd,
      sizes: sz
    };
  }, []);

  useFrame((state, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      
      // Smooth interpolation of mix factor
      const targetMix = mode === AppState.CHAOS ? 1.0 : 0.0;
      shaderRef.current.uniforms.uMixFactor.value = THREE.MathUtils.lerp(
        shaderRef.current.uniforms.uMixFactor.value,
        targetMix,
        delta * 2.5 // Transition Speed
      );
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-aTreePos" count={COUNT} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aChaosPos" count={COUNT} array={chaosPositions} itemSize={3} />
        <bufferAttribute attach="attributes-aRandom" count={COUNT} array={randoms} itemSize={1} />
        <bufferAttribute attach="attributes-aSize" count={COUNT} array={sizes} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        vertexShader={foliageVertexShader}
        fragmentShader={foliageFragmentShader}
        transparent
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
          uMixFactor: { value: 0 },
        }}
      />
    </points>
  );
};