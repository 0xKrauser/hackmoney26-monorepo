'use client';
import { MEMECOIN_IMAGES } from './constants';
import { createLights, createEnvironmentMap, createStarField, updateStarField } from './scene';
import { loadTextures, createSpheres, disposeSpheres, updatePhysics, explode, pushFromMouse } from './spheres';
import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { StarFieldData } from './scene';
import type { ExplosionState } from './spheres';

const MemecoinSpheres = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spheresRef = useRef<THREE.Mesh[]>([]);
  const explosionRef = useRef<ExplosionState>({ isExploding: false, force: 0 });
  const starFieldRef = useRef<StarFieldData | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  const handleExplode = useCallback(() => {
    explode(spheresRef.current, explosionRef.current);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Initialize scene components
    createLights(scene);
    createEnvironmentMap(scene);
    starFieldRef.current = createStarField(scene);

    // Load textures and create spheres
    loadTextures(MEMECOIN_IMAGES).then(textures => {
      spheresRef.current = createSpheres(scene, textures);
    });

    // Mouse state
    const mouse = new THREE.Vector2();
    const prevMouse = new THREE.Vector2();
    const targetRotation = new THREE.Vector2();

    const onMouseMove = (e: MouseEvent) => {
      prevMouse.copy(mouse);
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      targetRotation.set(mouse.y * 0.3, mouse.x * 0.3);

      const dx = mouse.x - prevMouse.x;
      const dy = mouse.y - prevMouse.y;
      const speed = Math.sqrt(dx * dx + dy * dy);

      if (speed > 0.001) {
        pushFromMouse(spheresRef.current, mouse.x, mouse.y, speed);
      }
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const onClick = () => handleExplode();

    let hasEntered = false;
    const onMouseEnter = () => {
      if (!hasEntered) {
        hasEntered = true;
        handleExplode();
      }
    };

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      updatePhysics(spheresRef.current, explosionRef.current);

      if (starFieldRef.current) {
        updateStarField(starFieldRef.current);
      }

      // Smooth scene rotation
      scene.rotation.x += (targetRotation.x - scene.rotation.x) * 0.05;
      scene.rotation.y += (targetRotation.y - scene.rotation.y) * 0.05;

      renderer.render(scene, camera);
    };
    animate();

    // Event listeners
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);
    document.body.addEventListener('click', onClick);
    document.body.addEventListener('mouseenter', onMouseEnter);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      document.body.removeEventListener('click', onClick);
      document.body.removeEventListener('mouseenter', onMouseEnter);

      disposeSpheres(spheresRef.current);
      starFieldRef.current?.geometry.dispose();
      renderer.dispose();

      spheresRef.current = [];
      starFieldRef.current = null;
      sceneRef.current = null;
    };
  }, [handleExplode]);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'auto' }} />;
};

export { MemecoinSpheres };
export default MemecoinSpheres;
