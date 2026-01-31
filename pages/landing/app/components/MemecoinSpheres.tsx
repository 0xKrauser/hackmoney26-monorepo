"use client";
import { useEffect, useRef } from "react";
import { MEMECOIN_IMAGES } from "../lib/data";
import { generateStarField, randomVelocity } from "../lib/utils";
import * as THREE from "three";

export default function MemecoinSpheres() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const ambient = new THREE.AmbientLight(0xffffff, 0.08);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(8, 12, 10);
    scene.add(key);

    // Stars
    const starData = generateStarField(500);
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starData.positions, 3));
    starGeometry.setAttribute("color", new THREE.BufferAttribute(starData.colors, 3));
    const starMaterial = new THREE.PointsMaterial({
      size: 0.08,
      transparent: true,
      opacity: 0.5,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    const spheres: THREE.Mesh[] = [];

    // Load textures using Image and create spheres
    const loadTexture = (url: string) =>
      new Promise<THREE.Texture | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const tex = new THREE.Texture(img);
          tex.needsUpdate = true;
          resolve(tex);
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });

    const createSpheres = (textures: Array<THREE.Texture | null>) => {
      const geometry = new THREE.SphereGeometry(1, 32, 32);
      const count = 50;
      for (let i = 0; i < count; i++) {
        const tex = textures.filter(Boolean)[i % textures.length] as THREE.Texture | null;
        const material = tex
          ? new THREE.MeshStandardMaterial({ map: tex, metalness: 0.1, roughness: 0.35 })
          : new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.1, roughness: 0.35 });

        const mesh = new THREE.Mesh(geometry, material);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 5 + Math.random() * 8;
        mesh.position.set(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi)
        );
        const scale = 0.3 + Math.random() * 0.7;
        mesh.scale.setScalar(scale);
        // attach simple state
        (mesh as any).userData = { velocity: randomVelocity(0.005, 0.02), baseScale: scale, rotationSpeed: randomVelocity(0.001, 0.01) };
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        spheres.push(mesh);
      }
    };

    (async () => {
      const textures = await Promise.all(MEMECOIN_IMAGES.map((url) => loadTexture(url)));
      createSpheres(textures.filter(Boolean) as THREE.Texture[]);
    })();

    // Animation
    let paused = false;
    let targetRot = new THREE.Vector2();

    const onMouseMove = (e: MouseEvent) => {
      const mx = (e.clientX / window.innerWidth) * 2 - 1;
      const my = -(e.clientY / window.innerHeight) * 2 + 1;
      targetRot.set(my * 0.3, mx * 0.3);
    };

    const updateStars = () => {
      const pos = (starGeometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < 500; i++) {
        const i3 = i * 3;
        pos[i3 + 2] += starData.velocities[i].z;
        if (pos[i3 + 2] > 20) {
          pos[i3] = (Math.random() - 0.5) * 60;
          pos[i3 + 1] = (Math.random() - 0.5) * 40;
          pos[i3 + 2] = -100;
          starData.velocities[i].z = 0.05 + Math.random() * 0.15;
        }
      }
      (starGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    };

    const animate = () => {
      if (!paused) {
        // basic physics update
        for (const s of spheres) {
          const ud = (s as any).userData;
          // attraction to offset center
          const center = new THREE.Vector3(7, 0, 0);
          const toCenter = center.clone().sub(s.position).multiplyScalar(0.0005);
          (ud.velocity as THREE.Vector3).add(toCenter as any);
          (ud.velocity as THREE.Vector3).multiplyScalar(0.992);
          s.position.add(ud.velocity as THREE.Vector3);
          s.rotation.x += ud.rotationSpeed.x;
          s.rotation.y += ud.rotationSpeed.y;
        }
        updateStars();
        scene.rotation.x += (targetRot.x - scene.rotation.x) * 0.05;
        scene.rotation.y += (targetRot.y - scene.rotation.y) * 0.05;
      }
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener("mousemove", onMouseMove);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // expose minimal API
    appRef.current = { explode: () => {
      for (const s of spheres) {
        const dir = s.position.clone().normalize();
        if (dir.length() < 0.1) dir.set(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
        const force = 0.3 + Math.random() * 0.2;
        (s as any).userData.velocity.add(dir.multiplyScalar(force));
      }
    }};

    const onClick = () => appRef.current?.explode();
    document.body.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      document.body.removeEventListener("click", onClick);
      renderer.dispose();
    };
  }, []);

  return <canvas id="webgl-canvas" ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 1 }} />;
}
