import { Vector3 } from 'three';

export enum AppState {
  FORMED = 'FORMED', // The Tree
  CHAOS = 'CHAOS',   // The Explosion
}

export interface ParticleData {
  id: number;
  treePosition: Vector3;
  chaosPosition: Vector3;
  color: string;
  speed: number;
  size: number;
  rotationSpeed?: number;
}
