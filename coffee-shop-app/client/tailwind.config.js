// All colours live here. Change them in one place to re-theme the whole app.
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        espresso: '#2E1F17', // sidebar, headings
        roast: '#4A3328',    // body text on light, hover on dark
        mocha: '#7A5A45',    // secondary text
        caramel: { DEFAULT: '#B9803F', dark: '#96651F', light: '#F0DDBF' }, // main accent
        latte: '#E4D3BE',    // borders
        crema: '#F1E7DA',    // soft panels
        foam: '#FAF6F0',     // page background
        sage: { DEFAULT: '#566F52', light: '#DFE8DC' }, // success / ready
        brick: { DEFAULT: '#A4432E', light: '#F5DDD6' }, // danger / cancelled
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
