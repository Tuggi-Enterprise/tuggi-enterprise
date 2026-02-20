import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
      colors: {
        "tuggi-primary": "#00A8E8",
        "tuggi-secondary": "#FF6F00",
        "tuggi-dark": "#0B1220",
        "tuggi-slate": "#5B6472",
        "tuggi-bg": "#F7F9FC",
      },
    },
  },
  plugins: [
    typography,
  ],
};

export default config;
