export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['"Tajawal"', 'sans-serif'],
      },
      colors: {
        // Girly Theme
        girly: {
          bg: '#FDF2F8',
          card: '#FCE7F3',
          primary: '#EC4899',
          primaryHover: '#DB2777',
          accent: '#F472B6',
          text: '#831843',
          border: '#FBCFE8'
        },
        // Masculine Theme
        masculine: {
          bg: '#0F172A',
          card: '#1E293B',
          primary: '#10B981',
          primaryHover: '#059669',
          accent: '#34D399',
          text: '#F8FAFC',
          border: '#334155'
        }
      },
      fontFamily: {
        arabic: ['"Tajawal"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        }
      }
    },
  },
  plugins: [],
}
