/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        void: "#0A0A0A", base: "#171717", surface: "#1A1A1A", elevated: "#262626",
        "accent-purple": "#7C3AED", "accent-cyan": "#06B6D4",
        "accent-success": "#10B981", "accent-warning": "#F59E0B", "accent-danger": "#EF4444",
      },
      fontFamily: {
        sans: ['Geist Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        "pulse-glow": { "0%, 100%": { boxShadow: "0 0 0 0 rgba(124, 58, 237, 0.4)" }, "50%": { boxShadow: "0 0 0 8px rgba(124, 58, 237, 0)" } },
        "slide-in-up": { from: { transform: "translateY(20px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
      },
      animation: {
        "pulse-glow": "pulse-glow 1.5s ease-out infinite",
        "slide-in-up": "slide-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
