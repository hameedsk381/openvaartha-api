import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      // ─────────────────────────────────────────────────────
      // BRAND COLOR SCALES
      // Primary  : #550000 (deep maroon)   → scale 50–950
      // Secondary: #F6DCC0 (soft beige)    → scale 50–950
      // ─────────────────────────────────────────────────────
      colors: {
        /* Primary — Maroon */
        maroon: {
          50:  "#FFF5F5",
          100: "#FFE8E8",
          200: "#FFCCCC",
          300: "#FF9999",
          400: "#E85555",
          500: "#C02B2B",
          600: "#8B1111",
          700: "#550000",   // ← brand primary
          800: "#3D0000",
          900: "#220000",
          950: "#110000",
        },
        /* Secondary — Beige */
        beige: {
          50:  "#FFFDF9",
          100: "#FFFAF3",
          200: "#FEF3E6",
          300: "#F6DCC0",   // ← brand secondary
          400: "#EBBF90",
          500: "#DC9E60",
          600: "#C07A34",
          700: "#8F5A1F",
          800: "#623D12",
          900: "#3A2208",
          950: "#1F1003",
        },
        /* Semantic tokens — mapped to CSS variables */
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface:    "hsl(var(--surface))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          subtle:     "hsl(var(--primary-subtle))",
          hover:      "hsl(var(--primary-hover))",
          bright:     "hsl(var(--primary-bright))",
          muted:      "hsl(var(--primary-muted))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT:    "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT:    "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        sidebar: {
          DEFAULT:             "hsl(var(--sidebar-background))",
          foreground:          "hsl(var(--sidebar-foreground))",
          primary:             "hsl(var(--sidebar-primary))",
          "primary-foreground":"hsl(var(--sidebar-primary-foreground))",
          accent:              "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border:              "hsl(var(--sidebar-border))",
          ring:                "hsl(var(--sidebar-ring))",
        },
      },

      // ─────────────────────────────────────────────────────
      // SPACING — 4px baseline (xs, sm, md, lg, xl, 2xl, 3xl…)
      // ─────────────────────────────────────────────────────
      spacing: {
        "4.5": "1.125rem",
        "13":  "3.25rem",
        "15":  "3.75rem",
        "18":  "4.5rem",
        "22":  "5.5rem",
        "26":  "6.5rem",
        "30":  "7.5rem",
      },

      // ─────────────────────────────────────────────────────
      // BORDER RADIUS
      // ─────────────────────────────────────────────────────
      borderRadius: {
        none:  "0px",
        xs:    "2px",
        sm:    "4px",
        md:    "6px",
        DEFAULT:"8px",
        lg:    "10px",
        xl:    "12px",
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "24px",
        full:  "9999px",
      },

      // ─────────────────────────────────────────────────────
      // TYPOGRAPHY
      // ─────────────────────────────────────────────────────
      fontFamily: {
        sans:  ["Inter", "system-ui", "-apple-system", "sans-serif"],
        serif: ["Source Serif 4", "Georgia", "Libre Baskerville", "serif"],
        mono:  ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem",  { lineHeight: "0.875rem"  }],  // 10px
        xs:    ["0.6875rem", { lineHeight: "1rem"      }],  // 11px
        sm:    ["0.8125rem", { lineHeight: "1.25rem"   }],  // 13px
        base:  ["1rem",      { lineHeight: "1.5rem"    }],  // 16px
        lg:    ["1.125rem",  { lineHeight: "1.75rem"   }],  // 18px
        xl:    ["1.25rem",   { lineHeight: "1.875rem"  }],  // 20px
        "2xl": ["1.5rem",    { lineHeight: "2rem"      }],  // 24px
        "3xl": ["1.875rem",  { lineHeight: "2.25rem"   }],  // 30px
        "4xl": ["2.25rem",   { lineHeight: "2.5rem"    }],  // 36px
        "5xl": ["3rem",      { lineHeight: "1"         }],  // 48px
        "6xl": ["3.75rem",   { lineHeight: "1"         }],  // 60px
        "7xl": ["4.5rem",    { lineHeight: "1"         }],  // 72px
        "8xl": ["6rem",      { lineHeight: "1"         }],  // 96px
      },

      // ─────────────────────────────────────────────────────
      // SHADOWS
      // ─────────────────────────────────────────────────────
      boxShadow: {
        "xs":     "0 1px 2px 0 rgba(0,0,0,0.05)",
        "sm":     "0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)",
        "md":     "0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.05)",
        "lg":     "0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)",
        "xl":     "0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)",
        "maroon": "0 4px 14px 0 rgba(85,0,0,0.20)",
        "maroon-lg": "0 10px 30px 0 rgba(85,0,0,0.25)",
        "inner-sm": "inset 0 1px 2px 0 rgba(0,0,0,0.06)",
      },

      // ─────────────────────────────────────────────────────
      // ANIMATIONS
      // ─────────────────────────────────────────────────────
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to:   { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to:   { height: "0", opacity: "0" },
        },
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "ticker": {
          from: { transform: "translateX(0)" },
          to:   { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-up":        "fade-up 0.5s ease-out both",
        "fade-in":        "fade-in 0.3s ease-out both",
        "ticker":         "ticker var(--ticker-duration, 30s) linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
