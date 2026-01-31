import { PHYSICS, PALETTE_COLORS } from './constants';
import * as THREE from 'three';

interface ExplosionState {
  isExploding: boolean;
  force: number;
}

interface SphereUserData {
  velocity: THREE.Vector3;
  baseScale: number;
  rotationSpeed: THREE.Vector3;
}

const loadTexture = (url: string): Promise<THREE.Texture | null> =>
  new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const texture = new THREE.Texture(img);
      texture.needsUpdate = true;
      resolve(texture);
    };
    img.onerror = () => {
      console.warn(`Failed to load: ${url}`);
      resolve(null);
    };
    img.src = url;
  });

const loadTextures = async (urls: readonly string[]): Promise<THREE.Texture[]> => {
  const results = await Promise.all(urls.map(loadTexture));
  const valid = results.filter((t): t is THREE.Texture => t !== null);
  console.log(`Loaded ${valid.length}/${urls.length} textures`);
  return valid;
};

// === SPHERE CREATION ===

const randomSphericalPosition = (minRadius: number, maxRadius: number): THREE.Vector3 => {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const radius = minRadius + Math.random() * (maxRadius - minRadius);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  );
};

const createSphereMesh = (geometry: THREE.SphereGeometry, material: THREE.MeshStandardMaterial): THREE.Mesh => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  mesh.position.copy(randomSphericalPosition(5, 13));

  const scale = 0.3 + Math.random() * 0.7;
  mesh.scale.setScalar(scale);

  const userData: SphereUserData = {
    velocity: new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02,
    ),
    baseScale: scale,
    rotationSpeed: new THREE.Vector3(
      (Math.random() - 0.5) * 0.002,
      (Math.random() - 0.5) * 0.002,
      (Math.random() - 0.5) * 0.002,
    ),
  };
  mesh.userData = userData;

  return mesh;
};

const createSpheres = (scene: THREE.Scene, textures: THREE.Texture[]): THREE.Mesh[] => {
  const geometry = new THREE.SphereGeometry(1, PHYSICS.SPHERE_SEGMENTS, PHYSICS.SPHERE_SEGMENTS);
  const spheres: THREE.Mesh[] = [];

  for (let i = 0; i < PHYSICS.SPHERE_COUNT; i++) {
    const material =
      textures.length > 0
        ? new THREE.MeshStandardMaterial({
            map: textures[i % textures.length],
            metalness: 0.1,
            roughness: 0.35,
            envMapIntensity: 0.8,
          })
        : new THREE.MeshStandardMaterial({
            color: PALETTE_COLORS[i % PALETTE_COLORS.length],
            metalness: 0.1,
            roughness: 0.35,
            envMapIntensity: 0.8,
          });

    const mesh = createSphereMesh(geometry, material);
    scene.add(mesh);
    spheres.push(mesh);
  }

  return spheres;
};

const disposeSpheres = (spheres: THREE.Mesh[]) => {
  spheres.forEach(mesh => {
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose());
    } else {
      mesh.material.dispose();
    }
  });
};

// === PHYSICS ===

const center = new THREE.Vector3(PHYSICS.CENTER_OFFSET.x, PHYSICS.CENTER_OFFSET.y, PHYSICS.CENTER_OFFSET.z);

const updatePhysics = (spheres: THREE.Mesh[], explosion: ExplosionState) => {
  const attractionStrength = explosion.isExploding
    ? PHYSICS.BASE_ATTRACTION * (1 - explosion.force * 0.8)
    : PHYSICS.BASE_ATTRACTION;
  const maxSpeed = explosion.isExploding ? PHYSICS.MAX_SPEED_EXPLODING : PHYSICS.MAX_SPEED;

  // Decay explosion
  if (explosion.force > 0) {
    explosion.force *= PHYSICS.EXPLOSION_DECAY;
    if (explosion.force < 0.01) {
      explosion.force = 0;
      explosion.isExploding = false;
    }
  }

  for (const sphere of spheres) {
    const ud = sphere.userData as SphereUserData;

    // Attract toward center
    const toCenter = center.clone().sub(sphere.position);
    const distance = toCenter.length();
    toCenter.normalize().multiplyScalar(attractionStrength * distance);
    ud.velocity.add(toCenter);

    // Friction
    ud.velocity.multiplyScalar(PHYSICS.FRICTION);

    // Speed limit
    if (ud.velocity.length() > maxSpeed) {
      ud.velocity.normalize().multiplyScalar(maxSpeed);
    }

    // Update position
    sphere.position.add(ud.velocity);

    // Boundary constraint
    if (sphere.position.length() > PHYSICS.BOUNDARY_RADIUS) {
      const pushBack = sphere.position.clone().normalize().multiplyScalar(-0.02);
      ud.velocity.add(pushBack);
    }

    // Sphere-sphere collision
    for (const other of spheres) {
      if (other === sphere) continue;

      const diff = sphere.position.clone().sub(other.position);
      const dist = diff.length();
      const otherUd = other.userData as SphereUserData;
      const minDist = (ud.baseScale + otherUd.baseScale) * 1.1;

      if (dist < minDist && dist > 0) {
        const overlap = minDist - dist;
        const pushDir = diff.normalize();

        // Separate spheres
        sphere.position.add(pushDir.clone().multiplyScalar(overlap * 0.5));
        other.position.sub(pushDir.clone().multiplyScalar(overlap * 0.5));

        // Transfer momentum
        const relativeVel = ud.velocity.clone().sub(otherUd.velocity);
        const impulse = pushDir.clone().multiplyScalar(relativeVel.dot(pushDir) * 0.5);
        ud.velocity.sub(impulse);
        otherUd.velocity.add(impulse);
      }
    }

    // Rotation
    sphere.rotation.x += ud.rotationSpeed.x;
    sphere.rotation.y += ud.rotationSpeed.y;
    sphere.rotation.z += ud.rotationSpeed.z;
    ud.rotationSpeed.multiplyScalar(PHYSICS.ROTATION_DAMPING);
  }
};

const explode = (spheres: THREE.Mesh[], explosion: ExplosionState) => {
  explosion.isExploding = true;
  explosion.force = 1.0;

  for (const sphere of spheres) {
    const ud = sphere.userData as SphereUserData;
    const direction = sphere.position.clone().normalize();

    if (direction.length() < 0.1) {
      direction.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    }

    const force = 0.3 + Math.random() * 0.2;
    ud.velocity.add(direction.multiplyScalar(force));

    // Add spin
    ud.rotationSpeed.set((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02);
  }
};

const pushFromMouse = (spheres: THREE.Mesh[], mouseX: number, mouseY: number, speed: number) => {
  // Convert mouse to 3D position (offset matches sphere center)
  const mousePos = new THREE.Vector3(mouseX * 8 + 7, mouseY * 5, 2);
  const pushRadius = 5;

  for (const sphere of spheres) {
    const ud = sphere.userData as SphereUserData;
    const toSphere = sphere.position.clone().sub(mousePos);
    const distance = toSphere.length();

    if (distance < pushRadius) {
      const force = (1 - distance / pushRadius) * speed * 15;
      const pushDir = toSphere.normalize().multiplyScalar(force);
      ud.velocity.add(pushDir);

      // Add spin
      ud.rotationSpeed.x += (Math.random() - 0.5) * force * 0.1;
      ud.rotationSpeed.y += (Math.random() - 0.5) * force * 0.1;
    }
  }
};

export { loadTextures, createSpheres, disposeSpheres, updatePhysics, explode, pushFromMouse };
export type { ExplosionState, SphereUserData };
