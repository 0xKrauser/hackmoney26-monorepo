import { STARS } from './constants';
import * as THREE from 'three';

interface StarFieldData {
  geometry: THREE.BufferGeometry;
  velocities: { z: number }[];
}

const createLights = (scene: THREE.Scene) => {
  // Ambient light - low to preserve shadows
  const ambient = new THREE.AmbientLight(0xffffff, 0.08);
  scene.add(ambient);

  // Hemisphere light for subtle sky/ground variation
  const hemisphere = new THREE.HemisphereLight(0xffffff, 0x080820, 0.3);
  hemisphere.position.set(0, 20, 0);
  scene.add(hemisphere);

  // Key light - main light source from top-right-front
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(8, 12, 10);
  key.castShadow = true;
  key.shadow.mapSize.width = 2048;
  key.shadow.mapSize.height = 2048;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 50;
  key.shadow.camera.left = -20;
  key.shadow.camera.right = 20;
  key.shadow.camera.top = 20;
  key.shadow.camera.bottom = -20;
  key.shadow.bias = -0.0001;
  scene.add(key);

  // Fill light - softer light from opposite side
  const fill = new THREE.DirectionalLight(0x6688cc, 0.4);
  fill.position.set(-8, 4, 6);
  scene.add(fill);

  // Rim/back light - edge definition
  const rim = new THREE.DirectionalLight(0xffffff, 0.6);
  rim.position.set(0, -5, -10);
  scene.add(rim);

  // Top accent light for highlights
  const top = new THREE.PointLight(0xffffff, 0.5, 40);
  top.position.set(0, 15, 5);
  scene.add(top);

  return { ambient, hemisphere, key, fill, rim, top };
};

// === ENVIRONMENT MAP ===

const createEnvironmentMap = (scene: THREE.Scene) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Base gradient - dark space
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(0.3, '#16213e');
  gradient.addColorStop(0.6, '#0f0f1a');
  gradient.addColorStop(1, '#000000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);

  // Key light reflection spot (top right)
  const keySpot = ctx.createRadialGradient(750, 100, 0, 750, 100, 200);
  keySpot.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
  keySpot.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
  keySpot.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = keySpot;
  ctx.fillRect(0, 0, 1024, 512);

  // Fill light reflection (left side)
  const fillSpot = ctx.createRadialGradient(200, 200, 0, 200, 200, 150);
  fillSpot.addColorStop(0, 'rgba(100, 140, 200, 0.2)');
  fillSpot.addColorStop(1, 'rgba(100, 140, 200, 0)');
  ctx.fillStyle = fillSpot;
  ctx.fillRect(0, 0, 1024, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;

  return texture;
};

// === STAR FIELD ===

const createStarField = (scene: THREE.Scene): StarFieldData => {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(STARS.COUNT * 3);
  const colors = new Float32Array(STARS.COUNT * 3);
  const velocities: { z: number }[] = [];

  const white = new THREE.Color(0xffffff);
  const orange = new THREE.Color(0xff6b35);
  const gold = new THREE.Color(0xf9d684);

  for (let i = 0; i < STARS.COUNT; i++) {
    const i3 = i * 3;

    // Position
    positions[i3] = (Math.random() - 0.5) * STARS.SPREAD_X;
    positions[i3 + 1] = (Math.random() - 0.5) * STARS.SPREAD_Y;
    positions[i3 + 2] = STARS.MAX_Z - Math.random() * (STARS.MAX_Z - STARS.MIN_Z);

    // Velocity
    velocities.push({
      z: STARS.MIN_VELOCITY + Math.random() * (STARS.MAX_VELOCITY - STARS.MIN_VELOCITY),
    });

    // Color: 30% white, 45% gold, 25% orange
    const rand = Math.random();
    const color = rand < 0.3 ? white : rand < 0.75 ? gold : orange;
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.15,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return { geometry, velocities };
};

const updateStarField = (data: StarFieldData) => {
  const positions = data.geometry.attributes.position.array as Float32Array;

  for (let i = 0; i < STARS.COUNT; i++) {
    const i3 = i * 3;
    positions[i3 + 2] += data.velocities[i].z;

    // Recycle stars that pass the camera
    if (positions[i3 + 2] > STARS.RECYCLE_Z) {
      positions[i3] = (Math.random() - 0.5) * STARS.SPREAD_X;
      positions[i3 + 1] = (Math.random() - 0.5) * STARS.SPREAD_Y;
      positions[i3 + 2] = STARS.MIN_Z;
      data.velocities[i].z = STARS.MIN_VELOCITY + Math.random() * (STARS.MAX_VELOCITY - STARS.MIN_VELOCITY);
    }
  }

  data.geometry.attributes.position.needsUpdate = true;
};

export { createLights, createEnvironmentMap, createStarField, updateStarField };
export type { StarFieldData };
