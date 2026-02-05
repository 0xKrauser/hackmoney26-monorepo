import { withUI } from '@repo/ui';

export default withUI({
  content: ['index.html', 'src/**/*.tsx'],
  theme: {
    extend: {
      colors: {
        cream: '#FEF6E8',
        primary: {
          DEFAULT: '#F97316',
          hover: '#EA580C',
        },
      },
    },
  },
});
