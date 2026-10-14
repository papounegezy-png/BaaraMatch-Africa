# Accueil — fondations (maquette « Accueil animé v2 »)

- **Couleurs** `baara.*` (tailwind.config.ts) : marine, bleu, profond, clair, moyen, or, or-pale, or-fonce, papier, texte, trait. L'or ne sert jamais de texte sur fond blanc (2,4:1) ; paires sûres : marine sur or, blanc sur bleu, or-fonce sur or-pale.
- **Polices** : `font-titre` (Bricolage Grotesque 500/700/800) et `font-texte` (Hanken Grotesk 400–700), chargées par le lien Google Fonts de `client/index.html` avec `display=swap`.
- **Animations** : `animate-fondu`, `animate-monte` (ligne de titre dans un conteneur `overflow-hidden`), `animate-entree-carte`, `animate-apparait`, `animate-pop-a`/`-b` et `animate-onde-a`/`-b` (alterner la classe pour relancer), `animate-flotte`.
- **Apparition au défilement** : classes globales `.revele` / `.revele.visible` (index.css).
- **`useMouvementReduit()`** (`hooks/use-mouvement-reduit.ts`) : booléen réactif sur `prefers-reduced-motion: reduce`.
- **`useRevele(options?)`** (`hooks/use-revele.ts`) : `[ref, visible]`, IntersectionObserver au seuil 0,12, ne se déclenche qu'une fois ; visible d'emblée sans observateur ou en mouvement réduit.
- **Mouvement réduit** : index.css ramène toute animation et transition à ~0 ms dans tout le site, et `.revele` reste visible.
- Les composants de la refonte vivront dans ce dossier (`components/home/`), à côté des sections actuelles.
