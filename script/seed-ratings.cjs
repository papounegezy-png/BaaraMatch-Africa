const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query(
    "WITH ranked AS (SELECT id, row_number() OVER (ORDER BY created_at ASC) AS rn FROM agency_profiles) UPDATE agency_profiles a SET rating = CASE ranked.rn WHEN 1 THEN 4.8 WHEN 2 THEN 4.2 WHEN 3 THEN 3.9 ELSE COALESCE(a.rating, 3.7) END FROM ranked WHERE a.id = ranked.id;",
  );

  await client.query(
    "WITH ranked AS (SELECT id, row_number() OVER (ORDER BY created_at ASC) AS rn FROM company_profiles) UPDATE company_profiles c SET rating = CASE ranked.rn WHEN 1 THEN 4.9 WHEN 2 THEN 4.4 WHEN 3 THEN 4.0 ELSE COALESCE(c.rating, 3.8) END FROM ranked WHERE c.id = ranked.id;",
  );

  const agencies = await client.query(
    "SELECT agency_name AS name, rating FROM agency_profiles ORDER BY rating DESC NULLS LAST LIMIT 5;",
  );
  const companies = await client.query(
    "SELECT company_name AS name, rating FROM company_profiles ORDER BY rating DESC NULLS LAST LIMIT 5;",
  );

  console.log("Top agencies by rating:");
  console.table(agencies.rows);
  console.log("Top companies by rating:");
  console.table(companies.rows);

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
