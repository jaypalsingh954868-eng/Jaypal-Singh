import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAR_SPECS,
  createInitialPhysicsState,
  calculateEngineRpmAndGear,
  calculateSteeringDamping,
  checkAABBCollision,
  updateCarPhysics,
} from './physics';
import { CollisionObstacle, InputState } from './types';

test('createInitialPhysicsState generates valid stationary state', () => {
  const state = createInitialPhysicsState(10, 0, 20, 0);
  assert.equal(state.x, 10);
  assert.equal(state.z, 20);
  assert.equal(state.speedKmH, 0);
  assert.equal(state.gear, 1);
  assert.equal(state.isGrounded, true);
  assert.equal(state.rpm, 800);
});

test('calculateEngineRpmAndGear shifts up through gears with speed', () => {
  const spec = CAR_SPECS.bmw_m4;

  const idle = calculateEngineRpmAndGear(0, spec.topSpeedKmH, 0);
  assert.equal(idle.gear, 1);
  assert.equal(idle.rpm, 800);

  const gear1 = calculateEngineRpmAndGear(30, spec.topSpeedKmH, 0.8);
  assert.equal(gear1.gear, 1);
  assert.ok(gear1.rpm > 2000);

  const gear3 = calculateEngineRpmAndGear(120, spec.topSpeedKmH, 1.0);
  assert.equal(gear3.gear, 3);
  assert.ok(gear3.rpm > 3000);

  const reverse = calculateEngineRpmAndGear(-15, spec.topSpeedKmH, 0.5);
  assert.equal(reverse.gear, 'R');
  assert.ok(reverse.rpm > 1000);
});

test('calculateSteeringDamping damps steering angle at higher speeds for stability', () => {
  const dt = 0.016;
  const slowSteer = calculateSteeringDamping(0, 1.0, 10, dt, 0.9);
  const fastSteer = calculateSteeringDamping(0, 1.0, 220, dt, 0.9);

  assert.ok(slowSteer > 0);
  assert.ok(fastSteer > 0);
  assert.ok(slowSteer > fastSteer, 'Steering angle should be more direct at low speed than at 220 km/h');
});

test('AABB collision detects intersection and calculates push-out vector', () => {
  const obstacle: CollisionObstacle = {
    x: 50,
    z: 50,
    halfWidth: 10,
    halfDepth: 10,
    height: 30,
    type: 'building',
  };

  // Car at 40, 50 (5m outside edge of 10m half-width, with 2m radius -> no hit)
  const noHit = checkAABBCollision(35, 50, 2.0, obstacle);
  assert.equal(noHit.hit, false);

  // Car touching or penetrating the box edge
  const hit = checkAABBCollision(39.5, 50, 2.0, obstacle);
  assert.equal(hit.hit, true);
  assert.ok(hit.pushX < 0, 'Push vector should repel car away from obstacle');
});

test('Car accelerates on throttle and accumulates speed', () => {
  const spec = CAR_SPECS.bmw_m4;
  let state = createInitialPhysicsState(0, 0, 0, 0);

  const input: InputState = {
    throttle: 1.0,
    brake: 0,
    steer: 0,
    handbrake: false,
    boost: false,
    reset: false,
    horn: false,
    headlights: false,
  };

  // Step 10 frames
  for (let i = 0; i < 10; i++) {
    state = updateCarPhysics(state, input, spec, 0.05, []);
  }

  assert.ok(state.speedKmH > 10, 'Car should reach speed > 10 km/h after throttle');
  assert.ok(state.vz > 0, 'Car should move along forward Z axis');
  assert.ok(state.rpm > 1000, 'RPM should climb above idle');
});

test('Car brakes and reverses when holding brake from stop', () => {
  const spec = CAR_SPECS.bmw_m4;
  let state = createInitialPhysicsState(0, 0, 0, 0);

  const brakeInput: InputState = {
    throttle: 0,
    brake: 1.0,
    steer: 0,
    handbrake: false,
    boost: false,
    reset: false,
    horn: false,
    headlights: false,
  };

  for (let i = 0; i < 15; i++) {
    state = updateCarPhysics(state, brakeInput, spec, 0.05, []);
  }

  assert.ok(state.speedKmH < 0, 'Holding brake while stationary should engage reverse');
  assert.equal(state.gear, 'R');
});

test('Handbrake engages drift factor at speed', () => {
  const spec = CAR_SPECS.bmw_m4;
  let state = createInitialPhysicsState(0, 0, 0, 0);

  // Accelerate to ~80 km/h
  const gasInput: InputState = {
    throttle: 1.0,
    brake: 0,
    steer: 0,
    handbrake: false,
    boost: false,
    reset: false,
    horn: false,
    headlights: false,
  };
  for (let i = 0; i < 30; i++) {
    state = updateCarPhysics(state, gasInput, spec, 0.05, []);
  }

  // Turn hard and pull handbrake
  const driftInput: InputState = {
    throttle: 0.5,
    brake: 0,
    steer: 1.0,
    handbrake: true,
    boost: false,
    reset: false,
    horn: false,
    headlights: false,
  };
  for (let i = 0; i < 5; i++) {
    state = updateCarPhysics(state, driftInput, spec, 0.05, []);
  }

  assert.ok(state.driftFactor > 0.5, 'Handbrake turn at speed should trigger drift factor');
  assert.ok(state.driftScore >= 0, 'Drift score accumulator should function');
});
