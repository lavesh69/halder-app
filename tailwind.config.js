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
        halder: {
          forest: '#176B45',
          deep: '#124C36',
          fresh: '#2E8B57',
          soft: '#EAF5EE',
          canvas: '#F7F9F6',
          surface: '#FFFFFF',
          text: '#202923',
          secondary: '#66736B',
          muted: '#89948C',
          border: '#E5EBE6',
          success: '#238653',
          warning: '#D99A32',
          danger: '#D9534F',
          info: '#4285B8',
          darkBg: '#0F1411',
          darkCard: '#181F1A',
          darkMuted: '#222B25',
          darkBorder: '#29352D',
          darkText: '#F2F5F3',
          darkSecondary: '#A6B3AA',
          darkMutedText: '#728277',
        },
        brand: {
          50: '#F0F7F3',
          100: '#EAF5EE',
          200: '#CBE5D5',
          300: '#9BCEAF',
          400: '#5FB383',
          500: '#2E8B57',
          600: '#176B45',
          700: '#124C36',
          800: '#0E3929',
          900: '#0A2A1E',
          950: '#051610',
        },
        primary: {
          light: '#EAF5EE',
          DEFAULT: '#176B45',
          deep: '#124C36',
          dark: '#2E8B57',
        },
        surface: {
          light: {
            bg: '#F7F9F6',
            card: '#FFFFFF',
            cardMuted: '#F0F4F1',
            border: '#E5EBE6',
            text: '#202923',
            textMuted: '#66736B',
          },
          dark: {
            bg: '#0F1411',
            card: '#181F1A',
            cardMuted: '#222B25',
            border: '#29352D',
            text: '#F2F5F3',
            textMuted: '#A6B3AA',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px -1px rgba(18, 76, 54, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        'soft-md': '0 6px 18px -2px rgba(18, 76, 54, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'soft-lg': '0 12px 28px -4px rgba(18, 76, 54, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.04)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
}
