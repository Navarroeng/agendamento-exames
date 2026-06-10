import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0b1f4d", 2: "#12316f" },
        brand: {
          blue: "#4f63ff",
          "blue-soft": "#eef1ff",
          "cyan-soft": "#eafaff",
          green: "#1f9d55",
          "green-soft": "#e9f8ef",
          orange: "#f59e0b",
          "orange-soft": "#fff4df",
          red: "#ef4444",
          "red-soft": "#fff0f0",
          purple: "#7c3aed",
          "purple-soft": "#f3edff",
        },
        app: {
          bg: "#f7f9fd",
          card: "#ffffff",
          text: "#14213d",
          muted: "#6b7280",
          line: "#e6eaf2",
        },
      },
      borderRadius: {
        card: "22px",
      },
      boxShadow: {
        card: "0 18px 45px rgba(15, 23, 42, 0.08)",
        btn: "0 10px 24px rgba(15, 23, 42, 0.04)",
        "btn-primary": "0 14px 28px rgba(79, 99, 255, 0.25)",
        logo: "0 12px 24px rgba(79, 99, 255, 0.25)",
        "title-icon": "0 12px 30px rgba(79, 99, 255, 0.12)",
        user: "0 10px 25px rgba(15, 23, 42, 0.05)",
        "exam-card": "0 12px 28px rgba(15, 23, 42, 0.04)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      screens: {
        sidebar: "850px",
        grid: "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
