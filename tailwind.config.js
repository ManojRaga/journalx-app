/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#0b0d17',
        onyx: '#11131f',
        aurum: '#c8a96a',
        pearl: '#f5f3ef',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['"Playfair Display"', 'serif'],
      },
      boxShadow: {
        glow: '0 0 60px rgba(200, 169, 106, 0.35)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

