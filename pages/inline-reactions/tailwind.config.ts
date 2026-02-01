import globalConfig from '@repo/tailwindcss-config';
import type { Config } from 'tailwindcss';

export default {
  content: [
    'src/**/*.tsx',
    // Include @repo/ui components
    '../../packages/ui/lib/**/*.tsx',
    // Include @repo/emoji-picker components
    '../../packages/emoji-picker/lib/**/*.tsx',
  ],
  presets: [globalConfig],
} satisfies Config;
