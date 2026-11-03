/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F2FBF5',
          100: '#E1F7E9',
          200: '#C2EED2',
          300: '#92E0AF',
          400: '#58C986',
          500: '#2FAF64',
          600: '#208D4D',
          700: '#1B6F3E',
          800: '#195834',
          900: '#16482C',
          950: '#0B2818',
        },
        primary: {
          light: '#1B4332',
          DEFAULT: '#2D6A4F',
          dark: '#52B788',
        },
        surface: {
          light: {
            bg: '#FAF9F6',
            card: '#FFFFFF',
            cardMuted: '#F4F4F1',
            border: '#EBEBE6',
            text: '#161917',
            textMuted: '#6B7280',
          },
          dark: {
            bg: '#111412',
            card: '#1B201D',
            cardMuted: '#242A26',
            border: '#2A332D',
            text: '#F5F7F5',
            textMuted: '#9CA3AF',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'soft-md': '0 6px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'soft-lg': '0 12px 30px -4px rgba(0, 0, 0, 0.08), 0 4px 10px -2px rgba(0, 0, 0, 0.03)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
}
