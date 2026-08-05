/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#F9F8F6',
          100: '#EFE9E3',
          200: '#D9CFC7',
        },
        accent: {
          400: '#C9B59C',
          500: '#B8A186',
        },
        ink: {
          900: '#2B241C',
          700: '#5A4F42',
        },
      }
    }
  },
  plugins: [],
};
