/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        display: ['Bodoni Moda', 'Cinzel', 'serif'],
        body: ['Hanken Grotesk', 'sans-serif'],
      },
      colors: {
        'eb-gold': '#A3824C',
        'eb-gold-light': '#D8C28D',
        'eb-red': '#C62828',
        'eb-dark': '#1A1A1A',
        'eb-border': '#DDD8CE',
        'eb-bg': '#FAF8F5',
        'eb-surface': '#F7F4EE',
        'eb-text-sub': '#6D6A64',
      },
      borderRadius: {
        'xs': '4px',
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        '2xs': '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
