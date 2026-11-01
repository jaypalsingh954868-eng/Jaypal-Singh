import * as THREE from 'three';
import { CollisionObstacle, MinimapBuilding, MinimapData } from './types';

export interface CityWorld {
  root: THREE.Group;
  obstacles: CollisionObstacle[];
  minimapData: MinimapData;
  windowMaterials: THREE.MeshStandardMaterial[];
  streetLightMaterials: THREE.MeshStandardMaterial[];
  neonMaterials: THREE.MeshStandardMaterial[];
  updateTimeOfDay: (isNight: boolean, isSunset: boolean) => void;
}

// Procedural Asphalt Road Canvas Texture
function createAsphaltRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base asphalt dark grey with fine grain noise
  ctx.fillStyle = '#22252a';
  ctx.fillRect(0, 0, 512, 512);

  // Grain
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // Outer solid white lane boundary lines
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(24, 0, 10, 512);
  ctx.fillRect(478, 0, 10, 512);

  // Double solid yellow center divider
  ctx.fillStyle = '#f5b027';
  ctx.fillRect(250, 0, 6, 512);
  ctx.fillRect(260, 0, 6, 512);

  // Dashed white inner lane lines
  ctx.fillStyle = '#e2e8f0';
  for (let y = 16; y < 512; y += 64) {
    ctx.fillRect(138, y, 6, 36);
    ctx.fillRect(368, y, 6, 36);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 16);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural Lit Windows Building Texture
function createSkyscraperWindowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark facade
  ctx.fillStyle = '#181b22';
  ctx.fillRect(0, 0, 256, 512);

  // Window grid
  const cols = 12;
  const rows = 32;
  const w = 256 / cols;
  const h = 512 / rows;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const isLit = Math.random() > 0.42;
      if (isLit) {
        const warm = Math.random() > 0.4;
        ctx.fillStyle = warm ? 'rgba(255, 230, 170, 0.95)' : 'rgba(180, 220, 255, 0.95)';
        ctx.fillRect(c * w + 3, r * h + 3, w - 6, h - 6);
      } else {
        ctx.fillStyle = '#0f1217';
        ctx.fillRect(c * w + 3, r * h + 3, w - 6, h - 6);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural Sidewalk / Concrete Texture
function createSidewalkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8a919e';
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = '#6e7582';
  ctx.fillRect(0, 0, 128, 2);
  ctx.fillRect(0, 64, 128, 2);
  ctx.fillRect(0, 0, 2, 128);
  ctx.fillRect(64, 0, 2, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildOpenWorldCity(cityRadius = 240): CityWorld {
  const root = new THREE.Group();
  root.name = 'OpenWorldCity';

  const obstacles: CollisionObstacle[] = [];
  const minimapBuildings: MinimapBuilding[] = [];
  const minimapRoads: { x1: number; z1: number; x2: number; z2: number; width: number }[] = [];

  const windowMaterials: THREE.MeshStandardMaterial[] = [];
  const streetLightMaterials: THREE.MeshStandardMaterial[] = [];
  const neonMaterials: THREE.MeshStandardMaterial[] = [];

  // 1. Shared Textures and Materials
  const asphaltTexture = createAsphaltRoadTexture();
  const windowTexture = createSkyscraperWindowTexture();
  const sidewalkTexture = createSidewalkTexture();

  const roadMaterial = new THREE.MeshStandardMaterial({
    map: asphaltTexture,
    roughness: 0.82,
    metalness: 0.1,
  });

  const sidewalkMaterial = new THREE.MeshStandardMaterial({
    map: sidewalkTexture,
    roughness: 0.9,
    metalness: 0.05,
  });

  const curbMaterial = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.8,
    metalness: 0.1,
  });

  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a211e, // dark landscaped grass/ground
    roughness: 0.95,
    metalness: 0.05,
  });

  // Skyscraper Materials
  const buildingMaterial1 = new THREE.MeshStandardMaterial({
    color: 0x242d38,
    map: windowTexture,
    emissiveMap: windowTexture,
    emissive: new THREE.Color(0xffe2a3),
    emissiveIntensity: 0.3,
    roughness: 0.3,
    metalness: 0.7,
  });
  windowMaterials.push(buildingMaterial1);

  const buildingMaterial2 = new THREE.MeshStandardMaterial({
    color: 0x1a202c,
    map: windowTexture,
    emissiveMap: windowTexture,
    emissive: new THREE.Color(0xa0c8f0),
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.85,
  });
  windowMaterials.push(buildingMaterial2);

  const concreteFacadeMaterial = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.75,
    metalness: 0.2,
  });

  // Streetlight bulb material
  const streetLightBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff0c8,
    emissive: 0xffe099,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });
  streetLightMaterials.push(streetLightBulbMat);

  // 2. Base Ground Terrain (extended beyond playable zone with natural borders)
  const groundGeo = new THREE.PlaneGeometry(cityRadius * 2.6, cityRadius * 2.6);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMesh = new THREE.Mesh(groundGeo, groundMaterial);
  groundMesh.position.y = -0.05;
  groundMesh.receiveShadow = true;
  root.add(groundMesh);

  // 3. Central Plaza / Roundabout with Fountain
  const plazaRadius = 24;
  const roundaboutGeo = new THREE.RingGeometry(plazaRadius, plazaRadius + 14, 48);
  roundaboutGeo.rotateX(-Math.PI / 2);
  const roundaboutMesh = new THREE.Mesh(roundaboutGeo, roadMaterial);
  roundaboutMesh.position.set(0, 0.02, 0);
  roundaboutMesh.receiveShadow = true;
  root.add(roundaboutMesh);

  // Central Fountain in Roundabout (obstacle)
  const fountainBaseGeo = new THREE.CylinderGeometry(14, 14, 1.2, 32);
  const fountainBase = new THREE.Mesh(fountainBaseGeo, concreteFacadeMaterial);
  fountainBase.position.set(0, 0.6, 0);
  fountainBase.castShadow = true;
  fountainBase.receiveShadow = true;
  root.add(fountainBase);

  // Center Obelisk Monument
  const obeliskGeo = new THREE.ConeGeometry(3, 16, 4);
  const obeliskMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.3,
    metalness: 0.8,
  });
  const obelisk = new THREE.Mesh(obeliskGeo, obeliskMat);
  obelisk.position.set(0, 8.5, 0);
  obelisk.rotation.y = Math.PI / 4;
  obelisk.castShadow = true;
  root.add(obelisk);

  obstacles.push({
    x: 0,
    z: 0,
    halfWidth: 14.2,
    halfDepth: 14.2,
    height: 16,
    type: 'pillar',
  });

  // 4. City Road Network
  // Main Boulevard running North-South (Z axis)
  const boulevardWidth = 24;
  const boulevardLength = cityRadius * 1.8;
  const bvdGeo = new THREE.PlaneGeometry(boulevardWidth, boulevardLength);
  bvdGeo.rotateX(-Math.PI / 2);
  const bvdMesh = new THREE.Mesh(bvdGeo, roadMaterial);
  bvdMesh.position.set(0, 0.02, 0);
  bvdMesh.receiveShadow = true;
  root.add(bvdMesh);
  minimapRoads.push({ x1: 0, z1: -boulevardLength / 2, x2: 0, z2: boulevardLength / 2, width: boulevardWidth });

  // Main East-West Avenue (X axis)
  const avenueWidth = 20;
  const avenueLength = cityRadius * 1.8;
  const aveGeo = new THREE.PlaneGeometry(avenueLength, avenueWidth);
  aveGeo.rotateX(-Math.PI / 2);
  const aveMesh = new THREE.Mesh(aveGeo, roadMaterial);
  aveMesh.position.set(0, 0.02, 0);
  aveMesh.receiveShadow = true;
  root.add(aveMesh);
  minimapRoads.push({ x1: -avenueLength / 2, z1: 0, x2: avenueLength / 2, z2: 0, width: avenueWidth });

  // Secondary Cross Streets
  const streetOffsets = [-140, -75, 75, 140];
  const secStreetWidth = 14;

  streetOffsets.forEach((zPos) => {
    const sGeo = new THREE.PlaneGeometry(cityRadius * 1.6, secStreetWidth);
    sGeo.rotateX(-Math.PI / 2);
    const sMesh = new THREE.Mesh(sGeo, roadMaterial);
    sMesh.position.set(0, 0.02, zPos);
    sMesh.receiveShadow = true;
    root.add(sMesh);
    minimapRoads.push({ x1: -cityRadius * 0.8, z1: zPos, x2: cityRadius * 0.8, z2: zPos, width: secStreetWidth });
  });

  streetOffsets.forEach((xPos) => {
    const sGeo = new THREE.PlaneGeometry(secStreetWidth, cityRadius * 1.6);
    sGeo.rotateX(-Math.PI / 2);
    const sMesh = new THREE.Mesh(sGeo, roadMaterial);
    sMesh.position.set(xPos, 0.02, 0);
    sMesh.receiveShadow = true;
    root.add(sMesh);
    minimapRoads.push({ x1: xPos, z1: -cityRadius * 0.8, x2: xPos, z2: cityRadius * 0.8, width: secStreetWidth });
  });

  // 5. City Blocks, Sidewalks, and Skyscrapers
  const blockCenters = [
    // Quadrant 1 (North-East)
    { x: 38, z: 38, w: 46, d: 46 },
    { x: 108, z: 38, w: 44, d: 46 },
    { x: 38, z: 108, w: 46, d: 44 },
    { x: 108, z: 108, w: 44, d: 44 },
    { x: 175, z: 75, w: 40, d: 80 },

    // Quadrant 2 (North-West)
    { x: -38, z: 38, w: 46, d: 46 },
    { x: -108, z: 38, w: 44, d: 46 },
    { x: -38, z: 108, w: 46, d: 44 },
    { x: -108, z: 108, w: 44, d: 44 },
    { x: -175, z: 75, w: 40, d: 80 },

    // Quadrant 3 (South-West)
    { x: -38, z: -38, w: 46, d: 46 },
    { x: -108, z: -38, w: 44, d: 46 },
    { x: -38, z: -108, w: 46, d: 44 },
    { x: -108, z: -108, w: 44, d: 44 },
    { x: -175, z: -75, w: 40, d: 80 },

    // Quadrant 4 (South-East)
    { x: 38, z: -38, w: 46, d: 46 },
    { x: 108, z: -38, w: 44, d: 46 },
    { x: 38, z: -108, w: 46, d: 44 },
    { x: 108, z: -108, w: 44, d: 44 },
    { x: 175, z: -75, w: 40, d: 80 },
  ];

  // Neon District Brands
  const neonNames = [
    { text: 'M-POWER', color: 0x0077ff },
    { text: 'BMW M', color: 0xff0044 },
    { text: 'APEX MOTORS', color: 0xffaa00 },
    { text: 'TURBO CLUB', color: 0x00ffcc },
    { text: 'DRIFT CAFE', color: 0xbf00ff },
    { text: 'CYBER TOWER', color: 0x00eeff },
  ];

  blockCenters.forEach((block, index) => {
    // Sidewalk base for this block
    const swGeo = new THREE.BoxGeometry(block.w, 0.22, block.d);
    const swMesh = new THREE.Mesh(swGeo, sidewalkMaterial);
    swMesh.position.set(block.x, 0.11, block.z);
    swMesh.receiveShadow = true;
    root.add(swMesh);

    // Curb edge border
    const curbGeo = new THREE.BoxGeometry(block.w + 0.3, 0.24, block.d + 0.3);
    const curbMesh = new THREE.Mesh(curbGeo, curbMaterial);
    curbMesh.position.set(block.x, 0.10, block.z);
    root.add(curbMesh);

    // Each block contains 1 to 2 distinct skyscraper towers
    const towerCount = index % 3 === 0 ? 1 : 2;
    if (towerCount === 1) {
      // Large Landmark Skyscraper
      const towerW = block.w - 10;
      const towerD = block.d - 10;
      const towerH = 45 + ((index * 13) % 55); // 45m to 100m high!

      const mat = index % 2 === 0 ? buildingMaterial1 : buildingMaterial2;
      const bGeo = new THREE.BoxGeometry(towerW, towerH, towerD);
      const bMesh = new THREE.Mesh(bGeo, mat);
      bMesh.position.set(block.x, towerH / 2 + 0.22, block.z);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      root.add(bMesh);

      // Crown / Rooftop Antenna
      if (towerH > 65) {
        const spireGeo = new THREE.CylinderGeometry(0.3, 1.2, 14, 8);
        const spire = new THREE.Mesh(spireGeo, concreteFacadeMaterial);
        spire.position.set(block.x, towerH + 7.22, block.z);
        root.add(spire);
      }

      // Neon Billboard Sign on roadside facade
      if (index < neonNames.length) {
        const sign = neonNames[index];
        const signGeo = new THREE.BoxGeometry(towerW * 0.7, 3.5, 0.5);
        const signMat = new THREE.MeshStandardMaterial({
          color: sign.color,
          emissive: sign.color,
          emissiveIntensity: 1.5,
          roughness: 0.2,
        });
        neonMaterials.push(signMat);
        const signMesh = new THREE.Mesh(signGeo, signMat);
        signMesh.position.set(block.x, 8.0, block.z + (towerD / 2) + 0.3);
        root.add(signMesh);
      }

      obstacles.push({
        x: block.x,
        z: block.z,
        halfWidth: towerW / 2 + 0.5,
        halfDepth: towerD / 2 + 0.5,
        height: towerH,
        type: 'building',
      });

      minimapBuildings.push({
        x: block.x,
        z: block.z,
        width: towerW,
        depth: towerD,
      });
    } else {
      // Split into 2 twin towers or podium + tower
      const halfW = (block.w - 12) / 2;
      const towerD = block.d - 10;

      [-1, 1].forEach((dir, subIdx) => {
        const subX = block.x + dir * (halfW / 2 + 2);
        const towerH = 30 + ((index * 17 + subIdx * 23) % 40);

        const mat = (index + subIdx) % 2 === 0 ? buildingMaterial1 : buildingMaterial2;
        const bMesh = new THREE.Mesh(new THREE.BoxGeometry(halfW, towerH, towerD), mat);
        bMesh.position.set(subX, towerH / 2 + 0.22, block.z);
        bMesh.castShadow = true;
        bMesh.receiveShadow = true;
        root.add(bMesh);

        obstacles.push({
          x: subX,
          z: block.z,
          halfWidth: halfW / 2 + 0.4,
          halfDepth: towerD / 2 + 0.4,
          height: towerH,
          type: 'building',
        });

        minimapBuildings.push({
          x: subX,
          z: block.z,
          width: halfW,
          depth: towerD,
        });
      });
    }
  });

  // 6. Elevated Highway Bridge Overpass
  // A curved elevated highway crossing over the avenue with pillars
  const bridgeWidth = 14;
  const bridgeLength = 160;
  const bridgeHeight = 6.8;

  const bridgeGeo = new THREE.BoxGeometry(bridgeWidth, 0.8, bridgeLength);
  const bridgeMesh = new THREE.Mesh(bridgeGeo, roadMaterial);
  bridgeMesh.position.set(75, bridgeHeight, 0);
  bridgeMesh.castShadow = true;
  bridgeMesh.receiveShadow = true;
  root.add(bridgeMesh);

  // Highway guardrails
  const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.8 });
  const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, bridgeLength), railMat);
  rail1.position.set(75 + bridgeWidth / 2, bridgeHeight + 0.5, 0);
  root.add(rail1);
  const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, bridgeLength), railMat);
  rail2.position.set(75 - bridgeWidth / 2, bridgeHeight + 0.5, 0);
  root.add(rail2);

  // Highway Support Pillars (obstacles)
  const pillarOffsets = [-50, 0, 50];
  pillarOffsets.forEach((pz) => {
    const pillarGeo = new THREE.CylinderGeometry(1.2, 1.2, bridgeHeight, 16);
    const pillar = new THREE.Mesh(pillarGeo, concreteFacadeMaterial);
    pillar.position.set(75, bridgeHeight / 2, pz);
    pillar.castShadow = true;
    root.add(pillar);

    obstacles.push({
      x: 75,
      z: pz,
      halfWidth: 1.4,
      halfDepth: 1.4,
      height: bridgeHeight,
      type: 'pillar',
    });
  });

  // Highway Access Ramps (East and West ends)
  const rampLength = 35;
  const rampGeo = new THREE.BoxGeometry(bridgeWidth, 0.5, rampLength);
  rampGeo.rotateX(Math.atan2(bridgeHeight, rampLength));

  const northRamp = new THREE.Mesh(rampGeo, roadMaterial);
  northRamp.position.set(75, bridgeHeight / 2, bridgeLength / 2 + rampLength / 2);
  root.add(northRamp);

  const southRamp = new THREE.Mesh(rampGeo, roadMaterial);
  southRamp.rotation.y = Math.PI;
  southRamp.position.set(75, bridgeHeight / 2, -bridgeLength / 2 - rampLength / 2);
  root.add(southRamp);

  // 7. Stunt Jump Ramps to Catch Air!
  const createStuntRamp = (x: number, z: number, rotY: number) => {
    const rGroup = new THREE.Group();
    const rW = 8;
    const rL = 12;
    const rH = 2.4;

    const rGeo = new THREE.BoxGeometry(rW, 0.3, rL);
    rGeo.rotateX(-0.22);
    const rMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      roughness: 0.6,
      metalness: 0.3,
    });
    const rMesh = new THREE.Mesh(rGeo, rMat);
    rMesh.position.set(0, rH / 2, 0);
    rMesh.castShadow = true;
    rGroup.add(rMesh);

    // Warning hazard stripes on ramp lip
    const lipMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.4,
    });
    const lip = new THREE.Mesh(new THREE.BoxGeometry(rW, 0.32, 0.6), lipMat);
    lip.position.set(0, rH, -rL / 2 + 0.3);
    rGroup.add(lip);

    rGroup.position.set(x, 0, z);
    rGroup.rotation.y = rotY;
    root.add(rGroup);
  };

  createStuntRamp(-40, 160, 0);
  createStuntRamp(40, -160, Math.PI);
  createStuntRamp(-160, -40, Math.PI / 2);

  // 8. Instanced Street Lamps
  const lampPoleGeo = new THREE.CylinderGeometry(0.12, 0.16, 6.5, 8);
  const lampArmGeo = new THREE.BoxGeometry(1.6, 0.12, 0.12);
  const lampHeadGeo = new THREE.BoxGeometry(0.6, 0.2, 0.4);

  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.7 });

  const lampPositions: { x: number; z: number; rotY: number }[] = [];
  for (let z = -cityRadius * 0.75; z <= cityRadius * 0.75; z += 30) {
    if (Math.abs(z) > 16) {
      lampPositions.push({ x: 13.5, z, rotY: Math.PI / 2 });
      lampPositions.push({ x: -13.5, z, rotY: -Math.PI / 2 });
    }
  }
  for (let x = -cityRadius * 0.75; x <= cityRadius * 0.75; x += 30) {
    if (Math.abs(x) > 16) {
      lampPositions.push({ x, z: 11.5, rotY: 0 });
      lampPositions.push({ x, z: -11.5, rotY: Math.PI });
    }
  }

  lampPositions.forEach((pos) => {
    const lampGroup = new THREE.Group();
    // Pole
    const pole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
    pole.position.y = 3.25;
    lampGroup.add(pole);

    // Arm
    const arm = new THREE.Mesh(lampArmGeo, lampPoleMat);
    arm.position.set(0.7, 6.4, 0);
    lampGroup.add(arm);

    // Bulb
    const bulb = new THREE.Mesh(lampHeadGeo, streetLightBulbMat);
    bulb.position.set(1.4, 6.3, 0);
    lampGroup.add(bulb);

    lampGroup.position.set(pos.x, 0, pos.z);
    lampGroup.rotation.y = pos.rotY;
    root.add(lampGroup);
  });

  // 9. Natural Perimeter Boundaries (Mountain Cliffs & Seawall)
  // Instead of an empty void wall, build a mountain range encircling North, East, West
  const cliffMat = new THREE.MeshStandardMaterial({
    color: 0x3b4252,
    roughness: 0.95,
    metalness: 0.05,
  });

  const cliffSegments = 24;
  for (let i = 0; i < cliffSegments; i++) {
    const angle = (i / cliffSegments) * Math.PI * 2;
    // Leave southern harbor open to sea
    if (Math.sin(angle) < -0.85) continue;

    const rad = cityRadius + 8 + ((i * 19) % 25);
    const cx = Math.cos(angle) * rad;
    const cz = Math.sin(angle) * rad;
    const cliffH = 25 + ((i * 13) % 22);

    const cliffGeo = new THREE.ConeGeometry(22, cliffH, 5);
    const cliff = new THREE.Mesh(cliffGeo, cliffMat);
    cliff.position.set(cx, cliffH / 2, cz);
    cliff.rotation.y = angle + 0.4;
    root.add(cliff);

    obstacles.push({
      x: cx,
      z: cz,
      halfWidth: 16,
      halfDepth: 16,
      height: cliffH,
      type: 'barrier',
    });
  }

  // Southern Seawall and Water plane
  const waterGeo = new THREE.PlaneGeometry(cityRadius * 2, 80);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0f2a4a,
    roughness: 0.1,
    metalness: 0.8,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(0, -0.8, -cityRadius - 25);
  root.add(water);

  const seawallGeo = new THREE.BoxGeometry(cityRadius * 1.8, 1.4, 3);
  const seawall = new THREE.Mesh(seawallGeo, concreteFacadeMaterial);
  seawall.position.set(0, 0.7, -cityRadius + 2);
  root.add(seawall);

  obstacles.push({
    x: 0,
    z: -cityRadius + 2,
    halfWidth: (cityRadius * 1.8) / 2,
    halfDepth: 1.5,
    height: 3,
    type: 'barrier',
  });

  // Time of Day updater
  const updateTimeOfDay = (isNight: boolean, isSunset: boolean) => {
    const windowEmissiveIntensity = isNight ? 1.6 : isSunset ? 0.8 : 0.2;
    windowMaterials.forEach((m) => {
      m.emissiveIntensity = windowEmissiveIntensity;
    });

    const streetLampIntensity = isNight ? 2.5 : isSunset ? 1.2 : 0.2;
    streetLightMaterials.forEach((m) => {
      m.emissiveIntensity = streetLampIntensity;
    });

    const neonIntensity = isNight ? 2.2 : isSunset ? 1.6 : 0.8;
    neonMaterials.forEach((m) => {
      m.emissiveIntensity = neonIntensity;
    });
  };

  return {
    root,
    obstacles,
    minimapData: {
      cityRadius,
      roads: minimapRoads,
      buildings: minimapBuildings,
    },
    windowMaterials,
    streetLightMaterials,
    neonMaterials,
    updateTimeOfDay,
  };
}
