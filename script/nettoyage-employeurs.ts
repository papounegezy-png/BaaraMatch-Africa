/**
 * Proposition de nettoyage des employeurs (page Employeurs). Par défaut,
 * simulation : liste ce qui serait fait, n'écrit rien.
 *
 *   npx tsx script/nettoyage-employeurs.ts             simulation
 *   npx tsx script/nettoyage-employeurs.ts --appliquer exécute, en une transaction
 *
 * 1. Comptes de test laissés par les tests automatiques (e-mails
 *    test.smoke.* et test.freemium.* @example.com) : supprimés avec leurs
 *    données liées.
 * 2. Villes : une même ville écrite de plusieurs façons (« BAMAKO »,
 *    « Bamako ») prend la graphie la plus fréquente, remise en forme.
 * Les pays incohérents avec la ville (Bamako au Sénégal…) sont seulement
 * listés : à corriger par l'employeur ou après vérification.
 */
import "dotenv/config";
import { Pool } from "pg";
import { regrouperValeurs, normaliser } from "../shared/filtre-employeurs";

const appliquer = process.argv.includes("--appliquer");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

// Villes connues et leur pays, pour signaler les incohérences évidentes.
const PAYS_DES_VILLES: Record<string, string> = { bamako: "mali", kayes: "mali", sikasso: "mali", goulamina: "mali", dakar: "senegal", abidjan: "cote d'ivoire" };

try {
  await client.query("begin");
  const tests = (await client.query<{ id: string; email: string; nom: string }>(
    "select id, email, full_name as nom from users where user_type in ('agency','company') and (email like 'test.smoke.%@example.com' or email like 'test.freemium.%@example.com') order by email",
  )).rows;
  console.log(`1. Comptes de test (${tests.length}) :`);
  for (const t of tests) console.log(`   ${t.nom} <${t.email}>`);

  const employeurs = (await client.query<{ id: string; nom: string; ville: string | null; pays: string | null }>(
    "select u.id, coalesce(a.agency_name, c.company_name, u.full_name) as nom, u.city as ville, u.country as pays from users u left join agency_profiles a on a.user_id = u.id left join company_profiles c on c.user_id = u.id where u.user_type in ('agency','company') and not (u.id = any($1))",
    [tests.map((t) => t.id)],
  )).rows;
  const graphies = new Map(regrouperValeurs(employeurs.map((e) => e.ville)).map((g) => [g.valeur, g.libelle]));
  const villes = employeurs.filter((e) => e.ville && graphies.get(normaliser(e.ville)) !== e.ville);
  console.log(`2. Villes à réécrire (${villes.length}) :`);
  for (const e of villes) console.log(`   ${e.nom.trim()} : « ${e.ville} » → « ${graphies.get(normaliser(e.ville))} »`);

  const incoherents = employeurs.filter((e) => e.ville && e.pays && PAYS_DES_VILLES[normaliser(e.ville)] && PAYS_DES_VILLES[normaliser(e.ville)] !== normaliser(e.pays));
  console.log(`3. Pays incohérents avec la ville, non modifiés (${incoherents.length}) :`);
  for (const e of incoherents) console.log(`   ${e.nom.trim()} : ${e.ville}, ${e.pays}`);

  if (!appliquer) {
    await client.query("rollback");
    console.log("\nSimulation : rien n'a été modifié. Relancer avec --appliquer pour exécuter 1 et 2.");
  } else {
    const ids = tests.map((t) => t.id);
    // Tables qui référencent users.id : nettoyées avant les comptes.
    const refs = (await client.query<{ t: string; col: string }>(
      `select tc.table_name t, kcu.column_name col from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name
       join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
       where tc.constraint_type = 'FOREIGN KEY' and ccu.table_name = 'users' and ccu.column_name = 'id'`,
    )).rows;
    await client.query("delete from job_postings where company_id = any($1) or agency_id = any($1)", [ids]);
    for (const { t, col } of refs) await client.query(`delete from "${t}" where "${col}" = any($1)`, [ids]);
    const supprimes = (await client.query("delete from users where id = any($1)", [ids])).rowCount;
    for (const e of villes) await client.query("update users set city = $1 where id = $2", [graphies.get(normaliser(e.ville)), e.id]);
    await client.query("commit");
    console.log(`\n${supprimes} compte(s) de test supprimé(s), ${villes.length} ville(s) réécrite(s).`);
  }
} catch (e) {
  await client.query("rollback");
  console.error("Annulé, rien n'a été modifié :", (e as Error).message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
