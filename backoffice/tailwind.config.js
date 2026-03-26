/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f6ff',
          100: '#e7efff',
          200: '#c7d8ff',
          300: '#a3bdfd',
          400: '#7aa0f8',
          500: '#4c669f',
          600: '#3d5686',
          700: '#2f456c',
          800: '#243454',
          900: '#1a253c',
        },
        accent: {
          500: '#ff4757',
          600: '#e63d4d',
        },
      },
      boxShadow: {
        soft: '0 12px 30px -18px rgba(15, 23, 42, 0.35)',
      },
      borderRadius: {
        xl: '1.25rem',
        '2xl': '1.75rem',
      },
    },
  },
  plugins: [],
};
