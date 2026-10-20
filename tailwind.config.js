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
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'pop-in': 'popIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'slide-up': 'slideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'float-up': 'floatUp 0.35s ease forwards',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(8px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { transform: 'scale(0) rotate(-10deg)', opacity: '0' },
          '80%': { transform: 'scale(1.08) rotate(2deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(16px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        floatUp: {
          'from': { opacity: '0', transform: 'translateY(6px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '60%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
