export type CarId = 'bmw_m4' | 'gt3_rs' | 'apex_hypercar';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export type CameraView = 'chase_near' | 'chase_far' | 'hood' | 'cinematic';

export interface CarSpec {
  id: CarId;
  name: string;
  brand: string;
  tagline: string;
  horsepower: number;
  topSpeedKmH: number;
  accelerationRate: number; // m/s^2 baseline
  handlingRating: number;   // 0.0 - 1.0
  brakingPower: number;     // m/s^2
  mass: number;             // kg
  dimensions: {
    length: number;
    width: number;
    height: number;
    wheelbase: number;
  };
  colors: {
    name: string;
    hex: string;
    roughness: number;
    metalness: number;
  }[];
  defaultColorHex: string;
}

export interface InputState {
  throttle: number;      // 0 to 1
  brake: number;         // 0 to 1
  steer: number;         // -1 (left) to 1 (right)
  handbrake: boolean;
  boost: boolean;
  reset: boolean;
  horn: boolean;
  headlights: boolean;
}

export interface VehiclePhysicsState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;           // Rotation around Y in radians
  pitch: number;         // Chassis dive/squat
  roll: number;          // Chassis roll on turn
  steerAngle: number;    // Front wheels steering angle in radians
  wheelRotation: number; // Rolling angle of wheels
  speedKmH: number;
  rpm: number;
  gear: number | 'R' | 'N';
  driftFactor: number;   // 0 (grip) to 1 (full drift)
  driftScore: number;
  isGrounded: boolean;
  boostFuel: number;     // 0 to 100
  isBoosting: boolean;
  collisionImpact: number;
}

export interface CollisionObstacle {
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
  height: number;
  type: 'building' | 'barrier' | 'pillar' | 'prop';
}

export interface MinimapBuilding {
  x: number;
  z: number;
  width: number;
  depth: number;
}

export interface MinimapData {
  cityRadius: number;
  roads: { x1: number; z1: number; x2: number; z2: number; width: number }[];
  buildings: MinimapBuilding[];
}
