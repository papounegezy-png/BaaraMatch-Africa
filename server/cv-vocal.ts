import type { Express, NextFunction, Request, Response } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { uploadToObjectStorage } from "./objectStorage";
import { DUREE_MAX_SECONDES, DUREE_MIN_SECONDES, TAILLE_MAX_OCTETS, adresseAudioLisible, typeAudio } from "@shared/cv-vocal";
import type { UserType } from "@shared/schema";

type Intergiciel = (req: Request, res: Response, next: NextFunction) => void;

const envoiSchema = z.object({
  audioBase64: z.string().min(1),
  mimeType: z.string().min(1),
  // Mesurée par l'enregistreur ; bornée ici (le serveur ne décode pas l'audio).
  dureeSecondes: z.number().min(0).max(60 * 60),
});

/**
 * Sert un fichier audio : adresse data: (base64, sans stockage d'objets)
 * lue en mémoire, avec les requêtes partielles (Range) que Safari exige
 * pour lire et avancer dans un son ; fichier du stockage d'objets :
 * redirection vers sa route. Lecture dans la page seulement (inline, sans
 * nom de fichier).
 */
export function servirAudio(req: Request, res: Response, source: string) {
  if (source.startsWith("/api/files/")) return res.redirect(302, source);
  const m = source.match(/^data:([^;,]*)(;base64)?,([\s\S]*)$/);
  if (!m) return res.status(404).json({ message: "CV vocal non disponible" });
  const contenu = m[2] ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]));
  const total = contenu.length;
  res.setHeader("Content-Type", typeAudio(m[1]) ?? "application/octet-stream");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const plage = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ""));
  if (plage && (plage[1] || plage[2])) {
    let debut = plage[1] ? Number(plage[1]) : Math.max(0, total - Number(plage[2]));
    let fin = plage[1] && plage[2] ? Number(plage[2]) : total - 1;
    fin = Math.min(fin, total - 1);
    if (debut > fin || debut >= total) {
      res.setHeader("Content-Range", `bytes */${total}`);
      return res.status(416).end();
    }
    debut = Math.max(0, debut);
    res.status(206);
    res.setHeader("Content-Range", `bytes ${debut}-${fin}/${total}`);
    res.setHeader("Content-Length", String(fin - debut + 1));
    return res.end(contenu.subarray(debut, fin + 1));
  }
  res.setHeader("Content-Length", String(total));
  return res.end(contenu);
}

/**
 * Transcription et extraction des compétences, en option : seulement si
 * OpenAI répond (sans crédit, l'API renvoie 429). Ne bloque jamais
 * l'enregistrement, n'efface jamais une compétence saisie par le candidat.
 */
async function transcrireEnArrierePlan(userId: string, audio: Buffer, mimeType: string) {
  if (!process.env.OPENAI_API_KEY) return;
  try {
    const { transcribeAudio, extractProfileFromTranscription } = await import("./whatsapp");
    const transcription = await transcribeAudio(audio, mimeType);
    const extrait = await extractProfileFromTranscription(transcription);
    const profil = await storage.getCandidateProfile(userId);
    if (!profil) return;
    const competences = Array.from(new Set([...(profil.skills ?? []), ...(extrait.skills ?? [])]));
    await storage.updateCandidateProfile(userId, {
      voiceCvTranscript: transcription,
      skills: competences,
      ...(profil.experienceYears == null && extrait.experienceYears ? { experienceYears: extrait.experienceYears } : {}),
    });
  } catch (erreur) {
    console.warn("Transcription du CV vocal non disponible :", (erreur as Error).message?.slice(0, 120));
  }
}

export function registerCvVocalRoutes(app: Express, { requireAuth, requireRole }: { requireAuth: Intergiciel; requireRole: (...roles: UserType[]) => Intergiciel }) {
  // Enregistrer (ou remplacer) son CV vocal. L'audio est enregistré tout de
  // suite ; la transcription suit si elle est possible.
  const enregistrer = async (req: Request, res: Response) => {
    try {
      const corps = envoiSchema.safeParse(req.body);
      if (!corps.success) return res.status(400).json({ message: "Enregistrement invalide." });
      const type = typeAudio(corps.data.mimeType);
      if (!type) return res.status(400).json({ message: "Format audio non pris en charge." });
      const { dureeSecondes } = corps.data;
      if (dureeSecondes < DUREE_MIN_SECONDES) return res.status(400).json({ message: `Votre présentation doit durer au moins ${DUREE_MIN_SECONDES} secondes.` });
      if (dureeSecondes > DUREE_MAX_SECONDES + 2) return res.status(400).json({ message: `Votre présentation doit durer ${DUREE_MAX_SECONDES / 60} minutes au plus.` });
      const audio = Buffer.from(corps.data.audioBase64, "base64");
      if (!audio.length) return res.status(400).json({ message: "Enregistrement vide." });
      if (audio.length > TAILLE_MAX_OCTETS) return res.status(413).json({ message: "Enregistrement trop volumineux." });

      let adresse = `data:${type};base64,${audio.toString("base64")}`;
      try {
        adresse = await uploadToObjectStorage("voice-cv", req.session.userId!, audio, type);
      } catch {
        // Sans stockage d'objets (développement), l'audio reste dans la base.
      }
      const donnees = { voiceCvUrl: adresse, voiceCvDuration: Math.round(dureeSecondes), voiceCvTranscript: null, voiceCvWhatsappId: null };
      const profil = await storage.getCandidateProfile(req.session.userId!);
      if (profil) await storage.updateCandidateProfile(req.session.userId!, donnees);
      else await storage.createCandidateProfile({ userId: req.session.userId!, ...donnees });

      void transcrireEnArrierePlan(req.session.userId!, audio, type);
      res.status(201).json({ cvVocal: { url: "/api/profile/cv-vocal", dureeSecondes: Math.round(dureeSecondes) } });
    } catch (error) {
      console.error("Error saving voice CV:", error);
      res.status(500).json({ message: "Le CV vocal n'a pas pu être enregistré. Réessayez." });
    }
  };
  app.post("/api/profile/cv-vocal", requireRole("candidate"), enregistrer);
  // Ancienne adresse (éditeur du profil) : même traitement.
  app.post("/api/voice-cv/upload", requireRole("candidate"), enregistrer);

  // Écouter son propre CV vocal.
  app.get("/api/profile/cv-vocal", requireRole("candidate"), async (req, res) => {
    const profil = await storage.getCandidateProfile(req.session.userId!);
    const source = profil?.voiceCvUrl;
    if (!adresseAudioLisible(source)) return res.status(404).json({ message: "Aucun CV vocal enregistré" });
    return servirAudio(req, res, source!);
  });

  // Supprimer son CV vocal.
  app.delete("/api/profile/cv-vocal", requireRole("candidate"), async (req, res) => {
    await storage.updateCandidateProfile(req.session.userId!, { voiceCvUrl: null, voiceCvDuration: null, voiceCvTranscript: null, voiceCvWhatsappId: null });
    res.status(204).end();
  });

  // Recruteur (entreprise ou agence) : écouter le CV vocal actuel d'un
  // candidat qui a postulé à l'une de ses offres, et seulement dans ce cas.
  app.get("/api/candidates/:id/cv-vocal", requireAuth, async (req, res) => {
    const demandeur = await storage.getUser(req.session.userId!);
    if (!demandeur || (demandeur.userType !== "company" && demandeur.userType !== "agency")) {
      return res.status(403).json({ message: "Non autorisé" });
    }
    const candidatId = String(req.params.id);
    if (!(await storage.hasApplicationToOrganization(candidatId, demandeur.id))) {
      return res.status(403).json({ message: "Ce candidat n'a pas postulé à l'une de vos offres" });
    }
    const profil = await storage.getCandidateProfile(candidatId);
    if (!adresseAudioLisible(profil?.voiceCvUrl)) return res.status(404).json({ message: "Ce candidat n'a pas de CV vocal" });
    return servirAudio(req, res, profil!.voiceCvUrl!);
  });
}

/** Description du CV vocal pour une réponse JSON (jamais l'audio lui-même). */
export function cvVocalPourReponse(profil: { voiceCvUrl?: string | null; voiceCvDuration?: number | null } | null | undefined, url: string) {
  if (!adresseAudioLisible(profil?.voiceCvUrl)) return null;
  return { url, dureeSecondes: profil?.voiceCvDuration ?? null };
}
