/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f2f7fd',
          100: '#e4f0fb',
          200: '#c9e2f7',
          300: '#a4cdf2',
          400: '#7ab3ea',
          500: '#5498e1',
          600: '#3a7bd4',
          700: '#3366c4',
          800: '#2d539f',
          900: '#29487e',
          950: '#1a2e50',
        },
        gray: {
          50: '#f9fafa',
          100: '#f1f1f3',
          200: '#e6e6e9',
          300: '#d2d2d8',
          400: '#aeaeba',
          500: '#8e8e9b',
          600: '#75757f',
          700: '#5f5f66',
          800: '#4a4a50',
          900: '#3d3d41',
        },
        apple: {
          blue: '#007aff',
          indigo: '#5856d6',
          purple: '#af52de',
          pink: '#ff2d55',
          red: '#ff3b30',
          orange: '#ff9500',
          yellow: '#ffcc00',
          green: '#34c759',
          teal: '#5ac8fa',
          gray: '#8e8e93',
        },
      },
      borderRadius: {
        'apple': '10px',
      },
      boxShadow: {
        'apple': '0 4px 10px rgba(0, 0, 0, 0.05)',
        'apple-hover': '0 8px 15px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
