/**
 * Pré-remplit le secteur des entreprises (company_profiles.secteur) depuis
 * le texte libre `industry`, seulement quand la correspondance est sûre
 * (secteurDeCategorie : un des 32 secteurs, un alias connu ou une ancienne
 * catégorie). Ne touche jamais un secteur déjà renseigné.
 *
 *   npx tsx script/remplir-secteurs.ts             simulation (rien n'est écrit)
 *   npx tsx script/remplir-secteurs.ts --appliquer écrit en base
 */
import "dotenv/config";
import { Pool } from "pg";
import { secteurDeCategorie } from "../shared/secteurs";

const appliquer = process.argv.includes("--appliquer");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const { rows } = await pool.query<{ id: string; nom: string; industry: string }>(
  "select id, company_name as nom, industry from company_profiles where secteur is null and coalesce(trim(industry), '') <> '' order by company_name",
);
const retenus = rows.map((r) => ({ ...r, secteur: secteurDeCategorie(r.industry) }));
for (const r of retenus) console.log(`${r.secteur ? "→" : "·"} ${r.nom} : « ${r.industry} » ${r.secteur ? `→ ${r.secteur}` : "(pas de correspondance sûre, laissé vide)"}`);
const aEcrire = retenus.filter((r) => r.secteur);
if (appliquer) {
  for (const r of aEcrire) await pool.query("update company_profiles set secteur = $1, updated_at = now() where id = $2 and secteur is null", [r.secteur, r.id]);
  console.log(`${aEcrire.length} secteur(s) écrit(s).`);
} else {
  console.log(`Simulation : ${aEcrire.length} secteur(s) seraient écrits. Relancer avec --appliquer.`);
}
await pool.end();
