import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Softened Luxury Color Palette
        vine: "#5C1A30",
        champagne: "#C8A872",
        "soft-gold": "#E8DCC0",
        cream: "#F5EFE7",
        "off-black": "#111111",
        bronze: "#8A6E4D",
        // Legacy colors (keeping for compatibility)
        silver: "#C0C0C0",
        "silver-dark": "#808080",
        "silver-darker": "#666666",
        "silver-light": "#E8E8E8",
        night: "#0A0A0A",
        offwhite: "#FAFAFA",
        // Legacy gold for backward compatibility
        gold: "#C8A872",
        // Luxury color palette (keeping for compatibility)
        luxury: {
          gold: "#C8A872",
          "gold-light": "#E8DCC0",
          "gold-dark": "#8A6E4D",
          black: "#111111",
          "black-light": "#1A1A1A",
          white: "#F5EFE7",
          "white-off": "#F5EFE7",
          silver: "#C0C0C0",
          "silver-light": "#E8E8E8",
          "silver-dark": "#808080",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        serif: ["Georgia", "serif"],
        display: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-2xl": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-xl": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg": ["3rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "display-md": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "display-sm": ["1.875rem", { lineHeight: "1.3" }],
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "128": "32rem",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        luxury: "0 20px 60px -12px rgba(0, 0, 0, 0.25)",
        "luxury-lg": "0 25px 80px -12px rgba(0, 0, 0, 0.3)",
        "luxury-xl": "0 30px 100px -12px rgba(0, 0, 0, 0.35)",
      },
      backgroundImage: {
        "gradient-gold": "linear-gradient(135deg, #D0B16A 0%, #E8D9B0 100%)",
        "gradient-bronze": "linear-gradient(135deg, #A46A3D 0%, #8B5630 100%)",
      },
      textShadow: {
        subtle: "0 1px 2px rgba(0, 0, 0, 0.1)",
        medium: "0 2px 4px rgba(0, 0, 0, 0.15)",
        strong: "0 4px 8px rgba(0, 0, 0, 0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-down": "slideDown 0.5s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

