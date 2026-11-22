/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#14213D',
          soft: '#1F2F52',
        },
        brand: {
          DEFAULT: '#0E7C86',
          dark: '#0A5F67',
          tint: '#E6F3F4',
        },
        canvas: '#F6F7F9',
        surface: '#FFFFFF',
        line: '#E2E6EC',
        text: {
          DEFAULT: '#101828',
          2: '#475467',
          3: '#667085',
        },
        success: {
          DEFAULT: '#1F7A52',
          tint: '#E7F4EC',
        },
        warning: {
          DEFAULT: '#9A6A0A',
          tint: '#FBF1DC',
        },
        danger: {
          DEFAULT: '#B42318',
          tint: '#FCE9E7',
        },
        'neutral-tint': '#EEF0F4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '8px',
        lg: '8px',
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(16, 24, 40, 0.05)',
      }
    },
  },
  plugins: [],
}
