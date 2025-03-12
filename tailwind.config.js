/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Menlo', 'Monaco', 'Courier New', 'monospace']
      },
      animation: {
        'cursor-blink': 'cursor-blink 1s step-end infinite',
      },
      keyframes: {
        'cursor-blink': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0 },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}