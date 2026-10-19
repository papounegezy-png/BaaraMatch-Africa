/**
 * Formulaire « Demander une démo » de la page /services : erreurs de champ,
 * envoi réussi, échec réseau. L'appel à POST /api/demo-requests est simulé
 * (page.route) : le test n'écrit rien en base et ne consomme pas la
 * limitation de débit du serveur.
 */
import { expect, test, type Page } from "@playwright/test";

async function remplir(page: Page) {
  const formulaire = page.getByTestId("formulaire-demo");
  await formulaire.getByLabel("Nom et prénom").fill("Awa Traoré");
  await formulaire.getByLabel("Entreprise ou agence").fill("Groupe Sahel");
  await formulaire.getByLabel("Téléphone ou e-mail").fill("+223 76 24 75 57");
  await formulaire.getByLabel("Vous êtes").selectOption("agence");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/services#demo");
  await expect(page.getByTestId("formulaire-demo")).toBeVisible();
});

test("champ vide : erreur en texte sous le champ, sans envoi", async ({ page }) => {
  let appels = 0;
  await page.route("**/api/demo-requests", (route) => { appels++; return route.fulfill({ status: 201, body: "{}" }); });
  await page.getByTestId("bouton-envoyer-demo").click();

  const nom = page.getByLabel("Nom et prénom");
  await expect(nom).toHaveAttribute("aria-invalid", "true");
  await expect(nom).toBeFocused();
  const idErreur = await nom.getAttribute("aria-describedby");
  await expect(page.locator(`[id="${idErreur}"]`)).toHaveText("Indiquez votre nom et prénom.");
  await expect(page.getByText("Indiquez un téléphone ou un e-mail.")).toBeVisible();
  expect(appels).toBe(0);
});

test("envoi réussi : bandeau de succès et champs vidés", async ({ page }) => {
  let corps: Record<string, unknown> = {};
  await page.route("**/api/demo-requests", async (route) => {
    corps = route.request().postDataJSON();
    await new Promise((r) => setTimeout(r, 300));
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "x" }) });
  });
  await remplir(page);
  await page.getByTestId("bouton-envoyer-demo").click();
  await expect(page.getByTestId("bouton-envoyer-demo")).toBeDisabled();

  await expect(page.getByRole("status")).toHaveText("Demande enregistrée. On vous recontacte.");
  expect(corps).toMatchObject({ fullName: "Awa Traoré", company: "Groupe Sahel", contact: "+223 76 24 75 57", profileType: "agence", siteWeb: "" });
  await expect(page.getByLabel("Nom et prénom")).toHaveValue("");
});

test("échec réseau : alerte explicite, champs conservés, nouvel essai possible", async ({ page }) => {
  let essais = 0;
  await page.route("**/api/demo-requests", (route) => {
    essais++;
    return essais === 1 ? route.abort("internetdisconnected") : route.fulfill({ status: 201, contentType: "application/json", body: "{}" });
  });
  await remplir(page);
  await page.getByTestId("bouton-envoyer-demo").click();

  await expect(page.getByRole("alert")).toContainText("vérifiez votre connexion internet");
  await expect(page.getByLabel("Nom et prénom")).toHaveValue("Awa Traoré");
  await expect(page.getByTestId("bouton-envoyer-demo")).toHaveText("Réessayer");

  await page.getByTestId("bouton-envoyer-demo").click();
  await expect(page.getByRole("status")).toHaveText("Demande enregistrée. On vous recontacte.");
  expect(essais).toBe(2);
});
