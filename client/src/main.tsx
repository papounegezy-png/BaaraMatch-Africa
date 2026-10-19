import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/error-boundary";
// Roboto Slab, servie depuis le site (latin et latin-ext, font-display: swap).
import "@fontsource/roboto-slab/400.css";
import "@fontsource/roboto-slab/500.css";
import "@fontsource/roboto-slab/600.css";
import "@fontsource/roboto-slab/700.css";
import "@fontsource/roboto-slab/800.css";
import "./index.css";
// Les animations d'entrée de l'accueil attendent les polices des titres et
// du texte (voir .polices-pretes dans index.css) : sinon le titre change de
// police en pleine animation. Plafond de 2,5 s si une police tarde.
const marquerPolicesPretes = () => document.documentElement.classList.add("polices-pretes");
if (document.fonts?.load) {
  Promise.race([
    Promise.all([
      document.fonts.load('800 1em "Roboto Slab"'),
      document.fonts.load('400 1em "Roboto Slab"'),
    ]),
    new Promise((resoudre) => setTimeout(resoudre, 2500)),
  ]).then(marquerPolicesPretes, marquerPolicesPretes);
} else {
  marquerPolicesPretes();
}


createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
