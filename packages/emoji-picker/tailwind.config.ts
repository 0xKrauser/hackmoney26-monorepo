import globalConfig from '@repo/tailwindcss-config';
import type { Config } from 'tailwindcss';

export default {
  content: ['lib/**/*.tsx'],
  presets: [globalConfig],
} satisfies Config;
