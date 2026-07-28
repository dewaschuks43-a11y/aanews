import type { Config } from "tailwindcss";

export default {
  content: ["./client/src/**/*.{ts,tsx}", "./client/index.html"],
  theme: {
    extend: {
      colors: {
        navy: {
          700: "#0A1628",
          800: "#071020",
          900: "#040a14",
        },
      },
      fontFamily: {
        sans: ["Arial", "Helvetica Neue", "sans-serif"],
        serif: ["Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
