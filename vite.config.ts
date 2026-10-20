import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Préchargements injectés dans index.html au build (les noms de fichiers
// avec empreinte n'existent qu'à ce moment-là) :
// - Roboto Slab (caractères latins, 5 graisses), en priorité basse pour
//   arriver tôt sans passer devant le CSS et le JavaScript. Mêmes fichiers
//   que les @font-face de @fontsource (main.tsx) : un seul téléchargement.
// - le code de la page affichée (accueil, Services, Offres) et ses
//   dépendances, demandé en même temps que le paquet principal au lieu
//   d'après lui. Seulement sur l'adresse de cette page.
const prechargements = (): Plugin => ({
  name: "prechargements",
  apply: "build",
  transformIndexHtml: {
    order: "post",
    handler: (_html, ctx) => {
      const fichiers = Object.values(ctx.bundle ?? {});
      const polices = fichiers
        .filter((f) => f.type === "asset" && /roboto-slab-latin-[4-8]00-normal-[\w-]+\.woff2$/.test(f.fileName))
        .map((f) => ({
          tag: "link",
          attrs: { rel: "preload", as: "font", type: "font/woff2", crossorigin: "", fetchpriority: "low", href: `/${f.fileName}` },
          injectTo: "head" as const,
        }));
      const morceaux = new Map(fichiers.flatMap((f) => (f.type === "chunk" ? [[f.fileName, f] as const] : [])));
      // Le morceau d'une page et ses imports statiques, hors paquet principal.
      const fichiersDe = (page: string) => {
        const suffixe = `/client/src/pages/${page}.tsx`;
        const entree = Array.from(morceaux.values()).find((c) => c.facadeModuleId?.split(path.sep).join("/").endsWith(suffixe));
        const vus = new Set<string>();
        const parcourir = (nom: string) => {
          const c = morceaux.get(nom);
          if (!c || c.isEntry || vus.has(nom)) return;
          vus.add(nom);
          c.imports.forEach(parcourir);
        };
        if (entree) parcourir(entree.fileName);
        return Array.from(vus).map((n) => `/${n}`);
      };
      const parAdresse: Record<string, string[]> = {
        "/": fichiersDe("home"),
        "/services": fichiersDe("services"),
        "/jobs": fichiersDe("offres"),
        "/candidate/jobs": fichiersDe("offres"),
      };
      return [
        ...polices,
        {
          tag: "script",
          children: `(${JSON.stringify(parAdresse)}[location.pathname] || []).forEach(function (h) { var l = document.createElement("link"); l.rel = "modulepreload"; l.href = h; document.head.appendChild(l); });`,
          injectTo: "head" as const,
        },
      ];
    },
  },
});

export default defineConfig({
  plugins: [
    react(),
    prechargements(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
