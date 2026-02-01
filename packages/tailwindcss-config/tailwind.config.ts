import plugin from 'tailwindcss/plugin';
import type { Config } from 'tailwindcss';

export default {
  theme: {
    extend: {
      fontFamily: {
        emoji: ['Twemoji', 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', 'Times', 'Symbola', 'serif'],
      },
    },
  },
  plugins: [
    // Custom scrollbar utilities
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-none': {
          'scrollbar-width': 'none',
          '-ms-overflow-style': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          '&::-webkit-scrollbar': {
            width: '10px',
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-button': {
            display: 'none',
            width: '0',
            height: '0',
          },
          '&::-webkit-scrollbar-corner': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: '10px',
            minHeight: '48px',
            border: 'solid 3px transparent',
          },
        },
        '.scrollbar-thumb-zinc-700': {
          'scrollbar-color': 'rgb(63 63 70) transparent',
          '&::-webkit-scrollbar-thumb': {
            boxShadow: 'inset 0 0 10px 10px rgb(63 63 70)',
          },
        },
        '.scrollbar-track-transparent': {
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
        },
      });
    }),
  ],
} as Omit<Config, 'content'>;
