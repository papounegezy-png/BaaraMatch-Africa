import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/error-boundary";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "./index.css";
// Les animations d'entrée de l'accueil attendent les polices des titres et
// du texte (voir .polices-pretes dans index.css) : sinon le titre change de
// police en pleine animation. Plafond de 2,5 s si une police tarde.
const marquerPolicesPretes = () => document.documentElement.classList.add("polices-pretes");
if (document.fonts?.load) {
  Promise.race([
    Promise.all([
      document.fonts.load('800 1em "Bricolage Grotesque"'),
      document.fonts.load('400 1em "Hanken Grotesk"'),
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
