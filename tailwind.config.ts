import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * GreenScout Tailwind theme.
 *
 * Colour tokens come from SPEC §8.1 / CLAUDE.md §9. The three brand greens
 * (`forest-green`, `plant-green`, `muted-lime`) each get a 50–900 scale so
 * hover/focus/disabled and subtle background variants stay on-brand. The
 * scales were derived by holding hue + saturation constant and shifting
 * lightness in HSL space so the DEFAULT shade exactly matches the SPEC hex.
 *
 * Hex map (DEFAULT in bold below for review):
 *
 *  forest-green (base HSL ≈ 160°, 22%, 22% — DEFAULT #2D473E)
 *    50  #ECF1EF   100 #D3DEDA   200 #A8BCB4   300 #7C9A8F
 *    400 #547569   500 #2D473E*  600 #243A33   700 #1B2C27
 *    800 #121E1B   900 #09100E
 *
 *  plant-green (base HSL ≈ 92°, 30%, 43% — DEFAULT #6A8F4E)
 *    50  #F1F5EC   100 #DDE7CE   200 #BCD09F   300 #9BB870
 *    400 #84A35F   500 #6A8F4E*  600 #55733E   700 #40572F
 *    800 #2A3A1F   900 #151D10
 *
 *  muted-lime (base HSL ≈ 86°, 47%, 66% — DEFAULT #B2D082)
 *    50  #F6FAEE   100 #EBF4D9   200 #D8E8B4   300 #C5DD98
 *    400 #B2D082*  500 #9CC25F   600 #80A547   700 #607C36
 *    800 #405224   900 #202913
 */

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
    "./src/features/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "forest-green": {
          50: "#ECF1EF",
          100: "#D3DEDA",
          200: "#A8BCB4",
          300: "#7C9A8F",
          400: "#547569",
          500: "#2D473E",
          600: "#243A33",
          700: "#1B2C27",
          800: "#121E1B",
          900: "#09100E",
          DEFAULT: "#2D473E",
        },
        "plant-green": {
          50: "#F1F5EC",
          100: "#DDE7CE",
          200: "#BCD09F",
          300: "#9BB870",
          400: "#84A35F",
          500: "#6A8F4E",
          600: "#55733E",
          700: "#40572F",
          800: "#2A3A1F",
          900: "#151D10",
          DEFAULT: "#6A8F4E",
        },
        "muted-lime": {
          50: "#F6FAEE",
          100: "#EBF4D9",
          200: "#D8E8B4",
          300: "#C5DD98",
          400: "#B2D082",
          500: "#9CC25F",
          600: "#80A547",
          700: "#607C36",
          800: "#405224",
          900: "#202913",
          DEFAULT: "#B2D082",
        },
        background: "#FFFFFF",
        foreground: "#000000",
        link: "#CC3366",
      },
      fontFamily: {
        // Variables are defined by `next/font/local` in src/app/layout.tsx.
        sans: ["var(--font-gabarito-body)", "system-ui", "sans-serif"],
        heading: ["var(--font-gabarito-heading)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
