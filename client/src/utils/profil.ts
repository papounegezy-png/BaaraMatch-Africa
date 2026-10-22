// « Mon profil » : conversions des données pour l'affichage. Aucune valeur
// brute (type MIME, numéro collé) n'arrive telle quelle à l'écran.

// Indicatifs de la région (et la France), du plus long au plus court pour
// la recherche. La longueur du numéro national varie : 8 chiffres au Mali,
// 9 au Sénégal et en Guinée, 10 en Côte d'Ivoire et au Bénin.
const INDICATIFS = ["221", "222", "223", "224", "225", "226", "227", "228", "229", "231", "232", "233", "234", "235", "237", "241", "33"];

/**
 * Chiffres d'un numéro national, par paires : « 76234567 » → « 76 23 45 67 » ;
 * longueur impaire (Sénégal, 9 chiffres) : « 77 123 45 67 ».
 */
function grouper(chiffres: string): string {
  if (chiffres.length % 2 === 1 && chiffres.length >= 7) {
    return [chiffres.slice(0, 2), chiffres.slice(2, 5), ...(chiffres.slice(5).match(/.{1,2}/g) ?? [])].join(" ");
  }
  return chiffres.match(/.{1,2}/g)?.join(" ") ?? "";
}

/**
 * Numéro lisible : « 76234567 » → « 76 23 45 67 » ; avec indicatif
 * (« + » ou « 00 ») : « +22376234567 » → « +223 76 23 45 67 ». Sans « + »,
 * un numéro de plus de 10 chiffres qui commence par un indicatif connu est
 * lu de la même façon (« 22376234567 » → « +223 76 23 45 67 »). Vide → null.
 */
export function formaterTelephone(valeur: string | null | undefined): string | null {
  const brut = (valeur ?? "").trim();
  if (!brut) return null;
  let chiffres = brut.replace(/\D/g, "");
  const avecPrefixe = brut.startsWith("+") || brut.startsWith("00");
  if (brut.startsWith("00")) chiffres = chiffres.slice(2);
  if (!chiffres) return null;
  if (avecPrefixe || chiffres.length > 10) {
    const indicatif = INDICATIFS.find((i) => chiffres.startsWith(i) && chiffres.length - i.length >= 8);
    if (indicatif) return `+${indicatif} ${grouper(chiffres.slice(indicatif.length))}`;
    // Indicatif inconnu : le numéro tel qu'il a été saisi, sans le redécouper.
    if (avecPrefixe) return brut.replace(/\s+/g, " ");
  }
  return grouper(chiffres);
}

const TYPES_FICHIER: [RegExp, string][] = [
  [/pdf/, "Document PDF"],
  [/msword|wordprocessingml|\.docx?$|opendocument\.text|\.odt$/, "Document Word"],
  [/^image\/|\.(png|jpe?g|webp|gif)$/, "Image"],
  [/^text\/plain|\.txt$/, "Document texte"],
];

/**
 * Type de fichier lisible : « application/pdf » → « Document PDF ». Sans
 * type MIME, l'extension du nom suffit ; inconnu → « Fichier ».
 */
export function libelleTypeFichier(typeMime?: string | null, nomFichier?: string | null): string {
  const indices = [typeMime, nomFichier].map((v) => (v ?? "").trim().toLowerCase()).filter(Boolean);
  for (const [motif, libelle] of TYPES_FICHIER) {
    if (indices.some((v) => motif.test(v))) return libelle;
  }
  return "Fichier";
}
