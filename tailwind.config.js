/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        morpho: {
          bg: "#090D16",
          card: "rgba(15, 23, 42, 0.75)",
          border: "rgba(56, 189, 248, 0.2)",
          cyan: "#38BDF8",
          emerald: "#10B981",
          violet: "#8B5CF6",
          amber: "#F59E0B",
          dark: "#050811",
          muted: "#64748B",
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
        sans: ["Outfit", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 20px -5px rgba(56, 189, 248, 0.3)",
        "neon-emerald": "0 0 20px -5px rgba(16, 185, 129, 0.3)",
      },
    },
  },
  plugins: [],
};
