import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: ".5625rem", /* 9px */
        md: ".375rem", /* 6px */
        sm: ".1875rem", /* 3px */
      },
      colors: {
        // Flat / base colors (regular buttons)
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border: "hsl(var(--popover-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          border: "var(--primary-border)",
          dark: "#0D2957",   // header, sidebar — marine profond
          deeper: "#02133A", // fond login page
          light: "#EEF4FD",  // fond page, barre progression, footer
          mid: "#DBEAFE",    // badges, inputs selected, borders
          text: "#1E40AF",   // texte sur fond clair
        },
        gold: {
          DEFAULT: "#D4A017", // succès virement, score A, activation
          light: "#FEF3C7",   // fond score élevé, badges réussite
          dark: "#92400E",    // texte sur fond or
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          border: "var(--secondary-border)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          border: "var(--muted-border)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          border: "var(--accent-border)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          border: "var(--destructive-border)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },
        sidebar: {
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
        },
        "sidebar-primary": {
          DEFAULT: "hsl(var(--sidebar-primary) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          border: "var(--sidebar-primary-border)",
        },
        "sidebar-accent": {
          DEFAULT: "hsl(var(--sidebar-accent) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "var(--sidebar-accent-border)"
        },
        status: {
          online: "rgb(34 197 94)",
          away: "rgb(245 158 11)",
          busy: "rgb(239 68 68)",
          offline: "rgb(156 163 175)",
        },
        // Palette de la maquette « Accueil animé v2 » (classes bg-baara-*,
        // text-baara-*…). Contraste : l'or sert de fond, de liseré ou d'accent
        // sur marine, jamais de texte sur blanc (2,4:1). Paires sûres : marine
        // sur or, blanc sur bleu, or-fonce sur or-pale.
        baara: {
          marine: "#0D2957",
          bleu: "#1A56DB",
          profond: "#02133A",
          clair: "#EEF4FD",
          moyen: "#DBEAFE",
          or: "#D4A017",
          "or-pale": "#FBF2DC",
          "or-fonce": "#7A5A0C",
          papier: "#F7FAFE",
          texte: "#475569",
          trait: "rgba(13, 41, 87, 0.14)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
        // Police unique du site : Roboto Slab, titres et texte courant. Les deux
        // classes sont gardées pour ne pas toucher aux composants.
        titre: ['"Roboto Slab"', "Georgia", "serif"],
        texte: ['"Roboto Slab"', "Georgia", "serif"],
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
        fondu: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Pour une ligne de titre dans un conteneur overflow-hidden.
        monte: {
          from: { transform: "translateY(108%)" },
          to: { transform: "translateY(0)" },
        },
        "entree-carte": {
          from: { opacity: "0", transform: "translateX(40px) rotate(1.6deg)" },
          to: { opacity: "1", transform: "translateX(0) rotate(0)" },
        },
        apparait: {
          from: { opacity: "0", transform: "scale(0.8)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        // pop-a / pop-b et onde-a / onde-b sont identiques deux à deux :
        // alterner la classe relance l'animation sans démonter l'élément.
        "pop-a": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "60%": { opacity: "1", transform: "scale(1.03)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pop-b": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "60%": { opacity: "1", transform: "scale(1.03)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "onde-a": {
          from: { boxShadow: "0 0 0 0 rgba(212, 160, 23, 0.7)" },
          to: { boxShadow: "0 0 0 16px rgba(212, 160, 23, 0)" },
        },
        "onde-b": {
          from: { boxShadow: "0 0 0 0 rgba(212, 160, 23, 0.7)" },
          to: { boxShadow: "0 0 0 16px rgba(212, 160, 23, 0)" },
        },
        flotte: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        fondu: "fondu 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        monte: "monte 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "entree-carte": "entree-carte 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        apparait: "apparait 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "pop-a": "pop-a 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "pop-b": "pop-b 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "onde-a": "onde-a 1.1s ease-out both",
        "onde-b": "onde-b 1.1s ease-out both",
        flotte: "flotte 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
