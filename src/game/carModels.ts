import * as THREE from 'three';
import { CarId, CarSpec } from './types';
import { CAR_SPECS } from './physics';

export interface CarVisualRig {
  root: THREE.Group;
  bodyMeshGroup: THREE.Group;
  primaryMaterials: THREE.MeshStandardMaterial[];
  glassMaterials: THREE.MeshPhysicalMaterial[];
  brakeLights: THREE.MeshStandardMaterial[];
  reverseLights: THREE.MeshStandardMaterial[];
  headlights: THREE.MeshStandardMaterial[];
  headlightSpotLeft: THREE.SpotLight;
  headlightSpotRight: THREE.SpotLight;
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  frontLeftCaliper: THREE.Mesh;
  frontRightCaliper: THREE.Mesh;
  exhaustPipes: THREE.Mesh[];
  shadowDisc: THREE.Mesh;
  spec: CarSpec;
  update: (
    speedKmH: number,
    steerAngle: number,
    wheelRotation: number,
    isBraking: boolean,
    isReversing: boolean,
    isNight: boolean,
    headlightsOn: boolean,
    bodyRoll: number,
    bodyPitch: number
  ) => void;
  setColor: (hex: string) => void;
}

// Procedural tire tread texture
function createTireTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1c1c1e';
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = '#0f0f11';
  for (let y = 0; y < 128; y += 16) {
    ctx.fillRect(0, y, 128, 4);
    ctx.fillRect(20, y + 6, 88, 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural carbon fiber roof texture
function createCarbonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, 64, 64);

  ctx.fillStyle = '#27272a';
  for (let x = 0; x < 64; x += 8) {
    for (let y = 0; y < 64; y += 8) {
      if ((x / 8 + y / 8) % 2 === 0) {
        ctx.fillRect(x, y, 8, 8);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Shared procedural textures
let tireTextureCache: THREE.CanvasTexture | null = null;
let carbonTextureCache: THREE.CanvasTexture | null = null;

function getTireTexture() {
  if (!tireTextureCache) tireTextureCache = createTireTexture();
  return tireTextureCache;
}

function getCarbonTexture() {
  if (!carbonTextureCache) carbonTextureCache = createCarbonTexture();
  return carbonTextureCache;
}

export function buildCarVisualRig(carId: CarId, initialColorHex?: string): CarVisualRig {
  const spec = CAR_SPECS[carId] || CAR_SPECS.bmw_m4;
  const colorHex = initialColorHex || spec.defaultColorHex;

  const root = new THREE.Group();
  root.name = `CarRig_${carId}`;

  // Body group pivots for suspension roll and pitch
  const bodyMeshGroup = new THREE.Group();
  root.add(bodyMeshGroup);

  const primaryMaterials: THREE.MeshStandardMaterial[] = [];
  const glassMaterials: THREE.MeshPhysicalMaterial[] = [];
  const brakeLights: THREE.MeshStandardMaterial[] = [];
  const reverseLights: THREE.MeshStandardMaterial[] = [];
  const headlights: THREE.MeshStandardMaterial[] = [];
  const exhaustPipes: THREE.Mesh[] = [];

  // Common Materials
  const bodyPaintMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.18,
    metalness: 0.85,
  });
  primaryMaterials.push(bodyPaintMaterial);

  const carbonMaterial = new THREE.MeshStandardMaterial({
    color: 0x222226,
    map: getCarbonTexture(),
    roughness: 0.45,
    metalness: 0.35,
  });

  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0xe0e6ed,
    roughness: 0.1,
    metalness: 0.95,
  });

  const darkTrimMaterial = new THREE.MeshStandardMaterial({
    color: 0x121417,
    roughness: 0.7,
    metalness: 0.2,
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0a101d,
    transparent: true,
    opacity: 0.72,
    roughness: 0.08,
    metalness: 0.1,
    ior: 1.52,
  });
  glassMaterials.push(glassMaterial);

  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });
  headlights.push(headlightMaterial);

  const taillightMaterial = new THREE.MeshStandardMaterial({
    color: 0xff1e27,
    emissive: 0xaa0008,
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });
  brakeLights.push(taillightMaterial);

  const reverseLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.2,
  });
  reverseLights.push(reverseLightMaterial);

  // Wheel constructor helper
  function createWheel(isFront: boolean): { wheelGroup: THREE.Group; caliper: THREE.Mesh } {
    const wheelGroup = new THREE.Group();

    // Tire
    const tireRadius = 0.34;
    const tireWidth = 0.26;
    const tireGeo = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 24);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x222225,
      map: getTireTexture(),
      roughness: 0.85,
      metalness: 0.1,
    });
    const tireMesh = new THREE.Mesh(tireGeo, tireMat);
    tireMesh.castShadow = true;
    wheelGroup.add(tireMesh);

    // Rim
    const rimRadius = 0.24;
    const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, tireWidth + 0.01, 16);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x1f232b,
      roughness: 0.25,
      metalness: 0.88,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    wheelGroup.add(rimMesh);

    // Spokes
    const spokeCount = 5;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2;
      const spokeGeo = new THREE.BoxGeometry(0.04, rimRadius * 1.8, 0.03);
      const spokeMat = new THREE.MeshStandardMaterial({
        color: 0x9099a6,
        roughness: 0.2,
        metalness: 0.9,
      });
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spoke.rotation.x = angle;
      spoke.position.x = 0.08;
      wheelGroup.add(spoke);
    }

    // Brake rotor disc
    const discGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.02, 16);
    discGeo.rotateZ(Math.PI / 2);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x889099,
      roughness: 0.3,
      metalness: 0.8,
    });
    const discMesh = new THREE.Mesh(discGeo, discMat);
    wheelGroup.add(discMesh);

    // Brake Caliper (M sport blue or racing gold)
    const caliperGeo = new THREE.BoxGeometry(0.06, 0.11, 0.08);
    const caliperMat = new THREE.MeshStandardMaterial({
      color: isFront ? 0x0066cc : 0x0055bb, // BMW M Blue caliper
      roughness: 0.3,
      metalness: 0.6,
    });
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(0, 0.14, 0.04);
    wheelGroup.add(caliper);

    return { wheelGroup, caliper };
  }

  // Wheel mounts
  const halfWheelbase = spec.dimensions.wheelbase * 0.5;
  const halfTrack = spec.dimensions.width * 0.45;
  const wheelY = 0.34;

  const { wheelGroup: frontLeftWheel, caliper: frontLeftCaliper } = createWheel(true);
  frontLeftWheel.position.set(halfTrack, wheelY, halfWheelbase);
  root.add(frontLeftWheel);

  const { wheelGroup: frontRightWheel, caliper: frontRightCaliper } = createWheel(true);
  frontRightWheel.position.set(-halfTrack, wheelY, halfWheelbase);
  frontRightWheel.rotation.y = Math.PI;
  root.add(frontRightWheel);

  const { wheelGroup: rearLeftWheel } = createWheel(false);
  rearLeftWheel.position.set(halfTrack, wheelY, -halfWheelbase);
  root.add(rearLeftWheel);

  const { wheelGroup: rearRightWheel } = createWheel(false);
  rearRightWheel.position.set(-halfTrack, wheelY, -halfWheelbase);
  rearRightWheel.rotation.y = Math.PI;
  root.add(rearRightWheel);

  // Soft Radial Contact Shadow Disc
  const shadowGeo = new THREE.PlaneGeometry(spec.dimensions.width * 1.3, spec.dimensions.length * 1.15);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d')!;
  const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.4)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.65,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.position.y = 0.03;
  root.add(shadowDisc);

  // BUILD CAR BODY: BMW M4 vs OTHERS
  if (carId === 'bmw_m4') {
    // 1. Lower chassis / body tub
    const mainBodyGeo = new THREE.BoxGeometry(1.82, 0.46, 4.60);
    const mainBody = new THREE.Mesh(mainBodyGeo, bodyPaintMaterial);
    mainBody.position.set(0, 0.44, 0);
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    bodyMeshGroup.add(mainBody);

    // Front Bumper / Nose with aggressive rake
    const noseGeo = new THREE.BoxGeometry(1.78, 0.38, 0.65);
    const nose = new THREE.Mesh(noseGeo, bodyPaintMaterial);
    nose.position.set(0, 0.40, 2.30);
    nose.castShadow = true;
    bodyMeshGroup.add(nose);

    // Front Carbon Splitter
    const splitterGeo = new THREE.BoxGeometry(1.84, 0.05, 0.55);
    const splitter = new THREE.Mesh(splitterGeo, carbonMaterial);
    splitter.position.set(0, 0.18, 2.40);
    bodyMeshGroup.add(splitter);

    // 2. Hood with M Power Dome bulge
    const hoodGeo = new THREE.BoxGeometry(1.50, 0.10, 1.45);
    const hood = new THREE.Mesh(hoodGeo, bodyPaintMaterial);
    hood.position.set(0, 0.70, 1.40);
    bodyMeshGroup.add(hood);

    const powerDomeGeo = new THREE.BoxGeometry(0.70, 0.06, 1.10);
    const powerDome = new THREE.Mesh(powerDomeGeo, bodyPaintMaterial);
    powerDome.position.set(0, 0.76, 1.40);
    bodyMeshGroup.add(powerDome);

    // 3. Iconic BMW Twin Vertical Kidney Grille
    const grilleFrameMat = new THREE.MeshStandardMaterial({
      color: 0x151515,
      roughness: 0.3,
      metalness: 0.9,
    });
    const slatMat = new THREE.MeshStandardMaterial({
      color: 0x080808,
      roughness: 0.6,
      metalness: 0.2,
    });

    const createKidney = (xOffset: number) => {
      const kidneyGroup = new THREE.Group();
      // Outer rim
      const kRimGeo = new THREE.BoxGeometry(0.24, 0.38, 0.06);
      const kRim = new THREE.Mesh(kRimGeo, grilleFrameMat);
      kidneyGroup.add(kRim);

      // Horizontal slats
      for (let s = -0.12; s <= 0.12; s += 0.06) {
        const slatGeo = new THREE.BoxGeometry(0.20, 0.02, 0.08);
        const slat = new THREE.Mesh(slatGeo, slatMat);
        slat.position.y = s;
        kidneyGroup.add(slat);
      }

      kidneyGroup.position.set(xOffset, 0.46, 2.62);
      bodyMeshGroup.add(kidneyGroup);
    };
    createKidney(0.18);
    createKidney(-0.18);

    // BMW Roundel Emblem on nose
    const emblemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.01, 16);
    emblemGeo.rotateX(Math.PI / 2);
    const emblemMat = new THREE.MeshStandardMaterial({
      color: 0x0066cc,
      roughness: 0.3,
      metalness: 0.5,
    });
    const emblem = new THREE.Mesh(emblemGeo, emblemMat);
    emblem.position.set(0, 0.66, 2.52);
    bodyMeshGroup.add(emblem);

    // 4. Cabin Greenhouse & Carbon Roof
    const cabinGeo = new THREE.BoxGeometry(1.48, 0.52, 2.25);
    const cabin = new THREE.Mesh(cabinGeo, bodyPaintMaterial);
    cabin.position.set(0, 0.88, -0.22);
    cabin.castShadow = true;
    bodyMeshGroup.add(cabin);

    // Carbon fiber roof panel
    const roofGeo = new THREE.BoxGeometry(1.42, 0.04, 1.70);
    const roof = new THREE.Mesh(roofGeo, carbonMaterial);
    roof.position.set(0, 1.15, -0.22);
    bodyMeshGroup.add(roof);

    // Windshield (Front glass)
    const windshieldGeo = new THREE.PlaneGeometry(1.40, 0.75);
    const windshield = new THREE.Mesh(windshieldGeo, glassMaterial);
    windshield.position.set(0, 0.94, 0.82);
    windshield.rotation.x = -Math.PI / 4.2;
    bodyMeshGroup.add(windshield);

    // Rear windshield
    const rearGlassGeo = new THREE.PlaneGeometry(1.36, 0.72);
    const rearGlass = new THREE.Mesh(rearGlassGeo, glassMaterial);
    rearGlass.position.set(0, 0.96, -1.25);
    rearGlass.rotation.x = Math.PI / 3.8;
    rearGlass.rotation.y = Math.PI;
    bodyMeshGroup.add(rearGlass);

    // Side windows
    const sideGlassGeo = new THREE.PlaneGeometry(1.70, 0.40);
    const leftGlass = new THREE.Mesh(sideGlassGeo, glassMaterial);
    leftGlass.position.set(0.75, 0.90, -0.20);
    leftGlass.rotation.y = Math.PI / 2;
    bodyMeshGroup.add(leftGlass);

    const rightGlass = new THREE.Mesh(sideGlassGeo, glassMaterial);
    rightGlass.position.set(-0.75, 0.90, -0.20);
    rightGlass.rotation.y = -Math.PI / 2;
    bodyMeshGroup.add(rightGlass);

    // 5. Headlights (Sculpted BMW LED Eyes)
    const createHeadlight = (x: number) => {
      const hGroup = new THREE.Group();
      const lensGeo = new THREE.BoxGeometry(0.38, 0.12, 0.12);
      const lens = new THREE.Mesh(lensGeo, headlightMaterial);
      lens.rotation.y = x > 0 ? -0.25 : 0.25;
      hGroup.add(lens);

      hGroup.position.set(x, 0.58, 2.50);
      bodyMeshGroup.add(hGroup);
    };
    createHeadlight(0.62);
    createHeadlight(-0.62);

    // 6. Taillights (L-shaped BMW signature LEDs)
    const createTaillight = (x: number) => {
      const tGroup = new THREE.Group();
      const barGeo = new THREE.BoxGeometry(0.36, 0.10, 0.08);
      const bar = new THREE.Mesh(barGeo, taillightMaterial);
      tGroup.add(bar);

      // Backup light
      const bGeo = new THREE.BoxGeometry(0.08, 0.06, 0.08);
      const bMesh = new THREE.Mesh(bGeo, reverseLightMaterial);
      bMesh.position.x = x > 0 ? -0.12 : 0.12;
      tGroup.add(bMesh);

      tGroup.position.set(x, 0.62, -2.31);
      bodyMeshGroup.add(tGroup);
    };
    createTaillight(0.60);
    createTaillight(-0.60);

    // 7. M Aero Mirrors
    const createMirror = (x: number) => {
      const mGroup = new THREE.Group();
      const stalkGeo = new THREE.BoxGeometry(0.04, 0.04, 0.12);
      const stalk = new THREE.Mesh(stalkGeo, darkTrimMaterial);
      mGroup.add(stalk);

      const mirrorHousingGeo = new THREE.BoxGeometry(0.18, 0.10, 0.10);
      const housing = new THREE.Mesh(mirrorHousingGeo, bodyPaintMaterial);
      housing.position.set(x > 0 ? 0.08 : -0.08, 0.04, -0.02);
      mGroup.add(housing);

      mGroup.position.set(x, 0.78, 0.72);
      bodyMeshGroup.add(mGroup);
    };
    createMirror(0.85);
    createMirror(-0.85);

    // 8. Rear Ducktail Spoiler
    const spoilerGeo = new THREE.BoxGeometry(1.48, 0.06, 0.22);
    const spoiler = new THREE.Mesh(spoilerGeo, carbonMaterial);
    spoiler.position.set(0, 0.78, -2.18);
    spoiler.rotation.x = -0.15;
    bodyMeshGroup.add(spoiler);

    // 9. Rear Carbon Diffuser & Quad Exhaust Tips
    const diffuserGeo = new THREE.BoxGeometry(1.60, 0.14, 0.30);
    const diffuser = new THREE.Mesh(diffuserGeo, carbonMaterial);
    diffuser.position.set(0, 0.26, -2.25);
    bodyMeshGroup.add(diffuser);

    const createExhaust = (x: number) => {
      const pipeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.24, 16);
      pipeGeo.rotateX(Math.PI / 2);
      const pipe = new THREE.Mesh(pipeGeo, chromeMaterial);
      pipe.position.set(x, 0.24, -2.36);
      bodyMeshGroup.add(pipe);
      exhaustPipes.push(pipe);
    };
    createExhaust(0.32);
    createExhaust(0.44);
    createExhaust(-0.32);
    createExhaust(-0.44);
  } else if (carId === 'gt3_rs') {
    // Porsche 911 GT3 Track Edition
    const bodyGeo = new THREE.BoxGeometry(1.85, 0.44, 4.45);
    const body = new THREE.Mesh(bodyGeo, bodyPaintMaterial);
    body.position.set(0, 0.42, 0);
    body.castShadow = true;
    bodyMeshGroup.add(body);

    // Round GT3 front nose
    const noseGeo = new THREE.CylinderGeometry(0.85, 0.90, 0.38, 16);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, bodyPaintMaterial);
    nose.position.set(0, 0.42, 1.85);
    nose.scale.set(1.0, 1.0, 0.8);
    bodyMeshGroup.add(nose);

    // Round classic 911 headlights
    const roundHeadGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16);
    roundHeadGeo.rotateX(Math.PI / 2);
    const hl1 = new THREE.Mesh(roundHeadGeo, headlightMaterial);
    hl1.position.set(0.60, 0.58, 2.15);
    bodyMeshGroup.add(hl1);
    const hl2 = new THREE.Mesh(roundHeadGeo, headlightMaterial);
    hl2.position.set(-0.60, 0.58, 2.15);
    bodyMeshGroup.add(hl2);

    // Teardrop fastback cabin
    const cabinGeo = new THREE.BoxGeometry(1.42, 0.48, 2.00);
    const cabin = new THREE.Mesh(cabinGeo, bodyPaintMaterial);
    cabin.position.set(0, 0.84, -0.30);
    bodyMeshGroup.add(cabin);

    // Giant Swan-Neck GT3 Rear Wing
    const wingPylonGeo = new THREE.BoxGeometry(0.04, 0.42, 0.12);
    const p1 = new THREE.Mesh(wingPylonGeo, carbonMaterial);
    p1.position.set(0.40, 0.92, -1.95);
    p1.rotation.x = -0.2;
    bodyMeshGroup.add(p1);
    const p2 = new THREE.Mesh(wingPylonGeo, carbonMaterial);
    p2.position.set(-0.40, 0.92, -1.95);
    p2.rotation.x = -0.2;
    bodyMeshGroup.add(p2);

    const wingBladeGeo = new THREE.BoxGeometry(1.72, 0.04, 0.36);
    const wingBlade = new THREE.Mesh(wingBladeGeo, carbonMaterial);
    wingBlade.position.set(0, 1.15, -2.05);
    bodyMeshGroup.add(wingBlade);

    // Center dual exhaust
    const cPipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.20, 16).rotateX(Math.PI / 2), chromeMaterial);
    cPipe1.position.set(0.08, 0.28, -2.25);
    bodyMeshGroup.add(cPipe1);
    const cPipe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.20, 16).rotateX(Math.PI / 2), chromeMaterial);
    cPipe2.position.set(-0.08, 0.28, -2.25);
    bodyMeshGroup.add(cPipe2);
    exhaustPipes.push(cPipe1, cPipe2);

    // Taillight bar across rear
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.06, 0.06), taillightMaterial);
    tailBar.position.set(0, 0.62, -2.22);
    bodyMeshGroup.add(tailBar);
  } else {
    // Apex Vision Hypercar
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.34, 4.70), bodyPaintMaterial);
    mainBody.position.set(0, 0.38, 0);
    mainBody.castShadow = true;
    bodyMeshGroup.add(mainBody);

    // Low jet-canopy cockpit
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), glassMaterial);
    cockpit.scale.set(0.85, 0.55, 1.6);
    cockpit.position.set(0, 0.68, -0.1);
    bodyMeshGroup.add(cockpit);

    // Slim razor LED blade headlights
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.12), headlightMaterial);
    blade1.position.set(0.68, 0.44, 2.35);
    blade1.rotation.y = -0.3;
    bodyMeshGroup.add(blade1);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.12), headlightMaterial);
    blade2.position.set(-0.68, 0.44, 2.35);
    blade2.rotation.y = 0.3;
    bodyMeshGroup.add(blade2);

    // Extreme rear active diffuser
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.12, 0.50), carbonMaterial);
    diffuser.position.set(0, 0.22, -2.35);
    bodyMeshGroup.add(diffuser);

    // Rear light bar
    const tMesh = new THREE.Mesh(new THREE.BoxGeometry(1.80, 0.04, 0.06), taillightMaterial);
    tMesh.position.set(0, 0.54, -2.36);
    bodyMeshGroup.add(tMesh);
  }

  // Dual Headlight SpotLights with Target
  const headlightSpotLeft = new THREE.SpotLight(0xfff5e6, 0, 75, Math.PI / 5.5, 0.45, 1.2);
  headlightSpotLeft.position.set(0.65, 0.58, 2.45);
  const targetL = new THREE.Object3D();
  targetL.position.set(0.65, 0.1, 35);
  root.add(targetL);
  headlightSpotLeft.target = targetL;
  root.add(headlightSpotLeft);

  const headlightSpotRight = new THREE.SpotLight(0xfff5e6, 0, 75, Math.PI / 5.5, 0.45, 1.2);
  headlightSpotRight.position.set(-0.65, 0.58, 2.45);
  const targetR = new THREE.Object3D();
  targetR.position.set(-0.65, 0.1, 35);
  root.add(targetR);
  headlightSpotRight.target = targetR;
  root.add(headlightSpotRight);

  // Update routine
  const update = (
    _speedKmH: number,
    steerAngle: number,
    wheelRotation: number,
    isBraking: boolean,
    isReversing: boolean,
    isNight: boolean,
    headlightsOn: boolean,
    bodyRoll: number,
    bodyPitch: number
  ) => {
    // Steer front wheels
    frontLeftWheel.rotation.y = steerAngle;
    frontRightWheel.rotation.y = Math.PI + steerAngle;

    // Roll wheels around X
    frontLeftWheel.children[0].rotation.x = wheelRotation;
    frontRightWheel.children[0].rotation.x = -wheelRotation;
    rearLeftWheel.children[0].rotation.x = wheelRotation;
    rearRightWheel.children[0].rotation.x = -wheelRotation;

    // Chassis suspension lean
    bodyMeshGroup.rotation.z = bodyRoll;
    bodyMeshGroup.rotation.x = bodyPitch;

    // Headlights lighting
    const shouldIlluminate = headlightsOn || isNight;
    headlightMaterial.emissiveIntensity = shouldIlluminate ? 1.4 : 0.2;
    const spotIntensity = shouldIlluminate ? (isNight ? 18.0 : 6.0) : 0;
    headlightSpotLeft.intensity = spotIntensity;
    headlightSpotRight.intensity = spotIntensity;

    // Taillights and brake lights
    taillightMaterial.emissiveIntensity = isBraking ? 2.5 : isNight ? 0.8 : 0.3;
    reverseLightMaterial.emissiveIntensity = isReversing ? 2.0 : 0;
  };

  const setColor = (hex: string) => {
    const col = new THREE.Color(hex);
    primaryMaterials.forEach((m) => m.color.set(col));
  };

  return {
    root,
    bodyMeshGroup,
    primaryMaterials,
    glassMaterials,
    brakeLights,
    reverseLights,
    headlights,
    headlightSpotLeft,
    headlightSpotRight,
    frontLeftWheel,
    frontRightWheel,
    rearLeftWheel,
    rearRightWheel,
    frontLeftCaliper,
    frontRightCaliper,
    exhaustPipes,
    shadowDisc,
    spec,
    update,
    setColor,
  };
}
