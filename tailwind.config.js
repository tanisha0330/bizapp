/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Apple-inspired primary colors
        primary: {
          50: "#EEF4FF",
          100: "#DCE8FF",
          200: "#B9D1FF",
          300: "#96BAFF",
          400: "#739EFF",
          500: "#1A7CFF", // Main brand blue
          600: "#0066E6",
          700: "#0052B8",
          800: "#003D8A",
          900: "#00295C",
        },
        // Clean grays
        gray: {
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#E5E5E7",
          300: "#D1D1D6",
          400: "#A1A1A6",
          500: "#86868B",
          600: "#6E6E73",
          700: "#48484A",
          800: "#3A3A3C",
          900: "#1D1D1F",
        },
        // Success, warning, error
        success: "#34C759",
        warning: "#FF9500",
        danger: "#FF3B30",
        // Background colors
        background: "#FFFFFF",
        surface: "#F5F5F7",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Inter", "system-ui"],
      },
      fontSize: {
        "display": ["34px", { lineHeight: "41px", letterSpacing: "-0.4px" }],
        "title1": ["28px", { lineHeight: "34px", letterSpacing: "0.26px" }],
        "title2": ["22px", { lineHeight: "28px", letterSpacing: "0.16px" }],
        "title3": ["20px", { lineHeight: "25px", letterSpacing: "0.19px" }],
        "headline": ["17px", { lineHeight: "22px", letterSpacing: "-0.41px", fontWeight: "600" }],
        "body": ["17px", { lineHeight: "22px", letterSpacing: "-0.41px" }],
        "callout": ["16px", { lineHeight: "21px", letterSpacing: "-0.32px" }],
        "subhead": ["15px", { lineHeight: "20px", letterSpacing: "-0.24px" }],
        "footnote": ["13px", { lineHeight: "18px", letterSpacing: "-0.08px" }],
        "caption1": ["12px", { lineHeight: "16px" }],
        "caption2": ["11px", { lineHeight: "13px", letterSpacing: "0.06px" }],
      },
      borderRadius: {
        "apple-sm": "8px",
        "apple": "12px",
        "apple-lg": "16px",
        "apple-xl": "22px",
      },
      boxShadow: {
        "apple-sm": "0 2px 8px rgba(0, 0, 0, 0.08)",
        "apple": "0 4px 16px rgba(0, 0, 0, 0.12)",
        "apple-lg": "0 8px 32px rgba(0, 0, 0, 0.16)",
      },
    },
  },
  plugins: [],
}
