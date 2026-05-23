/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      screens: {
        xs: "375px",
      },
      height: {
        screen: "100dvh",
      },
      colors: {
        // Dark Navy palette — replaces all indigo/purple
        navy: {
          950: "#020d1a",
          900: "#050d1a",
          850: "#071220",
          800: "#0a1628",
          750: "#0d1d35",
          700: "#0f2240",
          600: "#14304f",
          500: "#1a3d5c",
        },
        ocean: {
          900: "#082032",
          800: "#0c2d47",
          700: "#103a5e",
          600: "#164a76",
          500: "#1d5f94",
        },
        // Primary action color
        sky: {
          950: "#071e2e",
          900: "#0c2d45",
          800: "#0c4a6e",
          700: "#0369a1",
          600: "#0284c7",
          500: "#0ea5e9",
          400: "#38bdf8",
          300: "#7dd3fc",
          200: "#bae6fd",
          100: "#e0f2fe",
        },
        // Cyan accent
        cyan: {
          950: "#061820",
          900: "#0d2d38",
          800: "#155e75",
          700: "#0e7490",
          600: "#0891b2",
          500: "#06b6d4",
          400: "#22d3ee",
          300: "#67e8f9",
          200: "#a5f3fc",
          100: "#cffafe",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },
      animation: {
        "fade-slide-in": "fadeSlideIn 0.2s ease-out forwards",
        "typing-bounce": "typingBounce 1.2s ease-in-out infinite",
        "pulse-dot": "pulseDot 2s ease-in-out infinite",
      },
      keyframes: {
        fadeSlideIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        typingBounce: {
          "0%, 60%, 100%": { transform: "translateY(0)" },
          "30%": { transform: "translateY(-6px)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.2)" },
        },
      },
      boxShadow: {
        "navy-lg": "0 8px 32px rgba(2, 13, 26, 0.8)",
        "sky-glow": "0 0 20px rgba(14, 165, 233, 0.3)",
        "cyan-glow": "0 0 20px rgba(6, 182, 212, 0.25)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
