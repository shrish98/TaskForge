import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#f6f5f2',
        surface: '#ffffff',
        border: '#e5e3dc',
        primary: {
          50: '#fff4f0',
          100: '#ffe5db',
          500: '#f05228',
          600: '#ea580c',
          700: '#c23a15',
        },
      },
    },
  },
  plugins: [],
};
export default config;
