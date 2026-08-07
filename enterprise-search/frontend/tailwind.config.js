/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#F4F6FB',
        surface: '#FFFFFF',
        deep: {
          DEFAULT: '#0A0E1A',
          soft: '#121729',
          border: '#1F2740',
        },
        ink: {
          DEFAULT: '#131A2C',
          soft: '#5B6478',
          faint: '#94A0B8',
        },
        brand: {
          indigo: '#4F46E5',
          violet: '#8B5CF6',
          cyan: '#06B6D4',
        },
        state: {
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 60%, #06B6D4 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(79,70,229,0.10) 0%, rgba(139,92,246,0.10) 60%, rgba(6,182,212,0.10) 100%)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 0.55, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.06)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        dash: {
          to: { strokeDashoffset: 0 },
        },
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.4 },
          '40%': { transform: 'scale(1)', opacity: 1 },
        },
      },
      animation: {
        pulseGlow: 'pulseGlow 2.6s ease-in-out infinite',
        floatSlow: 'floatSlow 5s ease-in-out infinite',
        dash: 'dash 1.4s ease-out forwards',
        fadeInUp: 'fadeInUp 0.5s ease-out both',
        bounceDot: 'bounceDot 1.2s infinite ease-in-out',
      },
    },
  },
  plugins: [],
}
