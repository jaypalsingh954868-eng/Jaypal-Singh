import { CarSpec, CollisionObstacle, InputState, VehiclePhysicsState } from './types';

export const CAR_SPECS: Record<string, CarSpec> = {
  bmw_m4: {
    id: 'bmw_m4',
    name: 'M4 Competition Coupe',
    brand: 'BMW M',
    tagline: 'Twin-Turbo Inline-6 Bavarian Precision',
    horsepower: 503,
    topSpeedKmH: 290,
    accelerationRate: 11.2,
    handlingRating: 0.88,
    brakingPower: 22.0,
    mass: 1725,
    dimensions: {
      length: 4.79,
      width: 1.88,
      height: 1.39,
      wheelbase: 2.85,
    },
    colors: [
      { name: 'Isle of Man Green', hex: '#165b40', roughness: 0.18, metalness: 0.85 },
      { name: 'Portimao Blue', hex: '#0f3d7d', roughness: 0.20, metalness: 0.88 },
      { name: 'Alpine White', hex: '#f0f3f6', roughness: 0.25, metalness: 0.20 },
      { name: 'Austin Yellow', hex: '#d4ab15', roughness: 0.18, metalness: 0.82 },
      { name: 'Toronto Red', hex: '#a61c1c', roughness: 0.22, metalness: 0.75 },
      { name: 'Black Sapphire', hex: '#111317', roughness: 0.15, metalness: 0.90 },
    ],
    defaultColorHex: '#165b40',
  },
  gt3_rs: {
    id: 'gt3_rs',
    name: '911 GT3 Track Edition',
    brand: 'Stuttgart GT',
    tagline: 'Naturally Aspirated 9,000 RPM Apex Hunter',
    horsepower: 518,
    topSpeedKmH: 318,
    accelerationRate: 12.8,
    handlingRating: 0.96,
    brakingPower: 26.0,
    mass: 1450,
    dimensions: {
      length: 4.57,
      width: 1.90,
      height: 1.32,
      wheelbase: 2.45,
    },
    colors: [
      { name: 'Lizard Green', hex: '#44b029', roughness: 0.18, metalness: 0.60 },
      { name: 'Shark Blue', hex: '#0066cc', roughness: 0.20, metalness: 0.75 },
      { name: 'Guards Red', hex: '#c8102e', roughness: 0.18, metalness: 0.70 },
      { name: 'Carrara White', hex: '#f4f4f4', roughness: 0.22, metalness: 0.30 },
      { name: 'Agate Grey', hex: '#484c50', roughness: 0.25, metalness: 0.80 },
    ],
    defaultColorHex: '#44b029',
  },
  apex_hypercar: {
    id: 'apex_hypercar',
    name: 'Apex Vision Hypercar',
    brand: 'Apex Motors',
    tagline: 'Quad-Motor Hybrid Hypercar with Extreme Aero',
    horsepower: 1050,
    topSpeedKmH: 380,
    accelerationRate: 17.5,
    handlingRating: 0.92,
    brakingPower: 28.0,
    mass: 1380,
    dimensions: {
      length: 4.85,
      width: 2.05,
      height: 1.18,
      wheelbase: 2.75,
    },
    colors: [
      { name: 'Electric Sunset', hex: '#ff5500', roughness: 0.15, metalness: 0.92 },
      { name: 'Cyber Titanium', hex: '#63707e', roughness: 0.12, metalness: 0.95 },
      { name: 'Midnight Violet', hex: '#3d1668', roughness: 0.15, metalness: 0.90 },
      { name: 'Liquid Mercury', hex: '#d9e2ec', roughness: 0.08, metalness: 0.98 },
    ],
    defaultColorHex: '#ff5500',
  },
};

export function createInitialPhysicsState(x = 0, y = 0, z = 0, yaw = 0): VehiclePhysicsState {
  return {
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw,
    pitch: 0,
    roll: 0,
    steerAngle: 0,
    wheelRotation: 0,
    speedKmH: 0,
    rpm: 800,
    gear: 1,
    driftFactor: 0,
    driftScore: 0,
    isGrounded: true,
    boostFuel: 100,
    isBoosting: false,
    collisionImpact: 0,
  };
}

export function calculateEngineRpmAndGear(speedKmH: number, topSpeedKmH: number, throttle: number) {
  const absSpeed = Math.abs(speedKmH);
  if (speedKmH < -1) {
    const rev = Math.min(6500, 1000 + (absSpeed / 40) * 4500 + throttle * 1000);
    return { gear: 'R' as const, rpm: Math.round(rev) };
  }
  if (absSpeed < 1 && throttle < 0.05) {
    return { gear: 1, rpm: 800 };
  }

  const gearSpeedRatios = [0, 50, 95, 150, 210, 260, topSpeedKmH * 1.1];
  let gear = 1;
  for (let i = 1; i <= 6; i++) {
    if (absSpeed <= gearSpeedRatios[i]) {
      gear = i;
      break;
    }
  }

  const gearMinSpeed = gearSpeedRatios[gear - 1];
  const gearMaxSpeed = gearSpeedRatios[gear];
  const gearSpan = Math.max(10, gearMaxSpeed - gearMinSpeed);
  const ratioInGear = Math.min(1, Math.max(0, (absSpeed - gearMinSpeed) / gearSpan));

  let rpm = 1200 + ratioInGear * 5600;
  if (throttle > 0.05) {
    rpm += throttle * 500;
  }
  rpm = Math.min(7800, Math.max(800, Math.round(rpm)));

  return { gear, rpm };
}

export function calculateSteeringDamping(currentSteer: number, targetSteer: number, speedKmH: number, dt: number, handlingRating: number): number {
  // At higher speeds, steering sensitivity is damped to maintain high speed stability
  const absSpeed = Math.abs(speedKmH);
  const speedSpeedDamping = Math.max(0.35, 1 - (absSpeed / 300) * 0.65);
  const effectiveMaxAngle = 0.58 * speedSpeedDamping; // ~33 deg at low speed, ~12 deg at top speed
  const targetAngle = targetSteer * effectiveMaxAngle;

  const returnRate = targetSteer === 0 ? 10.0 : 8.0 * (0.8 + handlingRating * 0.4);
  const delta = targetAngle - currentSteer;
  return currentSteer + delta * Math.min(1.0, returnRate * dt);
}

export function checkAABBCollision(
  carX: number,
  carZ: number,
  carRadius: number,
  obs: CollisionObstacle
): { hit: boolean; pushX: number; pushZ: number } {
  // Nearest point on obstacle box to car center
  const minX = obs.x - obs.halfWidth;
  const maxX = obs.x + obs.halfWidth;
  const minZ = obs.z - obs.halfDepth;
  const maxZ = obs.z + obs.halfDepth;

  const closestX = Math.max(minX, Math.min(carX, maxX));
  const closestZ = Math.max(minZ, Math.min(carZ, maxZ));

  const dx = carX - closestX;
  const dz = carZ - closestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq < carRadius * carRadius) {
    const dist = Math.sqrt(distSq);
    if (dist < 0.0001) {
      // Inside box, push along shortest axis
      const pushX = carX > obs.x ? 1 : -1;
      return { hit: true, pushX: pushX * carRadius, pushZ: 0 };
    }
    const overlap = carRadius - dist;
    const nx = dx / dist;
    const nz = dz / dist;
    return {
      hit: true,
      pushX: nx * overlap,
      pushZ: nz * overlap,
    };
  }

  return { hit: false, pushX: 0, pushZ: 0 };
}

export function updateCarPhysics(
  state: VehiclePhysicsState,
  input: InputState,
  spec: CarSpec,
  dt: number,
  obstacles: CollisionObstacle[],
  cityRadius = 240
): VehiclePhysicsState {
  // Clone to avoid in-place unexpected mutation during updates
  const next: VehiclePhysicsState = { ...state };
  next.collisionImpact = 0;

  // Clamped dt
  const clampedDt = Math.min(dt, 0.05);

  // Steer Angle
  next.steerAngle = calculateSteeringDamping(
    next.steerAngle,
    input.steer,
    next.speedKmH,
    clampedDt,
    spec.handlingRating
  );

  // Nitro boost handling
  let isBoosting = false;
  if (input.boost && next.boostFuel > 0 && input.throttle > 0.1) {
    isBoosting = true;
    next.boostFuel = Math.max(0, next.boostFuel - 22 * clampedDt);
  } else {
    next.boostFuel = Math.min(100, next.boostFuel + 8 * clampedDt);
  }
  next.isBoosting = isBoosting;

  // Forward unit vector in world space
  const forwardX = Math.sin(next.yaw);
  const forwardZ = Math.cos(next.yaw);
  const rightX = Math.cos(next.yaw);
  const rightZ = -Math.sin(next.yaw);

  // Decompose current velocity into forward and lateral components
  const forwardVel = next.vx * forwardX + next.vz * forwardZ;
  const lateralVel = next.vx * rightX + next.vz * rightZ;

  // Driving forces
  let targetForwardAccel = 0;
  const topSpeedMs = (spec.topSpeedKmH / 3.6) * (isBoosting ? 1.22 : 1.0);
  const currentSpeedMs = forwardVel;

  if (input.throttle > 0) {
    if (forwardVel < -0.4) {
      // Forward throttle brakes the reverse motion
      targetForwardAccel += input.throttle * spec.brakingPower;
    } else {
      // Forward acceleration with diminishing curve as top speed approaches
      const speedRatio = Math.max(0, currentSpeedMs / topSpeedMs);
      const powerCurve = Math.max(0.12, 1 - Math.pow(speedRatio, 1.8));
      const boostMultiplier = isBoosting ? 1.6 : 1.0;
      targetForwardAccel += input.throttle * spec.accelerationRate * powerCurve * boostMultiplier;
    }
  }

  if (input.brake > 0) {
    if (forwardVel > 0.5) {
      // Braking while moving forward
      targetForwardAccel -= input.brake * spec.brakingPower;
    } else {
      // Reverse gear acceleration when stopped or already reversing
      const reverseTopSpeed = 12.0; // ~43 km/h
      if (Math.abs(forwardVel) < reverseTopSpeed) {
        targetForwardAccel -= input.brake * (spec.accelerationRate * 0.55);
      }
    }
  }

  // Rolling resistance and aerodynamic drag
  const airDrag = 0.0016 * forwardVel * Math.abs(forwardVel);
  const rollingFriction = 0.9 * Math.sign(forwardVel);
  let newForwardVel = forwardVel + (targetForwardAccel - airDrag - (Math.abs(forwardVel) > 0.1 ? rollingFriction : 0)) * clampedDt;

  // Low speed stop clamp
  if (input.throttle === 0 && input.brake === 0 && Math.abs(newForwardVel) < 0.25) {
    newForwardVel = 0;
  }

  // Drift and lateral friction physics
  let lateralGrip = 14.0 * spec.handlingRating;
  const isHandbraking = input.handbrake;

  if (isHandbraking) {
    lateralGrip *= 0.22; // break traction
  } else if (Math.abs(lateralVel) > 3.0) {
    lateralGrip *= 0.55; // loss of grip on fast slide
  }

  let newLateralVel = lateralVel - lateralVel * Math.min(1.0, lateralGrip * clampedDt);
  if (Math.abs(newLateralVel) < 0.05) newLateralVel = 0;

  // Yaw rotation from steering
  // Car turns when moving forward or reverse
  const speedNorm = Math.min(1.0, Math.abs(newForwardVel) / 8.0);
  const turnDirection = Math.sign(newForwardVel || 1);
  let yawRate = (next.steerAngle * 2.8 * turnDirection * speedNorm);

  if (isHandbraking && Math.abs(newForwardVel) > 4.0) {
    // Oversteer drift kick
    yawRate *= 1.8;
  }

  next.yaw += yawRate * clampedDt;

  // Reassemble velocity in world space
  const newForwardX = Math.sin(next.yaw);
  const newForwardZ = Math.cos(next.yaw);
  const newRightX = Math.cos(next.yaw);
  const newRightZ = -Math.sin(next.yaw);

  next.vx = newForwardVel * newForwardX + newLateralVel * newRightX;
  next.vz = newForwardVel * newForwardZ + newLateralVel * newRightZ;

  // Compute Drift Factor
  const absSpeed = Math.sqrt(next.vx * next.vx + next.vz * next.vz) * 3.6;
  const slipAngle = Math.abs(newLateralVel) / (Math.abs(newForwardVel) + 0.1);
  let driftFactor = Math.min(1.0, slipAngle * 1.6);
  if (isHandbraking && absSpeed > 15) {
    driftFactor = Math.max(driftFactor, 0.65);
  }
  next.driftFactor = driftFactor;

  // Accumulate Drift Score
  if (absSpeed > 25 && driftFactor > 0.35) {
    const gain = Math.round(driftFactor * (absSpeed / 10) * 12 * clampedDt);
    next.driftScore += gain;
  }

  // Vertical physics (gravity and ramp launch)
  if (!next.isGrounded) {
    next.vy -= 22.0 * clampedDt; // Gravity
  }
  next.y += next.vy * clampedDt;
  if (next.y <= 0) {
    next.y = 0;
    next.vy = 0;
    next.isGrounded = true;
  }

  // Update position
  next.x += next.vx * clampedDt;
  next.z += next.vz * clampedDt;

  // Obstacle Collisions
  const carRadius = (spec.dimensions.width + spec.dimensions.length) * 0.25;
  for (let i = 0; i < obstacles.length; i++) {
    const col = checkAABBCollision(next.x, next.z, carRadius, obstacles[i]);
    if (col.hit) {
      next.x += col.pushX;
      next.z += col.pushZ;

      // Speed deflection & impact calculation
      const dot = (next.vx * col.pushX + next.vz * col.pushZ);
      if (dot < 0) {
        next.vx -= col.pushX * 1.2;
        next.vz -= col.pushZ * 1.2;
      }
      next.vx *= 0.65;
      next.vz *= 0.65;

      const impactMagnitude = Math.min(1.0, (absSpeed / 120));
      if (impactMagnitude > 0.15) {
        next.collisionImpact = impactMagnitude;
      }
    }
  }

  // City Outer Perimeter soft barrier
  const distFromCenter = Math.sqrt(next.x * next.x + next.z * next.z);
  const maxBoundary = cityRadius - 8;
  if (distFromCenter > maxBoundary) {
    const nx = next.x / distFromCenter;
    const nz = next.z / distFromCenter;
    next.x = nx * maxBoundary;
    next.z = nz * maxBoundary;
    next.vx *= -0.4;
    next.vz *= -0.4;
    next.collisionImpact = Math.max(next.collisionImpact, 0.4);
  }

  // Speed and RPM/Gear calculations
  const totalSpeedMs = Math.sqrt(next.vx * next.vx + next.vz * next.vz);
  const directionSign = newForwardVel >= -0.2 ? 1 : -1;
  next.speedKmH = Math.round(totalSpeedMs * 3.6 * directionSign);

  const { gear, rpm } = calculateEngineRpmAndGear(next.speedKmH, spec.topSpeedKmH, input.throttle);
  next.gear = gear;
  next.rpm = rpm;

  // Wheel rotation angle increment
  const wheelCircumference = 2 * Math.PI * 0.34;
  next.wheelRotation += (newForwardVel / wheelCircumference) * (2 * Math.PI) * clampedDt;

  // Chassis Suspension Roll and Pitch
  const targetRoll = -next.steerAngle * Math.min(1.0, absSpeed / 80) * 0.08;
  const targetPitch = (targetForwardAccel / 25) * 0.06;
  next.roll += (targetRoll - next.roll) * Math.min(1.0, 12 * clampedDt);
  next.pitch += (targetPitch - next.pitch) * Math.min(1.0, 10 * clampedDt);

  return next;
}
