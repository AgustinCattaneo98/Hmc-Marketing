/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        hmc: {
          black: '#0a0a0a',
          gray: '#161616',
          gray2: '#1e1e1e',
          gray3: '#2a2a2a',
          border: '#2e2e2e',
          muted: '#777777',
          white: '#f0f0ea',
        },
      },
    },
  },
  plugins: [],
}
