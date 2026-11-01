import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CameraView, CarId, InputState, TimeOfDay, VehiclePhysicsState } from './types';
import { CAR_SPECS, createInitialPhysicsState, updateCarPhysics } from './physics';
import { buildCarVisualRig, CarVisualRig } from './carModels';
import { buildOpenWorldCity, CityWorld } from './cityBuilder';
import { audioSystem } from './audio';

// Pre-allocated scratch helpers to eliminate GC allocations in 60 FPS loop
const _vec3 = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();

export interface EngineCallbacks {
  onTelemetryUpdate: (state: VehiclePhysicsState) => void;
  onTimeOfDayChange?: (time: TimeOfDay) => void;
  onCameraChange?: (cam: CameraView) => void;
  onPauseRequest?: () => void;
}

export class GameEngine {
  public renderer: THREE.WebGLRenderer | null = null;
  public scene: THREE.Scene = new THREE.Scene();
  public camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(65, 1, 0.2, 800);

  private container: HTMLElement | null = null;
  private frameId: number = 0;
  private isSoftwareGl: boolean = false;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private lastTime: number = 0;

  // World & Car
  public city: CityWorld | null = null;
  public carRig: CarVisualRig | null = null;
  public currentCarId: CarId = 'bmw_m4';
  public currentColorHex: string = CAR_SPECS.bmw_m4.defaultColorHex;

  // Physics State
  public physicsState: VehiclePhysicsState = createInitialPhysicsState(0, 0, 15, 0);

  // Input State
  public input: InputState = {
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    boost: false,
    reset: false,
    horn: false,
    headlights: false,
  };

  // Keyboard held set
  private keysHeld: Set<string> = new Set();

  // Camera Rig
  public cameraMode: CameraView = 'chase_near';
  private cameraShake: number = 0;
  private cinematicAngle: number = 0;

  // Day & Night Lighting
  public timeOfDay: TimeOfDay = 'day';
  private sunLight: THREE.DirectionalLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;

  // Particle System for Tire Smoke
  private smokeParticles: { mesh: THREE.Mesh; life: number; maxLife: number; vx: number; vy: number; vz: number; size: number }[] = [];
  private smokePoolIndex: number = 0;
  private readonly MAX_SMOKE_PARTICLES = 60;

  // Callbacks
  private callbacks: EngineCallbacks;

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
  }

  public init(container: HTMLElement) {
    this.container = container;

    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Initialize WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    container.appendChild(this.renderer.domElement);

    // 3. Studio Environment Map (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Setup Lighting
    this.setupLighting();

    // 5. Build City World
    this.city = buildOpenWorldCity(240);
    this.scene.add(this.city.root);

    // 6. Build Car Rig
    this.spawnCar(this.currentCarId, this.currentColorHex);

    // 7. Setup Particle Pool
    this.setupParticlePool();

    // 8. Event Listeners
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    // Initial Camera position
    this.camera.position.set(0, 3, 23);
    this.camera.lookAt(0, 1, 15);

    this.setTimeOfDay('day');
    this.startLoop();
  }

  private setupLighting() {
    this.hemiLight = new THREE.HemisphereLight(0xddeeff, 0x1f242d, 0.7);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    this.sunLight.position.set(80, 120, 60);
    this.sunLight.castShadow = !this.isSoftwareGl;
    if (this.sunLight.castShadow) {
      this.sunLight.shadow.mapSize.width = 1024;
      this.sunLight.shadow.mapSize.height = 1024;
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 300;
      const d = 60;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0005;
      this.sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.sunLight);
  }

  public setTimeOfDay(time: TimeOfDay) {
    this.timeOfDay = time;
    if (!this.sunLight || !this.hemiLight || !this.city) return;

    if (time === 'day') {
      this.scene.background = new THREE.Color(0x8bc0f8);
      this.scene.fog = new THREE.FogExp2(0x8bc0f8, 0.0045);
      this.sunLight.color.setHex(0xfff8ee);
      this.sunLight.intensity = 2.4;
      this.sunLight.position.set(80, 120, 60);
      this.hemiLight.color.setHex(0xddeeff);
      this.hemiLight.groundColor.setHex(0x222a35);
      this.hemiLight.intensity = 0.75;
      this.city.updateTimeOfDay(false, false);
    } else if (time === 'sunset') {
      this.scene.background = new THREE.Color(0xfd7e48);
      this.scene.fog = new THREE.FogExp2(0xe26a38, 0.0055);
      this.sunLight.color.setHex(0xff8833);
      this.sunLight.intensity = 1.9;
      this.sunLight.position.set(120, 30, -50);
      this.hemiLight.color.setHex(0xffaa77);
      this.hemiLight.groundColor.setHex(0x2b1c1c);
      this.hemiLight.intensity = 0.55;
      this.city.updateTimeOfDay(false, true);
    } else {
      // Night
      this.scene.background = new THREE.Color(0x060810);
      this.scene.fog = new THREE.FogExp2(0x080c16, 0.006);
      this.sunLight.color.setHex(0x556699);
      this.sunLight.intensity = 0.4;
      this.sunLight.position.set(-60, 80, -40);
      this.hemiLight.color.setHex(0x1a243a);
      this.hemiLight.groundColor.setHex(0x08090f);
      this.hemiLight.intensity = 0.35;
      this.city.updateTimeOfDay(true, false);
    }

    this.callbacks.onTimeOfDayChange?.(time);
  }

  public toggleTimeOfDay() {
    if (this.timeOfDay === 'day') this.setTimeOfDay('sunset');
    else if (this.timeOfDay === 'sunset') this.setTimeOfDay('night');
    else this.setTimeOfDay('day');
  }

  public spawnCar(carId: CarId, colorHex?: string) {
    if (this.carRig) {
      this.scene.remove(this.carRig.root);
    }
    this.currentCarId = carId;
    this.currentColorHex = colorHex || CAR_SPECS[carId].defaultColorHex;

    this.carRig = buildCarVisualRig(carId, this.currentColorHex);
    this.scene.add(this.carRig.root);

    // Position rig
    this.carRig.root.position.set(this.physicsState.x, this.physicsState.y, this.physicsState.z);
    this.carRig.root.rotation.y = this.physicsState.yaw;
  }

  public setCarColor(hex: string) {
    this.currentColorHex = hex;
    this.carRig?.setColor(hex);
  }

  public resetCar() {
    // Reset to nearest boulevard section upright
    const roadX = Math.round(this.physicsState.x / 30) * 30;
    this.physicsState = createInitialPhysicsState(roadX, 0, this.physicsState.z, 0);
    this.cameraShake = 0;
  }

  private setupParticlePool() {
    const geo = new THREE.SphereGeometry(0.35, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    for (let i = 0; i < this.MAX_SMOKE_PARTICLES; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.smokeParticles.push({
        mesh,
        life: 0,
        maxLife: 0.8,
        vx: 0,
        vy: 0,
        vz: 0,
        size: 0.35,
      });
    }
  }

  private emitSmoke(x: number, y: number, z: number, intensity: number) {
    const p = this.smokeParticles[this.smokePoolIndex];
    this.smokePoolIndex = (this.smokePoolIndex + 1) % this.MAX_SMOKE_PARTICLES;

    p.mesh.position.set(x + (Math.random() - 0.5) * 0.4, y + 0.1, z + (Math.random() - 0.5) * 0.4);
    p.mesh.visible = true;
    p.life = 0;
    p.maxLife = 0.5 + Math.random() * 0.4;
    p.vx = (Math.random() - 0.5) * 1.5;
    p.vy = 0.8 + Math.random() * 1.5;
    p.vz = (Math.random() - 0.5) * 1.5;
    p.size = 0.3 + intensity * 0.4;
    (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55;
  }

  private updateParticles(dt: number) {
    for (let i = 0; i < this.MAX_SMOKE_PARTICLES; i++) {
      const p = this.smokeParticles[i];
      if (!p.mesh.visible) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
        continue;
      }

      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      const progress = p.life / p.maxLife;
      const currentScale = p.size * (1 + progress * 2.5);
      p.mesh.scale.set(currentScale, currentScale, currentScale);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.55;
    }
  }

  // Input Handling
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    this.keysHeld.add(e.code);

    // Audio unlock on user interaction
    audioSystem.unlock();

    if (e.code === 'KeyC') {
      this.cycleCamera();
    } else if (e.code === 'KeyT') {
      this.toggleTimeOfDay();
    } else if (e.code === 'KeyR') {
      this.resetCar();
    } else if (e.code === 'KeyL') {
      this.input.headlights = !this.input.headlights;
    } else if (e.code === 'KeyM') {
      audioSystem.toggleMute();
    } else if (e.code === 'Escape' || e.code === 'KeyP') {
      this.callbacks.onPauseRequest?.();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.code);
  };

  private onWindowBlur = () => {
    this.keysHeld.clear();
    this.input.throttle = 0;
    this.input.brake = 0;
    this.input.steer = 0;
    this.input.handbrake = false;
    this.input.boost = false;
    this.input.horn = false;
  };

  private onVisibilityChange = () => {
    if (document.hidden) {
      this.onWindowBlur();
    }
  };

  public setVirtualInput(partial: Partial<InputState>) {
    Object.assign(this.input, partial);
    audioSystem.unlock();
  }

  public cycleCamera() {
    const views: CameraView[] = ['chase_near', 'chase_far', 'hood', 'cinematic'];
    const currIdx = views.indexOf(this.cameraMode);
    this.cameraMode = views[(currIdx + 1) % views.length];
    this.callbacks.onCameraChange?.(this.cameraMode);
  }

  public setCameraMode(mode: CameraView) {
    this.cameraMode = mode;
    this.callbacks.onCameraChange?.(this.cameraMode);
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      this.onWindowBlur();
    }
  }

  private pollKeyboardInput() {
    let t = 0;
    let b = 0;
    let s = 0;

    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) t = 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) b = 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) s -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) s += 1;

    // Merge keyboard with virtual controls
    if (t > 0 || this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) {
      this.input.throttle = t;
    }
    if (b > 0 || this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) {
      this.input.brake = b;
    }
    if (s !== 0) {
      this.input.steer = s;
    }

    this.input.handbrake = this.keysHeld.has('Space') || this.input.handbrake;
    this.input.boost = this.keysHeld.has('ShiftLeft') || this.keysHeld.has('ShiftRight') || this.input.boost;
    this.input.horn = this.keysHeld.has('KeyH') || this.input.horn;
  }

  private updateCamera(dt: number) {
    const carPos = this.carRig?.root.position || _vec3.set(this.physicsState.x, this.physicsState.y, this.physicsState.z);
    const yaw = this.physicsState.yaw;
    const speed = Math.abs(this.physicsState.speedKmH);

    // Dynamic FOV based on speed
    const targetFov = 64 + Math.min(22, (speed / 280) * 22) + (this.physicsState.isBoosting ? 8 : 0);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1.0, 6 * dt);
    this.camera.updateProjectionMatrix();

    if (this.cameraMode === 'cinematic') {
      this.cinematicAngle += 0.35 * dt;
      const dist = 7.5;
      _camDesired.set(
        carPos.x + Math.sin(this.cinematicAngle) * dist,
        carPos.y + 2.4,
        carPos.z + Math.cos(this.cinematicAngle) * dist
      );
      _camLookTarget.set(carPos.x, carPos.y + 0.9, carPos.z);
    } else if (this.cameraMode === 'hood') {
      // Hood camera right above windshield
      const fX = Math.sin(yaw);
      const fZ = Math.cos(yaw);
      _camDesired.set(carPos.x + fX * 0.4, carPos.y + 1.15, carPos.z + fZ * 0.4);
      _camLookTarget.set(carPos.x + fX * 15, carPos.y + 1.0, carPos.z + fZ * 15);
    } else {
      // Chase near vs Chase far
      const isFar = this.cameraMode === 'chase_far';
      const followDist = isFar ? 9.8 : 6.4;
      const followHeight = isFar ? 3.4 : 2.1;

      const fX = Math.sin(yaw);
      const fZ = Math.cos(yaw);

      _camDesired.set(carPos.x - fX * followDist, carPos.y + followHeight, carPos.z - fZ * followDist);
      _camLookTarget.set(carPos.x + fX * 4, carPos.y + 0.95, carPos.z + fZ * 4);

      // Occlusion raycast to prevent camera from clipping inside skyscrapers
      if (this.city) {
        _rayOrigin.set(carPos.x, carPos.y + 1.5, carPos.z);
        _rayDir.subVectors(_camDesired, _rayOrigin).normalize();
        const maxDist = _rayOrigin.distanceTo(_camDesired);
        _raycaster.set(_rayOrigin, _rayDir);
        _raycaster.far = maxDist;

        // Check obstacles
        for (let i = 0; i < this.city.obstacles.length; i++) {
          const obs = this.city.obstacles[i];
          const minX = obs.x - obs.halfWidth;
          const maxX = obs.x + obs.halfWidth;
          const minZ = obs.z - obs.halfDepth;
          const maxZ = obs.z + obs.halfDepth;

          if (_camDesired.x >= minX && _camDesired.x <= maxX && _camDesired.z >= minZ && _camDesired.z <= maxZ) {
            // Pull camera forward along ray
            _camDesired.lerp(_rayOrigin, 0.45);
            break;
          }
        }
      }
    }

    // Camera Shake
    if (this.cameraShake > 0.001) {
      _camDesired.x += (Math.random() - 0.5) * this.cameraShake * 0.6;
      _camDesired.y += (Math.random() - 0.5) * this.cameraShake * 0.6;
      this.cameraShake = Math.max(0, this.cameraShake - 2.5 * dt);
    }

    // Exponential Damping
    const camFollowRate = this.cameraMode === 'hood' ? 24 : 10;
    this.camera.position.lerp(_camDesired, 1 - Math.exp(-camFollowRate * dt));
    this.camera.lookAt(_camLookTarget);
  }

  private tick = (currentTime: number) => {
    if (!this.isRunning) return;

    if (!this.lastTime) this.lastTime = currentTime;
    const rawDt = (currentTime - this.lastTime) * 0.001;
    this.lastTime = currentTime;
    const dt = Math.min(rawDt, 0.05);

    if (!this.isPaused) {
      // 1. Poll inputs
      this.pollKeyboardInput();

      // 2. Physics step
      const spec = CAR_SPECS[this.currentCarId] || CAR_SPECS.bmw_m4;
      const obstacles = this.city?.obstacles || [];
      this.physicsState = updateCarPhysics(this.physicsState, this.input, spec, dt, obstacles, 240);

      // Handle impact shock
      if (this.physicsState.collisionImpact > 0.2) {
        this.cameraShake = Math.min(1.2, this.cameraShake + this.physicsState.collisionImpact * 0.9);
        audioSystem.playCollisionImpact(this.physicsState.collisionImpact);
      }

      // 3. Update Car 3D Rig
      if (this.carRig) {
        this.carRig.root.position.set(this.physicsState.x, this.physicsState.y, this.physicsState.z);
        this.carRig.root.rotation.y = this.physicsState.yaw;

        const isNight = this.timeOfDay === 'night';
        this.carRig.update(
          this.physicsState.speedKmH,
          this.physicsState.steerAngle,
          this.physicsState.wheelRotation,
          this.input.brake > 0 && this.physicsState.speedKmH > 0.5,
          this.physicsState.gear === 'R',
          isNight,
          this.input.headlights,
          this.physicsState.roll,
          this.physicsState.pitch
        );

        // Update Sun Light follow target around car
        if (this.sunLight) {
          this.sunLight.target.position.set(this.physicsState.x, 0, this.physicsState.z);
          this.sunLight.target.updateMatrixWorld();
        }

        // Spawn Tire Smoke on Drift or Burnout
        const absSpeed = Math.abs(this.physicsState.speedKmH);
        if (
          (this.physicsState.driftFactor > 0.35 && absSpeed > 15) ||
          (this.input.brake > 0 && absSpeed > 70) ||
          (this.input.throttle > 0.8 && absSpeed < 10)
        ) {
          const rearDist = spec.dimensions.wheelbase * 0.5;
          const halfWidth = spec.dimensions.width * 0.45;
          const cos = Math.cos(this.physicsState.yaw);
          const sin = Math.sin(this.physicsState.yaw);

          // Left rear tire
          const rLx = this.physicsState.x - sin * rearDist + cos * halfWidth;
          const rLz = this.physicsState.z - cos * rearDist - sin * halfWidth;
          this.emitSmoke(rLx, this.physicsState.y, rLz, this.physicsState.driftFactor);

          // Right rear tire
          const rRx = this.physicsState.x - sin * rearDist - cos * halfWidth;
          const rRz = this.physicsState.z - cos * rearDist + sin * halfWidth;
          this.emitSmoke(rRx, this.physicsState.y, rRz, this.physicsState.driftFactor);
        }
      }

      // 4. Update particles
      this.updateParticles(dt);

      // 5. Update Audio
      audioSystem.update(
        this.physicsState.rpm,
        this.physicsState.speedKmH,
        this.input.throttle,
        this.physicsState.driftFactor,
        this.physicsState.isBoosting,
        this.input.horn
      );

      // 6. Push telemetry to HUD
      this.callbacks.onTelemetryUpdate(this.physicsState);
    }

    // 7. Update Camera
    this.updateCamera(dt);

    // 8. Render
    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }

    // 9. Frame Scheduling
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: (time: number) => void) {
    if (!this.renderer) return;
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(() => cb(performance.now()), 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  public startLoop() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  public stopLoop() {
    this.isRunning = false;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
  }

  private onResize = () => {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public dispose() {
    this.stopLoop();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    audioSystem.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
  }
}
