/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#111827',
        accent: '#f97316',
        fifa: {
          blue: '#2b4dff',
          blueLight: '#4b69ff',
          blueDark: '#1a33cc',
          black: '#0b0b0d',
          orange: '#f05a00',
        },
      },
      fontFamily: {
        oswald: ['Oswald', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

