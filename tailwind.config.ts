import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  // Safelist: classes built dynamically in JS (ternary/object maps) that Tailwind's
  // static scanner cannot detect. Without this they get purged in production builds.
  safelist: [
    // ── Order/payment status badge colours (used as object-map lookups) ──────────
    "bg-yellow-100", "text-yellow-800", "bg-yellow-50",
    "bg-blue-100",   "text-blue-800",   "bg-blue-50",
    "bg-amber-100",  "text-amber-800",  "bg-amber-50",
    "bg-green-100",  "text-green-800",  "bg-green-50",
    "bg-red-100",    "text-red-800",    "bg-red-50",
    "bg-purple-100", "text-purple-800",
    "bg-indigo-100", "text-indigo-800",
    "bg-slate-100",  "text-slate-800",
    // ── Dot/badge bg colours ──────────────────────────────────────────────────────
    "bg-green-500", "bg-red-500", "bg-yellow-500", "bg-amber-500", "bg-blue-500",
    // ── Icon / text colours (dynamic conditional bindings) ────────────────────────
    "text-green-500", "text-green-600", "text-green-700",
    "text-red-500",   "text-red-600",   "text-red-700",
    "text-blue-500",  "text-blue-600",  "text-blue-700",
    "text-amber-500", "text-amber-600", "text-amber-700", "text-amber-800",
    "text-yellow-500","text-yellow-700",
    "text-emerald-600",
    "text-purple-600",
    "text-indigo-600",
    "text-orange-600",
    "text-teal-500",
    "text-cyan-600",
    "text-rose-600",
    // ── Progress bar / stat card gradient pairs (passed as JS array items) ────────
    "from-amber-500",   "to-orange-500",
    "from-blue-500",    "to-cyan-500",
    "from-emerald-500", "to-teal-500",
    "from-violet-500",  "to-purple-600",
    "from-indigo-500",  "to-blue-600",
    "from-red-500",     "to-rose-600",
    "from-purple-500",  "to-pink-500",
    "from-orange-500",  "to-red-400",
    "from-teal-500",    "to-cyan-600",
    "from-amber-400",   "to-orange-500",
    "from-blue-400",    "to-indigo-500",
    "from-slate-400",   "to-slate-500",
    "from-amber-700",   "to-amber-800",
    // ── bg-gradient-to-br combos for stat card icon backgrounds ──────────────────
    "bg-amber-500/10", "bg-blue-500/10", "bg-orange-500/10",
    "bg-purple-500/10","bg-indigo-500/10","bg-red-500/10",
    // ── Inventory log quantity change colour ──────────────────────────────────────
    "text-green-600", "text-red-500",
    // ── Misc semantic colours used in admin settings / diagnostics ────────────────
    "text-yellow-500", "bg-yellow-500",
    "border-yellow-300","text-yellow-700",
    "border-green-300", "text-green-700",
    "border-red-500",  "text-red-600", "bg-red-500/5", "border-red-500/10",
    "animate-pulse",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["'Hind Siliguri'", "'Plus Jakarta Sans'", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "'Hind Siliguri'", "sans-serif"],
        bengali: ["'Hind Siliguri'", "sans-serif"],
      },
      colors: {
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
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
        },
        navy: {
          DEFAULT: "hsl(var(--navy))",
          light: "hsl(var(--navy-light))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'premium': '0 1px 3px 0 hsl(var(--primary) / 0.04), 0 4px 24px -4px hsl(var(--primary) / 0.06)',
        'premium-lg': '0 8px 40px -12px hsl(var(--primary) / 0.12), 0 1px 3px hsl(var(--primary) / 0.04)',
        'premium-xl': '0 20px 60px -15px hsl(var(--primary) / 0.15), 0 4px 20px -4px hsl(var(--primary) / 0.06)',
        'gold': '0 4px 20px -4px hsl(var(--gold) / 0.25)',
        'gold-lg': '0 8px 40px -8px hsl(var(--gold) / 0.35)',
        'inner-glow': 'inset 0 1px 0 0 hsl(0 0% 100% / 0.05)',
        'card-hover': '0 12px 48px -8px hsl(var(--primary) / 0.1), 0 2px 8px hsl(var(--primary) / 0.04)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "shimmer": {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--success) / 0.4)" },
          "50%": { boxShadow: "0 0 20px 8px hsl(var(--success) / 0.15)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "shimmer": "shimmer 2s linear infinite",
        "float": "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "gradient-x": "gradient-x 3s ease infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
