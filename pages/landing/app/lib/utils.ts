export type Vec3 = { x: number; y: number; z: number };

export const randomInRange = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

export const randomSpherePosition = (
  radiusMin = 5,
  radiusMax = 13
): Vec3 => {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const radius = randomInRange(radiusMin, radiusMax);

  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi),
  };
};

export const randomVelocity = (
  min = 0.005,
  max = 0.02
): Vec3 => ({
  x: randomInRange(-0.5, 0.5) * randomInRange(min, max),
  y: randomInRange(-0.5, 0.5) * randomInRange(min, max),
  z: randomInRange(-0.5, 0.5) * randomInRange(min, max),
});

export const generateStarField = (count = 500) => {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const velocities: Array<{ z: number }> = [];

  const white = { r: 1, g: 1, b: 1 };
  const blue = { r: 0x3b / 0xff, g: 0x82 / 0xff, b: 0xf6 / 0xff };
  const teal = { r: 0x14 / 0xff, g: 0xb8 / 0xff, b: 0xa6 / 0xff };

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const x = (Math.random() - 0.5) * 60;
    const y = (Math.random() - 0.5) * 40;
    const z = -30 - Math.random() * 70;

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    velocities.push({ z: 0.05 + Math.random() * 0.15 });

    const rand = Math.random();
    let c = white;
    if (rand < 0.8) c = white;
    else if (rand < 0.95) c = blue;
    else c = teal;

    colors[i3] = c.r;
    colors[i3 + 1] = c.g;
    colors[i3 + 2] = c.b;
  }

  return { positions, colors, velocities };
};
