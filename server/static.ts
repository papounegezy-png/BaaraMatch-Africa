import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Fichiers de assets/ : leur nom contient une empreinte du contenu (Vite),
  // donc ils ne changent jamais à adresse égale → cache d'un an.
  app.use("/assets", express.static(path.join(distPath, "assets"), { immutable: true, maxAge: "1y", fallthrough: false }));
  // index.html et les autres fichiers : toujours revalidés, pour qu'une
  // nouvelle version soit prise au prochain chargement.
  app.use(express.static(distPath, { setHeaders: (res) => res.setHeader("Cache-Control", "no-cache") }));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
