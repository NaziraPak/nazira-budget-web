/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgPrimary: '#F7F4FA',
        cardSurface: '#FFFFFF',
        accentLilac: '#A594B6',
        accentLilacLight: '#EBE5F0',
        textPrimary: '#463E4D',
        textSecondary: '#857A8C',
        incomeGreen: '#96C8AA',
      },
    },
  },
  plugins: [],
}