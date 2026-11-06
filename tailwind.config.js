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
          forest: '#0B3D2E',   /* Primary identity */
          leaf: '#2E7D32',     /* Secondary identity */
          lime: '#A8E063',     /* Freshness & highlights */
          gold: '#F4A017',     /* Sunrise & premium accents */
          cream: '#F6F4E8',    /* Main light backgrounds */
          charcoal: '#17251D', /* Primary text */
          white: '#FFFFFF',    /* Cards & contrast */
          muted: '#EEF1EA',    /* Subtle backgrounds */
          deep: '#07291F',
          fresh: '#2E7D32',
          soft: '#EAF5EE',
          canvas: '#F6F4E8',
          surface: '#FFFFFF',
          text: '#17251D',
          secondary: '#4A5B52',
          border: '#D8DFD5',
          success: '#2E7D32',
          warning: '#F4A017',
          danger: '#D9534F',
          info: '#2B7A78',
          darkBg: '#061B14',
          darkCard: '#0B291F',
          darkMuted: '#0F3327',
          darkBorder: '#164635',
          darkText: '#F6F4E8',
          darkSecondary: '#A3B8AD',
          darkMutedText: '#789083',
        },
        brand: {
          50: '#F0F7F3',
          100: '#EAF5EE',
          200: '#CBE5D5',
          300: '#9BCEAF',
          400: '#5FB383',
          500: '#2E7D32',
          600: '#0B3D2E',
          700: '#082E23',
          800: '#062018',
          900: '#041510',
          950: '#020C09',
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
        display: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
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
