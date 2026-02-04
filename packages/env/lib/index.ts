import { baseEnv, dynamicEnvValues } from './config.js';

export * from './config.js';
export * from './const.js';

export const env = {
  ...baseEnv,
  ...dynamicEnvValues,
} as const;
