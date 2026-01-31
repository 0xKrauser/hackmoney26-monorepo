// Memecoin images from CoinGecko
export const MEMECOIN_IMAGES = [
  'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
  'https://assets.coingecko.com/coins/images/11939/large/shiba.png',
  'https://assets.coingecko.com/coins/images/16746/large/PNG_image.png',
  'https://assets.coingecko.com/coins/images/24383/large/bonk.png',
  'https://assets.coingecko.com/coins/images/33566/large/dogwifhat.jpg',
  'https://assets.coingecko.com/coins/images/39488/large/NEIRO200x200.jpg',
  'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg',
  'https://assets.coingecko.com/coins/images/35529/large/1000050750.png',
  'https://assets.coingecko.com/coins/images/33760/large/popcat.jpg',
  'https://assets.coingecko.com/coins/images/39765/large/mew.jpg',
  'https://assets.coingecko.com/coins/images/31059/large/MOG_LOGO_200x200.png',
  'https://assets.coingecko.com/coins/images/30117/large/turbo.png',
  'https://assets.coingecko.com/coins/images/35581/large/degen.png',
  'https://assets.coingecko.com/coins/images/36407/large/toshi.png',
  'https://assets.coingecko.com/coins/images/34959/large/GIGA.jpg',
  'https://assets.coingecko.com/coins/images/32528/large/memecoin_%282%29.png',
  'https://assets.coingecko.com/coins/images/28452/large/apuapustaja.png',
  'https://assets.coingecko.com/coins/images/33482/large/pork.png',
  'https://assets.coingecko.com/coins/images/35336/large/coq-logo.png',
  'https://assets.coingecko.com/coins/images/34258/large/MYRO200x200.png',
  'https://assets.coingecko.com/coins/images/37507/large/MOTHER.png',
  'https://assets.coingecko.com/coins/images/33093/large/snek.png',
  'https://assets.coingecko.com/coins/images/36077/large/Wen.png',
  'https://assets.coingecko.com/coins/images/35209/large/Smog_token_logo.png',
] as const;

// Fallback palette colors
export const PALETTE_COLORS = [
  0x3b82f6, // blue
  0x14b8a6, // teal
  0xeab308, // yellow
  0x22c55e, // green
  0xef4444, // red
] as const;

// Physics constants
export const PHYSICS = {
  SPHERE_COUNT: 50,
  SPHERE_SEGMENTS: 64,
  CENTER_OFFSET: { x: 7, y: 0, z: 0 },
  BASE_ATTRACTION: 0.0005,
  FRICTION: 0.992,
  MAX_SPEED: 0.15,
  MAX_SPEED_EXPLODING: 0.5,
  BOUNDARY_RADIUS: 15,
  EXPLOSION_DECAY: 0.98,
  ROTATION_DAMPING: 0.99,
} as const;

// Star field constants
export const STARS = {
  COUNT: 500,
  SPREAD_X: 60,
  SPREAD_Y: 40,
  MIN_Z: -100,
  MAX_Z: -30,
  RECYCLE_Z: 20,
  MIN_VELOCITY: 0.05,
  MAX_VELOCITY: 0.15,
} as const;
