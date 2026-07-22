/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Warm neutral scale (replaces Tailwind's default cool gray everywhere
        // `gray-*` is used) — gives every existing page a more refined base
        // without touching individual class names.
        gray: {
          50: "#f9f9f7",
          100: "#f2f1ee",
          150: "#ebeae5",
          200: "#e2e1da",
          300: "#cecdc3",
          400: "#aba99e",
          500: "#89877f",
          600: "#6d6b64",
          700: "#52514c",
          800: "#383733",
          900: "#201f1c",
          950: "#0f0e0d",
        },
        // Brand blue, tuned to the validated dataviz palette's categorical
        // slot 1 — the same hue used for the primary chart series.
        blue: {
          50: "#eef4fc",
          100: "#cde2fb",
          200: "#9ec5f4",
          300: "#6da7ec",
          400: "#3987e5",
          500: "#2a78d6",
          600: "#256abf",
          700: "#1c5cab",
          800: "#184f95",
          900: "#0d366b",
          950: "#0a2b57",
        },
        // Fixed-order categorical set for charts/segment badges — validated
        // colorblind-safe ordering, never reassign or cycle.
        chart: {
          blue: "#2a78d6",
          aqua: "#1baf7a",
          yellow: "#eda100",
          green: "#008300",
          violet: "#4a3aa7",
          red: "#e34948",
          magenta: "#e87ba4",
          orange: "#eb6834",
        },
        // Reserved status colors — never reused for series identity.
        status: {
          good: "#0ca30c",
          warning: "#c98500",
          serious: "#ec835a",
          critical: "#d03b3b",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 14, 13, 0.04), 0 1px 6px -1px rgba(15, 14, 13, 0.06)",
        "card-hover": "0 2px 4px 0 rgba(15, 14, 13, 0.06), 0 8px 20px -4px rgba(15, 14, 13, 0.10)",
        popover: "0 8px 24px -4px rgba(15, 14, 13, 0.16)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0 },
        },
        fadeInUp: {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        toastIn: {
          "0%": { opacity: 0, transform: "translateX(16px)" },
          "100%": { opacity: 1, transform: "translateX(0)" },
        },
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(100%)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
}
