# Vérification des employeurs par BaaraMatch

Le badge vert « Employeur vérifié par BaaraMatch » apparaît sur les cartes
d'offres (`/jobs`) et d'employeurs (`/agencies`). Il ne dépend que de la
vérification faite par l'équipe ; aucun employeur ne peut l'obtenir seul.

## Qui décide

- Les administrateurs **super_admin** et **gestionnaire_comptes** (droit
  `organisations:gerer`). Un modérateur ne peut pas vérifier.
- Un employeur ne peut jamais se marquer vérifié : ni en modifiant son profil
  (les champs `verifiedAt`, `verifiedBy` et `verificationStatus` sont refusés),
  ni en appelant l'action d'administration. Test : `tests/api-employeurs.test.ts`.

## Comment

Console admin → **Entreprises** ou **Agences** → colonne « Vérification » →
**Vérifier**, puis confirmer. **Retirer** annule la vérification ; le badge
disparaît aussitôt.

Chaque changement est enregistré : date (`verified_at`), administrateur
(`verified_by`) et une ligne du journal d'activité (« … vérifié par
BaaraMatch » ou « … n'est plus vérifié »).

Côté technique : `PATCH /api/admin/employeurs/:id/verification` avec
`{ "verifie": true | false }` (migrations 0041 et 0042).

## Sur quels critères (proposition, à valider)

Vérifier seulement quand **tous** ces points sont établis :

1. **Existence légale** : numéro RCCM (ou équivalent du pays) renseigné et
   document vu ; pour une agence de placement, agrément ou licence en cours.
2. **Existence réelle** : adresse ou site, et un appel au numéro de
   l'organisation (pas seulement au contact).
3. **Contact légitime** : la personne du compte travaille bien pour
   l'organisation (adresse e-mail du domaine, ou confirmation lors de
   l'appel).
4. **Cohérence du profil** : nom, ville, pays et secteur exacts.
5. **Aucun signalement** sérieux en cours (candidats, offres trompeuses).

Retirer la vérification si l'un de ces points n'est plus vrai (organisation
fermée, signalement confirmé, contact parti).

À décider : la durée de validité (proposition : revoir chaque année) et le
document à conserver comme preuve.
