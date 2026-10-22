import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import pgSession from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import geoip from "geoip-lite";
import { storage } from "./storage";
import { pool } from "./db";
import { requireAdmin, requireAdminPermission } from "./middlewares/adminPermissions";
import { uploadToObjectStorage, downloadFromObjectStorage, deleteFromObjectStorage, objectKeyFromUrl, readStoredFile, mimeForExtension } from "./objectStorage";
import { reportTemplates, buildReportWorkbook } from "./report-excel";
import { loadAgencyClientLabels, loadAgencyClientsById, registerAgencyCrmRoutes, resolveAgencyClient } from "./agency-crm";
import { registerAgencyCandidateRoutes } from "./agency-candidates";
import { registerAgencyRecruitmentRoutes } from "./agency-recruitment";
import { markOverdueInvoices, registerAgencyBillingRoutes } from "./agency-billing";
import { registerAgencyRelationsRoutes } from "./agency-relations";
import { sendEmail } from "./email";
import { saveReportFile, readReportFile } from "./report-storage";
import { insertUserSchema, loginSchema, insertJobPostingSchema, insertApplicationSchema, companyModuleTypes, operationalModuleKeys, applicationStatuses, invoiceStatuses, salaryPaymentStatuses, agencySubscriptionPlans, placementStatuses, candidateDocumentTypes, hasAdminPermission, adminAccountCreateSchema, adminLevelUpdateSchema, adminStatusUpdateSchema, prospectOrganizationCreateSchema, claimOrganizationSchema, prospectMatchCheckSchema, claimByContactSchema, adminManagedJobCreateSchema, type CompanyModuleType, type User, type AgencyProfile, type UserType, type ReportExport, type FieldMission, type FieldMissionStatus, type Application } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import { 
  generateJobEmbedding, 
  generateCandidateEmbedding, 
  cosineSimilarity, 
  similarityToPercentage,
  applyHybridFilters,
  type MatchingFilters 
} from "./embeddings";
import { findMatchingCandidatesSQL, findMatchingJobsSQL } from "./init-pgvector";
import { calculateMatchScore, explainMatchScore } from "@shared/matching";
import { debutEssaiPartenaire, estPartenaire, planAgenceEffectif } from "@shared/plans";
import { placementContractTypes } from "@shared/commissions";
import { demandeDemoSchema, typeContact } from "@shared/demande-demo";
import { chargerTauxApplicable, clientDeLAgence, registerAgencyCommissionRoutes } from "./agency-commissions";
import { ignorerLimitePourLesTests } from "./middlewares/limiteur-tests";
import { SECTEURS_ACCUEIL_BASE, type EmployeurQuiRecrute, type SecteurQuiRecrute } from "@shared/categories";
import { SECTEURS, secteurDeCategorie } from "@shared/secteurs";
import { employeurDepuisLigne } from "@shared/employeur";
import { lireParametresEmployeurs, rechercherEmployeurs } from "@shared/recherche-employeurs";
import { profilDepuisLigne } from "@shared/profil-employeur";
import { avisSchema, resumerAvis, type AvisPublic } from "@shared/avis";
import { offreDepuisLigne } from "@shared/offre";
import { DISPONIBILITES, PRETENTIONS, nomFichierCv, pretentionsStructurees } from "@shared/profil-candidat";
import { calculateProfileCompletion, etapesManquantes } from "@shared/completion-profil";
import type { CandidateProfile as ProfilCandidatBrut, User as UtilisateurBrut } from "@shared/schema";
import { INTERVALLE_RELANCE_JOURS, JOUR_MS, REPORT_RAPPEL_JOURS, SEUIL_RELANCE_JOURS, STATUTS_SANS_REPONSE, joursEcoules, libelleDuree } from "@shared/espace";
import { lireParametresOffres, rechercherOffres } from "@shared/recherche-offres";
import { salaryPeriods } from "@shared/schema";
import {
  parseWhatsAppWebhook,
  getMessagesFromWebhook,
  processVoiceCVMessage,
  sendWhatsAppMessage,
  type WhatsAppMessage,
} from "./whatsapp";
import { cvVocalPourReponse, registerCvVocalRoutes } from "./cv-vocal";
import { handleIncomingWhatsAppMessage, isAwaitingApplicationVoiceNote, deliverPendingWhatsAppNotifications, notifyApplicationStatusChange } from "./whatsapp-bot";

const BCRYPT_SALT_ROUNDS = 12;

declare module "express-session" {
  interface SessionData {
    userId: string;
    userType: UserType;
  }
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentification requise" });
  }
  next();
}

function requireRole(...roles: UserType[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentification requise" });
    }
    if (!req.session.userType || !roles.includes(req.session.userType)) {
      return res.status(403).json({ message: "Accès non autorisé pour ce rôle" });
    }
    next();
  };
}

// Gates the agency billing suite (invoices, commission/payment settings,
// salary payments) behind the paid "Agence Partenaire" plan. Assumes
// requireRole("agency") already ran. Plan is admin-managed (Super Admin
// dashboard) — there is no payment gateway integration in this project.
async function requirePartnerPlan(req: Request, res: Response, next: NextFunction) {
  const profile = await storage.getAgencyProfile(req.session.userId!);
  if (!estPartenaire(profile)) {
    return res.status(403).json({
      message: "Cette fonctionnalité fait partie du plan Agence Partenaire.",
      code: "PARTNER_PLAN_REQUIRED",
    });
  }
  next();
}

// Formulaire public de demande de démo : 5 envois par quart d'heure et par
// adresse IP, contre les envois en rafale.
const demoRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: ignorerLimitePourLesTests,
  message: { message: "Trop de demandes envoyées. Réessayez dans quelques minutes." },
});

const echapperHtml = (valeur: string) =>
  valeur.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // Tests automatisés hors production : voir middlewares/limiteur-tests.ts.
  skip: ignorerLimitePourLesTests,
  message: { message: "Trop de tentatives, veuillez réessayer plus tard." },
});

// Fields a user may edit on their own account through PATCH /api/profile.
// Anything role/system-controlled (isSuperAdmin, isVerified, userType, password, email)
// is deliberately excluded so this endpoint can't be used for privilege escalation.
const selfUserUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
}).strict();

const educationEntrySchema = z.object({
  id: z.string(),
  level: z.string(),
  institution: z.string(),
  degree: z.string(),
  startYear: z.string(),
  endYear: z.string(),
});

const certificationEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string(),
  obtainedDate: z.string(),
});

const experienceEntrySchema = z.object({
  id: z.string(),
  position: z.string(),
  company: z.string(),
  contractType: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  missionDescription: z.string(),
});

// Profil candidat tel que le candidat le reçoit (GET et PATCH
// /api/profile) : le CV en base64 est remplacé par l'adresse de
// GET /api/profile/cv ; s'y ajoutent la complétion calculée ici (même
// calcul que le client, shared/completion-profil.ts) et les prétentions
// structurées.
function profilCandidatPourLui(utilisateur: UtilisateurBrut, profil: ProfilCandidatBrut | undefined | null) {
  if (!profil) return null;
  const etapes = etapesManquantes(utilisateur, profil);
  return {
    ...profil,
    resumeUrl: profil.resumeUrl ? "/api/profile/cv" : null,
    voiceCvUrl: cvVocalPourReponse(profil, "/api/profile/cv-vocal")?.url ?? null,
    cvVocal: cvVocalPourReponse(profil, "/api/profile/cv-vocal"),
    profileEmbedding: undefined,
    pretentions: pretentionsStructurees(profil.salaryExpectation),
    completion: {
      pourcentage: calculateProfileCompletion(utilisateur, profil),
      sectionsManquantes: Array.from(new Set(etapes.map((e) => e.section))),
      etapesManquantes: etapes,
    },
  };
}

const candidateProfileSelfUpdateSchema = z.object({
  title: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  skills: z.array(z.string()).nullable().optional(),
  experience: z.string().nullable().optional(),
  education: z.string().nullable().optional(),
  languages: z.array(z.string()).nullable().optional(),
  // Valeurs de l'éditeur seulement (jamais du texte libre) ; une date
  // AAAA-MM-JJ reste acceptée pour la disponibilité ; "" efface.
  availableFrom: z.union([z.enum(DISPONIBILITES), z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).nullable().optional(),
  salaryExpectation: z.union([z.enum(PRETENTIONS), z.literal("")]).nullable().optional(),
  // Effacement seulement : un CV s'envoie par /api/profile/resume-chunk et
  // se lit par GET /api/profile/cv.
  resumeUrl: z.null().optional(),
  resumeFileName: z.string().nullable().optional(),
  resumeMimeType: z.string().nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
  preferredContact: z.string().nullable().optional(),
  // Only clearing is allowed here — setting real content goes through the
  // dedicated /api/voice-cv/upload pipeline (transcription + skill extraction).
  voiceCvUrl: z.null().optional(),
  voiceCvTranscript: z.null().optional(),
  educationEntries: z.array(educationEntrySchema).optional(),
  certifications: z.array(certificationEntrySchema).optional(),
  experiences: z.array(experienceEntrySchema).optional(),
}).strict();

const agencyProfileSelfUpdateSchema = z.object({
  agencyName: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  specializations: z.array(z.string()).nullable().optional(),
  website: z.string().nullable().optional(),
  licenseNumber: z.string().nullable().optional(),
  foundedYear: z.number().int().nullable().optional(),
  employeeCount: z.number().int().nullable().optional(),
  averageAge: z.number().int().nullable().optional(),
  genderRatioMale: z.number().int().nullable().optional(),
  visibleAccueil: z.boolean().optional(),
  // Une des 32 valeurs de shared/secteurs.ts. La vérification BaaraMatch
  // (verifiedAt, verifiedBy, verificationStatus) n'est jamais modifiable ici.
  secteur: z.enum(SECTEURS).nullable().optional(),
}).strict();

const companyProfileSelfUpdateSchema = z.object({
  companyName: z.string().min(1).optional(),
  industry: z.string().nullable().optional(),
  // Comme pour les agences : secteur choisi, jamais la vérification.
  secteur: z.enum(SECTEURS).nullable().optional(),
  description: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  employeeCount: z.string().nullable().optional(),
  foundedYear: z.number().int().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  siretNumber: z.string().nullable().optional(),
  vatNumber: z.string().nullable().optional(),
  billingAddress: z.string().nullable().optional(),
  visibleAccueil: z.boolean().optional(),
}).strict();

// Fields a company/agency owner may change on their own job posting.
// companyId/agencyId/viewCount/applicationCount/jobEmbedding are system-controlled.
const jobUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  requirements: z.array(z.string()).nullable().optional(),
  location: z.string().min(1).optional(),
  salaryRange: z.string().nullable().optional(),
  salaryMin: z.number().int().nullable().optional(),
  salaryMax: z.number().int().nullable().optional(),
  salaryCurrency: z.string().nullable().optional(),
  salaryPeriod: z.enum(salaryPeriods).nullable().optional(),
  jobType: z.string().min(1).optional(),
  category: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  requiredSkills: z.array(z.string()).nullable().optional(),
  preferredSkills: z.array(z.string()).nullable().optional(),
  experienceMin: z.number().int().nullable().optional(),
  experienceMax: z.number().int().nullable().optional(),
  educationLevel: z.string().nullable().optional(),
  languages: z.array(z.string()).nullable().optional(),
  benefits: z.array(z.string()).nullable().optional(),
  applicationDeadline: z.coerce.date().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  isRemote: z.boolean().optional(),
  isUrgent: z.boolean().optional(),
  positions: z.number().int().positive().optional(),
  visibleToAgencies: z.boolean().optional(),
  acceptsPlatformApplications: z.boolean().optional(),
}).strict();

// Fields a company/agency may change when reviewing a candidate's application.
// candidateId/jobId/agencyId/matchScore/coverLetter are not theirs to set.
const applicationUpdateSchema = z.object({
  status: z.enum(applicationStatuses).optional(),
  reviewerNotes: z.string().nullable().optional(),
  interviewDate: z.coerce.date().nullable().optional(),
  offeredSalary: z.number().int().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  statusHistory: z.array(z.string()).nullable().optional(),
}).strict();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const resumeChunkUploads = new Map<
    string,
    {
      userId: string;
      fileName: string;
      mimeType: string;
      totalChunks: number;
      chunks: (Buffer | null)[];
      createdAt: number;
    }
  >();

  const MAX_RESUME_BYTES = 5 * 1024 * 1024;
  const RESUME_UPLOAD_TTL_MS = 10 * 60 * 1000;

  const cleanupOldResumeUploads = () => {
    const now = Date.now();
    resumeChunkUploads.forEach((value, key) => {
      if (now - value.createdAt > RESUME_UPLOAD_TTL_MS) {
        resumeChunkUploads.delete(key);
      }
    });
  };

  
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }
  
  const PgStore = pgSession(session);
  
  app.use(
    session({
      store: new PgStore({
        pool: pool,
        tableName: "user_sessions",
        createTableIfMissing: true,
      }),
      secret: sessionSecret || "baaramatch-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );

  app.post("/api/auth/register", authRateLimiter, async (req, res) => {
    try {
      const { confirmPassword, ...userData } = req.body;
      const validatedData = insertUserSchema.parse(userData);
      
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }

      const hashedPassword = await hashPassword(validatedData.password);
      const user = await storage.createUser({
        ...validatedData,
        // users.country has a DB default of "Sénégal": store null when the
        // person picked no country instead of silently inventing one.
        country: validatedData.country || null,
        password: hashedPassword,
      });

      if (user.userType === "candidate") {
        await storage.createCandidateProfile({
          userId: user.id,
          title: null,
          bio: null,
          skills: null,
          experience: null,
          education: null,
          languages: null,
          availableFrom: null,
          salaryExpectation: null,
          resumeUrl: null,
        });
      } else if (user.userType === "agency") {
        await storage.createAgencyProfile({
          userId: user.id,
          agencyName: user.fullName,
          description: null,
          specializations: null,
          website: null,
          licenseNumber: null,
          candidatesPlaced: 0,
          // Offre de lancement : 60 jours en Partenaire (shared/plans.ts).
          ...debutEssaiPartenaire(),
        });
      } else if (user.userType === "company") {
        await storage.createCompanyProfile({
          userId: user.id,
          companyName: user.fullName,
          industry: null,
          description: null,
          website: null,
          employeeCount: null,
          foundedYear: null,
          logoUrl: null,
        });
      }

      req.session.userId = user.id;
      req.session.userType = user.userType;
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
  });

  // Detailed organization signup (company/agency) — complements, doesn't
  // replace, the Sprint 0 /api/auth/register above (still used by
  // candidates, and as a lighter fallback). Collects real organization
  // fields upfront (industry, RCCM...) that the basic flow only asks for
  // later via profile editing, and adds pilot invitation-code redemption.
  //
  // Adaptation from spec: this app's whole auth system (sessions, login,
  // every existing account) is email+password, not phone-based — there is
  // no phone login anywhere in the codebase. Rather than rearchitect auth,
  // email stays the required login identifier; phone is collected and
  // stored (it already exists on users, used for WhatsApp features)
  // alongside it, not instead of it.
  //
  // Also no separate "Organisation" / "MembreOrganisation" join tables:
  // this app models a company/agency as a 1:1 profile row on the user
  // itself (single owner per org, not multi-member) — company_profiles /
  // agency_profiles already *are* the organization record.
  const registerOrganizationSchema = z.object({
    accountType: z.enum(["company", "agency"]),
    email: z.string().email(),
    phone: z.string().min(6),
    contactName: z.string().min(1),
    password: z.string().min(6),
    companyName: z.string().min(1),
    industry: z.string().min(1),
    city: z.string().min(1),
    rccmNumber: z.string().optional(),
    invitationCode: z.string().optional(),
  });

  app.post("/api/auth/register-organization", authRateLimiter, async (req, res) => {
    try {
      const body = registerOrganizationSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(body.email);
      if (existingUser) {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }

      // Validate the invitation code BEFORE creating anything — an invalid
      // code must fail loudly, never silently fall back to freemium.
      let invitationCode: Awaited<ReturnType<typeof storage.getInvitationCodeByCode>> = undefined;
      if (body.invitationCode) {
        invitationCode = await storage.getInvitationCodeByCode(body.invitationCode);
        if (!invitationCode || invitationCode.isUsed) {
          return res.status(400).json({ message: "Ce code d'invitation n'est pas valide ou a déjà été utilisé." });
        }
        if (body.accountType !== "agency") {
          return res.status(400).json({ message: "Ce code d'invitation est réservé aux agences." });
        }
      }

      const hashedPassword = await hashPassword(body.password);
      const user = await storage.createUser({
        email: body.email,
        password: hashedPassword,
        userType: body.accountType,
        fullName: body.contactName,
        phone: body.phone,
        city: body.city,
      });

      let obtainedPlan: "standard" | "partner" | null = null;

      if (body.accountType === "agency") {
        await storage.createAgencyProfile({
          userId: user.id,
          agencyName: body.companyName,
          description: null,
          specializations: null,
          website: null,
          licenseNumber: null,
          candidatesPlaced: 0,
        });
        await storage.updateAgencyProfile(user.id, {
          rccmNumber: body.rccmNumber ?? null,
          // Le secteur saisi à l'inscription était perdu pour les agences
          // (pas de champ industry) : rattaché aux 32 secteurs s'il correspond.
          secteur: secteurDeCategorie(body.industry),
          // Offre de lancement : essai Partenaire de 60 jours ; un code
          // d'invitation impose son propre plan et sa propre durée.
          ...(invitationCode ? {
            subscriptionPlan: invitationCode.targetPlan,
            subscriptionUpdatedAt: new Date(),
            partnerTrialEndsAt: new Date(Date.now() + invitationCode.trialDays * 24 * 60 * 60 * 1000),
          } : debutEssaiPartenaire()),
        });
        obtainedPlan = invitationCode ? invitationCode.targetPlan : "partner";

        if (invitationCode) {
          await storage.markInvitationCodeUsed(invitationCode.id, user.id);
        }
      } else {
        await storage.createCompanyProfile({
          userId: user.id,
          companyName: body.companyName,
          industry: body.industry,
          secteur: secteurDeCategorie(body.industry),
          description: null,
          website: null,
          employeeCount: null,
          foundedYear: null,
          logoUrl: null,
        });
        await storage.updateCompanyProfile(user.id, { rccmNumber: body.rccmNumber ?? null });
      }

      await storage.createActivityLog({
        action: "organization_registered",
        userId: user.id,
        userLabel: user.email,
        ipAddress: req.ip ?? null,
        status: "success",
        details: `Inscription ${body.accountType === "agency" ? "agence" : "entreprise"} "${body.companyName}"${obtainedPlan ? ` — plan obtenu : ${obtainedPlan}` : ""}`,
      });

      req.session.userId = user.id;
      req.session.userType = user.userType;
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ ...userWithoutPassword, obtainedPlan });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Organization registration error:", error);
      res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
  });

  app.post("/api/auth/login", authRateLimiter, async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        await storage.createActivityLog({
          action: "login_failed",
          userId: null,
          userLabel: validatedData.email,
          ipAddress: req.ip ?? null,
          status: "error",
          details: "Email inconnu",
        });
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      const isValidPassword = await verifyPassword(validatedData.password, user.password);
      if (!isValidPassword) {
        await storage.createActivityLog({
          action: "login_failed",
          userId: user.id,
          userLabel: user.email,
          ipAddress: req.ip ?? null,
          status: "error",
          details: "Mot de passe incorrect",
        });
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      let adminProfile: { adminLevel: string; isActive: boolean | null } | undefined;
      if (user.userType === "admin") {
        adminProfile = await storage.getAdminProfile(user.id);
        if (adminProfile?.isActive === false) {
          await storage.createActivityLog({
            action: "login_failed",
            userId: user.id,
            userLabel: user.email,
            ipAddress: req.ip ?? null,
            status: "error",
            details: "Compte administrateur désactivé",
          });
          return res.status(403).json({ message: "Ce compte administrateur a été désactivé" });
        }
      }

      req.session.userId = user.id;
      req.session.userType = user.userType;
      await storage.createActivityLog({
        action: "login",
        userId: user.id,
        userLabel: user.email,
        ipAddress: req.ip ?? null,
        status: "success",
        details: "Connexion réussie",
      });
      const { password: _, ...userWithoutPassword } = user;
      res.json(adminProfile ? { ...userWithoutPassword, adminLevel: adminProfile.adminLevel } : userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Erreur lors de la connexion" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const userId = req.session.userId;
    if (userId) {
      const user = await storage.getUser(userId);
      if (user) {
        await storage.createActivityLog({
          action: "logout",
          userId: user.id,
          userLabel: user.email,
          ipAddress: req.ip ?? null,
          status: "success",
          details: "Déconnexion",
        });
      }
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erreur lors de la déconnexion" });
      }
      res.json({ message: "Déconnexion réussie" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    // Visiteur sans session : réponse normale « personne », pas une erreur.
    // Un 401 ici s'affichait en erreur dans la console de chaque visiteur
    // de l'accueil (Lighthouse, bonnes pratiques).
    if (!req.session.userId) {
      return res.json(null);
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Utilisateur non trouvé" });
    }

    const { password: _, ...userWithoutPassword } = user;
    if (user.userType === "admin") {
      const adminProfile = await storage.getAdminProfile(user.id);
      return res.json({ ...userWithoutPassword, adminLevel: adminProfile?.adminLevel ?? null });
    }
    res.json(userWithoutPassword);
  });

  // Demande de démo (page /services). Champ piège rempli = robot : on répond
  // comme si tout allait bien, sans rien enregistrer. La demande est visible
  // dans la console admin (Supervision → Demandes de démo) ; l'équipe est en
  // plus prévenue par e-mail si DEMO_NOTIFICATION_EMAIL est défini (plus de
  // repli vers contact@baaramatch.africa : ce domaine n'a pas de messagerie,
  // l'envoi échouait en 550). Sans SMTP configuré, sendEmail se contente
  // d'un avertissement au journal.
  app.post("/api/demo-requests", demoRateLimiter, async (req, res) => {
    try {
      const data = demandeDemoSchema.parse(req.body);
      if (data.siteWeb?.trim()) {
        return res.status(201).json({ ok: true });
      }
      const estEmail = typeContact(data.contact) === "email";
      const demoRequest = await storage.createDemoRequest({
        fullName: data.fullName,
        company: data.company,
        email: estEmail ? data.contact : null,
        phone: estEmail ? null : data.contact,
        profileType: data.profileType,
        message: null,
      });
      const libelleProfil = data.profileType === "agence" ? "Agence de placement" : "Entreprise";
      const destinataire = process.env.DEMO_NOTIFICATION_EMAIL?.trim();
      if (!destinataire) {
        console.warn("[demo] DEMO_NOTIFICATION_EMAIL non défini : pas d'e-mail, la demande est dans la console admin.");
      } else sendEmail({
        to: destinataire,
        subject: `Demande de démo : ${data.company}`,
        replyTo: estEmail ? data.contact : undefined,
        html: `<p>Nouvelle demande de démo depuis la page Services.</p>
          <ul>
            <li>Nom : ${echapperHtml(data.fullName)}</li>
            <li>${libelleProfil} : ${echapperHtml(data.company)}</li>
            <li>${estEmail ? "E-mail" : "Téléphone"} : ${echapperHtml(data.contact)}</li>
          </ul>`,
      }).catch((err) => console.error("[demo] Notification non envoyée :", err));
      res.status(201).json({ id: demoRequest.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error creating demo request:", error);
      res.status(500).json({ message: "La demande n'a pas pu être enregistrée. Réessayez dans un instant." });
    }
  });

  app.get("/api/admin/overview", requireAdmin, async (_req, res) => {
    try {
      const [companies, agencies, candidates, admins] = await Promise.all([
        storage.getAllCompanies(),
        storage.getAllAgencies(),
        storage.getAllCandidates(),
        pool.query("select id, email, full_name, created_at from users where user_type = 'admin' order by created_at desc"),
      ]);

      const companiesWithModules = await Promise.all(
        companies.map(async (company) => {
          const profileId = company.profile?.id;
          if (!profileId) {
            return false;
          }
          const modules = await storage.getCompanyModules(profileId);
          return modules.length > 0;
        }),
      );

      const allUsers = [
        ...companies,
        ...agencies,
        ...candidates,
        ...(admins.rows as Array<{ id: string; email: string; full_name: string; created_at: string }>),
      ];

      const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "short" });
      const growthMap = new Map<string, { month: string; candidates: number; companies: number; agencies: number; admins: number }>();

      for (let offset = 5; offset >= 0; offset -= 1) {
        const date = new Date();
        date.setMonth(date.getMonth() - offset);
        date.setDate(1);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        growthMap.set(key, {
          month: monthFormatter.format(date),
          candidates: 0,
          companies: 0,
          agencies: 0,
          admins: 0,
        });
      }

      for (const user of allUsers) {
        const createdAt = new Date((user as any).createdAt ?? (user as any).created_at ?? Date.now());
        const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
        const entry = growthMap.get(key);
        if (!entry) {
          continue;
        }

        const userType = (user as any).userType ?? "admin";
        if (userType === "candidate") entry.candidates += 1;
        if (userType === "company") entry.companies += 1;
        if (userType === "agency") entry.agencies += 1;
        if (userType === "admin") entry.admins += 1;
      }

      const recentCompanies = companies
        .sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime())
        .slice(0, 5)
        .map((company, index) => ({
          id: company.id,
          name: company.profile?.companyName ?? company.fullName,
          industry: company.profile?.industry ?? "Non défini",
          status: company.isVerified ? "active" : "pending",
          contact: company.email,
          createdAt: company.createdAt,
          modulesEnabled: companiesWithModules[index] ? true : false,
        }));

      const moduleUsageCounts = Object.fromEntries(companyModuleTypes.map((type) => [type, 0]));
      for (const company of companies) {
        if (!company.profile?.id) {
          continue;
        }
        const modules = await storage.getCompanyModules(company.profile.id);
        for (const module of modules) {
          moduleUsageCounts[module.moduleType] += 1;
        }
      }

      res.json({
        stats: {
          totalCompanies: companies.length,
          activeCompanies: companies.filter((company) => company.isVerified).length,
          totalAgencies: agencies.length,
          totalUsers: companies.length + agencies.length + candidates.length + admins.rows.length,
          companiesWithModules: companiesWithModules.filter(Boolean).length,
          pendingVerifications: [...companies, ...agencies].filter((user) => !user.isVerified).length,
        },
        recentCompanies,
        userGrowth: Array.from(growthMap.values()),
        moduleUsage: companyModuleTypes.map((moduleType) => ({
          moduleType,
          count: moduleUsageCounts[moduleType],
        })),
      });
    } catch (error) {
      console.error("Admin overview error:", error);
      res.status(500).json({ message: "Erreur lors du chargement du tableau de bord admin" });
    }
  });

  // Vérification d'un employeur (agence ou entreprise) par l'équipe
  // BaaraMatch : seule source du badge « Employeur vérifié » de la page
  // Offres. Réversible, journalisée.
  app.patch("/api/admin/employeurs/:id/verification", requireAdmin, requireAdminPermission("organisations:gerer"), async (req, res) => {
    try {
      const { verifie } = z.object({ verifie: z.boolean() }).strict().parse(req.body);
      const employeur = await storage.getUser(String(req.params.id));
      if (!employeur || (employeur.userType !== "agency" && employeur.userType !== "company")) {
        return res.status(404).json({ message: "Employeur non trouvé" });
      }
      const admin = req.adminUser;
      const ok = await storage.setEmployeurVerifie(employeur.id, employeur.userType, verifie ? (admin?.id ?? req.session.userId ?? "admin") : null);
      if (!ok) return res.status(404).json({ message: "Profil employeur introuvable" });
      await storage.createActivityLog({
        action: "settings_change",
        userId: admin?.id ?? null,
        userLabel: admin?.email ?? "admin",
        ipAddress: req.ip ?? null,
        status: "success",
        details: `${employeur.fullName} ${verifie ? "vérifié" : "n'est plus vérifié"} par BaaraMatch`,
      });
      res.json({ employeurId: employeur.id, verifie });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Admin employer verification error:", error);
      res.status(500).json({ message: "Erreur lors de la vérification de l'employeur" });
    }
  });

  // Console admin : avis de candidats à modérer (masqués compris).
  app.get("/api/admin/avis", requireAdmin, async (_req, res) => {
    try {
      res.json(await storage.getAvisAdmin());
    } catch (error) {
      console.error("Admin reviews error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des avis" });
    }
  });

  // Console admin : demandes de démo reçues depuis la page Services.
  app.get("/api/admin/demo-requests", requireAdmin, requireAdminPermission("organisations:gerer"), async (_req, res) => {
    try {
      res.json(await storage.getDemandesDemo());
    } catch (error) {
      console.error("Admin demo requests error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des demandes de démo" });
    }
  });

  // Marquer une demande comme traitée (ou la rouvrir), journalisé.
  app.patch("/api/admin/demo-requests/:id", requireAdmin, requireAdminPermission("organisations:gerer"), async (req, res) => {
    try {
      const { traitee } = z.object({ traitee: z.boolean() }).strict().parse(req.body);
      const admin = req.adminUser;
      const demande = await storage.traiterDemandeDemo(String(req.params.id), traitee ? (admin?.id ?? req.session.userId ?? "admin") : null);
      if (!demande) return res.status(404).json({ message: "Demande introuvable" });
      await storage.createActivityLog({
        action: "settings_change",
        userId: admin?.id ?? null,
        userLabel: admin?.email ?? "admin",
        ipAddress: req.ip ?? null,
        status: "success",
        details: `Demande de démo de ${demande.company} ${traitee ? "traitée" : "rouverte"}`,
      });
      res.json(demande);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Données invalides", errors: error.errors });
      console.error("Admin demo request update error:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour de la demande" });
    }
  });

  // Masquer ou rétablir un avis de candidat (modération), journalisé.
  app.patch("/api/admin/avis/:id", requireAdmin, async (req, res) => {
    try {
      const { masque } = z.object({ masque: z.boolean() }).strict().parse(req.body);
      const avis = await storage.masquerAvisEmployeur(String(req.params.id), masque);
      if (!avis) return res.status(404).json({ message: "Avis introuvable" });
      const admin = req.adminUser;
      await storage.createActivityLog({
        action: "settings_change",
        userId: admin?.id ?? null,
        userLabel: admin?.email ?? "admin",
        ipAddress: req.ip ?? null,
        status: "success",
        details: `Avis ${String(req.params.id)} ${masque ? "masqué" : "rétabli"} (employeur ${avis.employeurId})`,
      });
      res.json({ id: String(req.params.id), masque });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Données invalides", errors: error.errors });
      console.error("Admin review moderation error:", error);
      res.status(500).json({ message: "Erreur lors de la modération de l'avis" });
    }
  });

  app.get("/api/admin/companies", requireAdmin, async (_req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      const result = await Promise.all(
        companies.map(async (company) => {
          const modules = company.profile?.id ? await storage.getCompanyModules(company.profile.id) : [];
          return {
            id: company.id,
            profileId: company.profile?.id ?? null,
            name: company.profile?.companyName ?? company.fullName,
            industry: company.profile?.industry ?? "Non défini",
            employeeCount: company.profile?.employeeCount ?? "Non défini",
            status: company.isVerified ? "active" : "pending",
            verifiedAt: company.profile?.verifiedAt ?? null,
            createdAt: company.createdAt,
            contact: company.email,
            country: company.country,
            city: company.city,
            modules: modules.map((module) => module.moduleType),
          };
        }),
      );

      res.json(result);
    } catch (error) {
      console.error("Admin companies error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des entreprises" });
    }
  });

  app.patch("/api/admin/companies/:id/modules", requireAdmin, async (req, res) => {
    try {
      const validatedBody = z.object({
        modules: z.array(z.enum(companyModuleTypes)).default([]),
      }).parse(req.body);

      const company = await storage.getUser(req.params.id as string);
      if (!company || company.userType !== "company") {
        return res.status(404).json({ message: "Entreprise non trouvée" });
      }

      const profile = await storage.getCompanyProfile(company.id);
      if (!profile) {
        return res.status(404).json({ message: "Profil entreprise introuvable" });
      }

      const modules = await storage.replaceCompanyModules(
        profile.id,
        validatedBody.modules as CompanyModuleType[],
        req.session.userId,
      );

      const admin = req.adminUser;
      await storage.createActivityLog({
        action: "module_toggle",
        userId: admin?.id ?? null,
        userLabel: admin?.email ?? "admin",
        ipAddress: req.ip ?? null,
        status: "success",
        details: `Modules mis à jour pour ${profile.companyName}: ${modules.map((module) => module.moduleType).join(", ") || "aucun"}`,
      });

      res.json({
        companyId: company.id,
        modules: modules.map((module) => module.moduleType),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Admin update modules error:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour des modules" });
    }
  });

  app.get("/api/admin/moderation", requireAdmin, requireAdminPermission("offres:valider"), async (_req, res) => {
    try {
      const items = await storage.listModerationItems();
      res.json(items);
    } catch (error) {
      console.error("Admin moderation list error:", error);
      res.status(500).json({ message: "Erreur lors du chargement de la file de modération" });
    }
  });

  app.patch("/api/admin/moderation/:id", requireAdmin, async (req, res) => {
    try {
      const validatedBody = z.object({
        status: z.enum(["approved", "rejected"]),
      }).parse(req.body);

      const requiredPermission = validatedBody.status === "approved" ? "offres:valider" : "offres:rejeter";
      if (!hasAdminPermission(req.adminProfile?.adminLevel, requiredPermission)) {
        return res.status(403).json({ message: `Permission "${requiredPermission}" requise` });
      }

      const item = await storage.updateModerationItemStatus(
        req.params.id as string,
        validatedBody.status,
        req.session.userId!,
      );

      if (!item) {
        return res.status(404).json({ message: "Élément de modération introuvable" });
      }

      // Resolving the queue row has no effect on its own — the underlying
      // record must actually change, or "approve" would just relabel a
      // hidden job without ever publishing it.
      if (item.targetType === "job" && item.targetEntityId) {
        // validatedAt marks the job as reviewed once: it stops counting as
        // "pending moderation" and can then be closed/reopened freely.
        const updatedJob = await storage.updateJobPosting(item.targetEntityId, validatedBody.status === "approved"
          ? { isActive: true, validatedAt: new Date(), validatedByAdminId: req.adminProfile?.id ?? null }
          : { isActive: false });
        if (validatedBody.status === "approved" && updatedJob) {
          notifyMatchingCandidatesForJob(updatedJob);
          notifierAbonnesEmployeur(updatedJob);
        }
        // Tell the poster the outcome — the submission screen promises a
        // reply, and the queue resolution is otherwise silent for them.
        // Best-effort: a failed notification must not undo the moderation.
        if (updatedJob && item.targetUserId) {
          try {
            await storage.createNotification({
              userId: item.targetUserId,
              type: "system",
              title: validatedBody.status === "approved"
                ? `Votre offre « ${updatedJob.title} » est en ligne`
                : `Votre offre « ${updatedJob.title} » n'a pas été validée`,
              message: validatedBody.status === "approved"
                ? "L'équipe BaaraMatch a validé votre offre : elle est désormais visible par les candidats."
                : "L'équipe BaaraMatch n'a pas validé votre offre en l'état. Contactez le support BaaraMatch pour connaître les modifications nécessaires.",
              actionUrl: item.targetUserType === "company" ? "/company/jobs" : "/agency/missions",
            });
          } catch (notifyError) {
            console.error(`[moderation] Could not notify poster of job ${updatedJob.id}:`, notifyError);
          }
        }
      }

      await storage.createActivityLog({
        action: "moderation",
        userId: req.adminUser?.id ?? null,
        userLabel: req.adminUser?.email ?? "admin",
        ipAddress: req.ip ?? null,
        status: validatedBody.status === "approved" ? "success" : "warning",
        details: `${validatedBody.status === "approved" ? "Approuvé" : "Rejeté"}: ${item.targetLabel} (${item.reason})`,
      });

      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Admin moderation update error:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour de la modération" });
    }
  });

  // WhatsApp status notifications stuck outside Meta's 24h window with no
  // usable template (see whatsapp-bot.ts) — read-only, so the team can call
  // the candidate when the wait gets too long. Names + phone numbers, hence
  // the same permission as full candidate profiles.
  app.get("/api/admin/whatsapp-notifications/pending", requireAdmin, requireAdminPermission("candidats:consulter_profil_complet"), async (_req, res) => {
    try {
      res.json(await storage.listPendingWindowWhatsAppNotifications());
    } catch (error) {
      console.error("Admin pending WhatsApp notifications error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des notifications WhatsApp en attente" });
    }
  });

  // ============================================
  // ADMIN DASHBOARD & RAPPORTS
  // ============================================

  // Live counters — direct, cheap counts at today's volume; no caching or
  // pre-aggregation needed. Contrast with /metrics below, which reads
  // pre-aggregated history instead of ever recomputing it on read.
  // ---- Pilot invitation codes ----
  // Self-service "Agence Partenaire" trial activation for pilot agencies —
  // an admin generates a code and hands it over off-platform; redeeming it
  // at registration skips the manual per-account plan toggle. Scoped to
  // agencies only: companies have no subscription tier in this app.

  async function generateUniqueInvitationCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
      const candidate = `PILOTE-${suffix}`;
      const existing = await storage.getInvitationCodeByCode(candidate);
      if (!existing) return candidate;
    }
    throw new Error("Impossible de générer un code unique après plusieurs tentatives");
  }

  app.post("/api/admin/invitation-codes", requireAdmin, requireAdminPermission("organisations:gerer"), async (req, res) => {
    try {
      const body = z.object({
        targetPlan: z.enum(agencySubscriptionPlans).default("partner"),
        trialDays: z.number().int().positive().default(60),
      }).parse(req.body);

      const code = await generateUniqueInvitationCode();
      const created = await storage.createInvitationCode({
        code,
        targetPlan: body.targetPlan,
        trialDays: body.trialDays,
        createdByAdminId: req.session.userId!,
      });
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error creating invitation code:", error);
      res.status(500).json({ message: "Erreur lors de la génération du code" });
    }
  });

  app.get("/api/admin/invitation-codes", requireAdmin, requireAdminPermission("organisations:gerer"), async (_req, res) => {
    try {
      const codes = await storage.listInvitationCodes();
      res.json(codes);
    } catch (error) {
      console.error("Error listing invitation codes:", error);
      res.status(500).json({ message: "Erreur lors du chargement des codes" });
    }
  });

  app.get("/api/admin/dashboard/kpis", requireAdmin, async (_req, res) => {
    try {
      const kpis = await storage.getDashboardKpis();
      res.json(kpis);
    } catch (error) {
      console.error("Dashboard KPIs error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des indicateurs" });
    }
  });

  // Time series for charts, read from daily_metrics (populated by the
  // nightly aggregation job) — never recomputed from raw tables on read.
  app.get("/api/admin/dashboard/metrics", requireAdmin, async (req, res) => {
    try {
      const key = String(req.query.key ?? "");
      if (!key) {
        return res.status(400).json({ message: "Le paramètre 'key' est requis" });
      }
      const from = req.query.from ? new Date(String(req.query.from)) : new Date(0);
      const to = req.query.to ? new Date(String(req.query.to)) : new Date();
      // Omitted = platform-wide total (organizationId null), never "every
      // org's row unfiltered" — summing the global row together with every
      // org's own row would double-count.
      const organizationId = req.query.organizationId ? String(req.query.organizationId) : null;

      const series = await storage.getMetricsSeries(key, from, to, organizationId);
      res.json(series);
    } catch (error) {
      console.error("Dashboard metrics error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des métriques" });
    }
  });

  // ---- Site visit tracking (Super Admin analytics: visitors, time on
  // site, country) ----
  // POST is public and unauthenticated by design — it's called by every
  // visitor's browser, logged in or not. Never let it fail the page: any
  // error here is swallowed after logging, since a dropped analytics beacon
  // must not be visible to a real visitor. Country comes from a local
  // GeoIP lookup (geoip-lite) on req.ip, not a third-party API — no
  // external call, no IP shared off-server.
  app.post("/api/analytics/visit", async (req, res) => {
    try {
      const visitorId = typeof req.body?.visitorId === "string" ? req.body.visitorId : null;
      if (!visitorId) {
        return res.sendStatus(204);
      }
      const ip = (req.ip ?? "").replace("::ffff:", "");
      const lookup = ip ? geoip.lookup(ip) : null;
      await storage.recordSiteVisit(visitorId, lookup?.country ?? null, new Date());
      res.sendStatus(204);
    } catch (error) {
      console.error("Error recording site visit:", error);
      res.sendStatus(204);
    }
  });

  app.get("/api/admin/analytics/visitors", requireAdmin, async (req, res) => {
    try {
      const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = req.query.to ? new Date(String(req.query.to)) : new Date();

      const [visitorsPerDay, avgDurationSeconds, countryBreakdown] = await Promise.all([
        storage.getVisitorsPerDay(from, to),
        storage.getAverageVisitDurationSeconds(from, to),
        storage.getVisitorCountryBreakdown(from, to),
      ]);

      const countryNames = new Intl.DisplayNames(["fr"], { type: "region" });
      const totalVisitors = visitorsPerDay.reduce((sum, day) => sum + day.value, 0);
      const countries = countryBreakdown.map((row) => ({
        code: row.country,
        name: row.country === "Inconnu" ? "Inconnu" : (countryNames.of(row.country) ?? row.country),
        count: row.count,
        percentage: totalVisitors === 0 ? 0 : Math.round((row.count / totalVisitors) * 100),
      }));

      res.json({ visitorsPerDay, totalVisitors, avgDurationSeconds, countries });
    } catch (error) {
      console.error("Visitor analytics error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des statistiques de visite" });
    }
  });

  // Live groupBy on applications.status — reasonable volume, no
  // pre-aggregation needed here either.
  app.get("/api/admin/dashboard/application-funnel", requireAdmin, async (req, res) => {
    try {
      const jobId = req.query.jobId ? String(req.query.jobId) : undefined;
      const funnel = await storage.getApplicationFunnel(jobId);
      res.json(funnel);
    } catch (error) {
      console.error("Dashboard funnel error:", error);
      res.status(500).json({ message: "Erreur lors du chargement du funnel de candidatures" });
    }
  });

  app.get("/api/admin/dashboard/top-employers", requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 5, 20);
      const employers = await storage.getTopEmployersByJobCount(limit);
      res.json(employers);
    } catch (error) {
      console.error("Top employers error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des top employeurs" });
    }
  });

  // "Profils recherchés" = the métier/category breakdown of real job
  // postings (demand side) — not literal candidate-profile page views,
  // which nothing in the app tracks today.
  app.get("/api/admin/dashboard/top-job-categories", requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 5, 20);
      const categories = await storage.getTopJobCategories(limit);
      res.json(categories);
    } catch (error) {
      console.error("Top job categories error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des profils recherchés" });
    }
  });

  app.get("/api/admin/dashboard/top-visited-organizations", requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 5, 20);
      const organizations = await storage.getTopVisitedOrganizations(limit);
      res.json(organizations);
    } catch (error) {
      console.error("Top visited organizations error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des organisations les plus visitées" });
    }
  });

  app.get("/api/admin/reports/templates", requireAdmin, async (_req, res) => {
    res.json(reportTemplates);
  });

  function serializeReportExport(report: ReportExport) {
    return {
      id: report.id,
      type: report.type,
      parameters: report.parameters,
      status: report.status,
      error: report.error,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      // Never the raw disk filename — only ever the authenticated route.
      downloadUrl: report.status === "termine" ? `/api/admin/reports/${report.id}/download` : null,
    };
  }

  app.post("/api/admin/reports/generer", requireAdmin, async (req, res) => {
    try {
      const body = z.object({
        type: z.string().min(1),
        parametres: z.record(z.unknown()),
      }).parse(req.body);

      const report = await storage.createReportExport({
        type: body.type,
        parameters: body.parametres,
        requestedByAdminId: req.adminProfile!.id,
      });

      // Same API contract a real queue would have: respond immediately with
      // the id, run generation after the response is sent. Swapping in
      // BullMQ (or similar) later changes nothing on the frontend.
      res.status(202).json(serializeReportExport(report));

      setImmediate(async () => {
        try {
          await storage.updateReportExport(report.id, { status: "en_cours" });
          const workbook = await buildReportWorkbook(body.type, body.parametres);
          const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
          const filename = await saveReportFile(report.id, buffer);
          await storage.updateReportExport(report.id, { status: "termine", fileUrl: filename });
        } catch (genError) {
          console.error("Report generation failed:", genError);
          await storage.updateReportExport(report.id, {
            status: "echec",
            error: genError instanceof Error ? genError.message : "Erreur inconnue",
          });
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Report generation request error:", error);
      res.status(500).json({ message: "Erreur lors de la création du rapport" });
    }
  });

  app.get("/api/admin/reports/:id", requireAdmin, async (req, res) => {
    try {
      const report = await storage.getReportExport(req.params.id as string);
      if (!report) {
        return res.status(404).json({ message: "Rapport introuvable" });
      }
      const isOwner = report.requestedByAdminId === req.adminProfile!.id;
      const isSuperAdmin = req.adminProfile!.adminLevel === "super_admin";
      if (!isOwner && !isSuperAdmin) {
        return res.status(403).json({ message: "Non autorisé" });
      }
      res.json(serializeReportExport(report));
    } catch (error) {
      console.error("Report status error:", error);
      res.status(500).json({ message: "Erreur lors du chargement du rapport" });
    }
  });

  app.get("/api/admin/reports", requireAdmin, async (req, res) => {
    try {
      const isSuperAdmin = req.adminProfile!.adminLevel === "super_admin";
      const reports = await storage.listReportExports(isSuperAdmin ? undefined : req.adminProfile!.id);
      res.json(reports.map(serializeReportExport));
    } catch (error) {
      console.error("Report history error:", error);
      res.status(500).json({ message: "Erreur lors du chargement de l'historique des rapports" });
    }
  });

  app.get("/api/admin/reports/:id/download", requireAdmin, async (req, res) => {
    try {
      const report = await storage.getReportExport(req.params.id as string);
      if (!report || report.status !== "termine" || !report.fileUrl) {
        return res.status(404).json({ message: "Fichier non disponible" });
      }
      const isOwner = report.requestedByAdminId === req.adminProfile!.id;
      const isSuperAdmin = req.adminProfile!.adminLevel === "super_admin";
      if (!isOwner && !isSuperAdmin) {
        return res.status(403).json({ message: "Non autorisé" });
      }
      const buffer = await readReportFile(report.fileUrl);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${report.type}-${report.id}.xlsx"`);
      res.send(buffer);
    } catch (error) {
      console.error("Report download error:", error);
      res.status(500).json({ message: "Erreur lors du téléchargement du rapport" });
    }
  });

  // Reserved to super_admin ("admins:gerer" is only ever true via the "*"
  // wildcard) — this is the journal an admin's own access gets recorded
  // into, so it must not be readable by the admins it's watching.
  app.get("/api/admin/logs", requireAdmin, requireAdminPermission("admins:gerer"), async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 200, 500);
      const logs = await storage.listActivityLogs({
        limit,
        action: (req.query.action as string) || undefined,
        targetType: (req.query.targetType as string) || undefined,
        targetId: (req.query.targetId as string) || undefined,
        userId: (req.query.userId as string) || undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      });
      res.json(logs);
    } catch (error) {
      console.error("Admin logs error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des logs" });
    }
  });

  // Dedicated candidate list for admin — deliberately minimal fields only
  // (name, city, métier recherché, verification, date). Full profile (CV,
  // skills, salary expectation) is never returned from a list; it's only
  // reachable, one candidate at a time, through the permission-gated,
  // audit-logged GET /api/admin/candidates/:id below.
  app.get("/api/admin/candidates", requireAdmin, async (_req, res) => {
    try {
      const candidates = await storage.getAllCandidates();
      res.json(
        candidates.map((candidate) => ({
          id: candidate.id,
          name: candidate.fullName,
          email: candidate.email,
          city: candidate.city,
          country: candidate.country,
          status: candidate.isVerified ? "verified" : "pending",
          title: candidate.profile?.title ?? null,
          createdAt: candidate.createdAt,
        })),
      );
    } catch (error) {
      console.error("Admin candidates error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des candidats" });
    }
  });

  app.get("/api/admin/agencies", requireAdmin, async (_req, res) => {
    try {
      const agencies = await storage.getAllAgencies();
      res.json(
        agencies.map((agency) => ({
          id: agency.id,
          name: agency.profile?.agencyName ?? agency.fullName,
          email: agency.email,
          city: agency.city,
          country: agency.country,
          // Vérification BaaraMatch (et non users.isVerified, qui signifie
          // seulement qu'un compte prospect a été réclamé).
          status: agency.profile?.verifiedAt ? "verified" : "pending",
          verifiedAt: agency.profile?.verifiedAt ?? null,
          licenseNumber: agency.profile?.licenseNumber ?? null,
          specializations: agency.profile?.specializations ?? [],
          totalPlacements: agency.profile?.totalPlacements ?? 0,
          subscriptionPlan: planAgenceEffectif(agency.profile),
          partnerTrialEndsAt: agency.profile?.partnerTrialEndsAt ?? null,
          createdAt: agency.createdAt,
        })),
      );
    } catch (error) {
      console.error("Admin agencies error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des agences" });
    }
  });

  app.patch("/api/admin/agencies/:id/plan", requireAdmin, async (req, res) => {
    try {
      const { plan } = z.object({ plan: z.enum(agencySubscriptionPlans) }).parse(req.body);

      const agency = await storage.getUser(String(req.params.id));
      if (!agency || agency.userType !== "agency") {
        return res.status(404).json({ message: "Agence non trouvée" });
      }

      const updatedProfile = await storage.updateAgencyProfile(agency.id, {
        subscriptionPlan: plan,
        subscriptionUpdatedAt: new Date(),
        // Choix manuel : remplace l'essai de lancement, sans date de fin.
        partnerTrialEndsAt: null,
      });
      if (!updatedProfile) {
        return res.status(404).json({ message: "Profil agence introuvable" });
      }

      const admin = req.adminUser;
      await storage.createActivityLog({
        action: "settings_change",
        userId: admin?.id ?? null,
        userLabel: admin?.email ?? "admin",
        ipAddress: req.ip ?? null,
        status: "success",
        details: `Plan de ${agency.fullName} changé pour "${plan}"`,
      });

      res.json({ agencyId: agency.id, subscriptionPlan: updatedProfile.subscriptionPlan });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Admin update agency plan error:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du plan" });
    }
  });

  // --- Admin accounts (super_admin only: manages who else has admin access) ---

  app.get("/api/admin/accounts", requireAdmin, requireAdminPermission("admins:gerer"), async (_req, res) => {
    try {
      const admins = await storage.getAllAdmins();
      res.json(
        admins.map((admin) => ({
          id: admin.id,
          email: admin.email,
          fullName: admin.fullName,
          adminLevel: admin.profile?.adminLevel ?? "moderateur",
          isAdminActive: admin.profile?.isActive ?? true,
          createdByAdminId: admin.profile?.createdByAdminId ?? null,
          createdAt: admin.createdAt,
        })),
      );
    } catch (error) {
      console.error("Admin accounts list error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des comptes admin" });
    }
  });

  app.post("/api/admin/accounts", requireAdmin, requireAdminPermission("admins:gerer"), async (req, res) => {
    try {
      const validatedData = adminAccountCreateSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }

      const creator = req.adminUser;
      const hashedPassword = await hashPassword(validatedData.password);
      const newAdmin = await storage.createUser({
        email: validatedData.email,
        password: hashedPassword,
        userType: "admin",
        fullName: validatedData.fullName,
      } as any);
      const newAdminProfile = await storage.createAdminProfile({
        userId: newAdmin.id,
        adminLevel: validatedData.adminLevel,
        isActive: true,
        createdByAdminId: creator?.id ?? null,
      });

      await storage.createActivityLog({
        action: "admin_account_created",
        userId: creator?.id ?? null,
        userLabel: creator?.email ?? "admin",
        ipAddress: req.ip ?? null,
        status: "success",
        details: `Compte admin "${newAdmin.email}" créé avec le niveau "${validatedData.adminLevel}"`,
      });

      const { password: _, ...adminWithoutPassword } = newAdmin;
      res.status(201).json({ ...adminWithoutPassword, adminLevel: newAdminProfile.adminLevel, isAdminActive: newAdminProfile.isActive });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Admin account creation error:", error);
      res.status(500).json({ message: "Erreur lors de la création du compte admin" });
    }
  });

  app.patch("/api/admin/accounts/:id/level", requireAdmin, requireAdminPermission("admins:gerer"), async (req, res) => {
    try {
      const { adminLevel } = adminLevelUpdateSchema.parse(req.body);
      const targetId = String(req.params.id);

      if (targetId === req.session.userId && adminLevel !== "super_admin") {
        return res.status(400).json({ message: "Vous ne pouvez pas réduire votre propre niveau d'accès" });
      }

      const target = await storage.getUser(targetId);
      if (!target || target.userType !== "admin") {
        return res.status(404).json({ message: "Compte admin non trouvé" });
      }

      const updated = await storage.updateAdminProfile(targetId, { adminLevel });
      if (!updated) {
        return res.status(404).json({ message: "Profil admin introuvable" });
      }

      const actor = req.adminUser;
      await storage.createActivityLog({
        action: "admin_level_changed",
        userId: actor?.id ?? null,
        userLabel: actor?.email ?? "admin",
        ipAddress: req.ip ?? null,
        status: "success",
        details: `Niveau de "${target.email}" changé pour "${adminLevel}"`,
      });

      res.json({ id: targetId, adminLevel: updated.adminLevel });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Admin level update error:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du niveau" });
    }
  });

  app.patch("/api/admin/accounts/:id/status", requireAdmin, requireAdminPermission("admins:gerer"), async (req, res) => {
    try {
      const { isAdminActive } = adminStatusUpdateSchema.parse(req.body);
      const targetId = String(req.params.id);

      if (targetId === req.session.userId && !isAdminActive) {
        return res.status(400).json({ message: "Vous ne pouvez pas désactiver votre propre compte" });
      }

      const target = await storage.getUser(targetId);
      if (!target || target.userType !== "admin") {
        return res.status(404).json({ message: "Compte admin non trouvé" });
      }

      const updated = await storage.updateAdminProfile(targetId, { isActive: isAdminActive });
      if (!updated) {
        return res.status(404).json({ message: "Profil admin introuvable" });
      }

      const actor = req.adminUser;
      await storage.createActivityLog({
        action: "admin_status_changed",
        userId: actor?.id ?? null,
        userLabel: actor?.email ?? "admin",
        ipAddress: req.ip ?? null,
        status: "success",
        details: `Compte "${target.email}" ${isAdminActive ? "réactivé" : "désactivé"}`,
      });

      res.json({ id: targetId, isAdminActive: updated.isActive });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Admin status update error:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du statut" });
    }
  });

  // --- Prospect organizations & third-party job management (super_admin + gestionnaire_comptes) ---

  // Backs OrganisationPickerOrCreate — the shared search-first entry point
  // for attaching an admin action to an organization. Searches every
  // company/agency (real accounts and prospects alike), not just prospects.
  app.get("/api/admin/organizations/search", requireAdmin, requireAdminPermission("organisations:gerer"), async (req, res) => {
    try {
      const q = String(req.query.q ?? "").trim().toLowerCase();
      if (q.length < 2) {
        return res.json([]);
      }

      const [companies, agencies] = await Promise.all([
        storage.getAllCompanies(),
        storage.getAllAgencies(),
      ]);

      const candidates = [
        ...companies.map((user) => ({
          id: user.id,
          userType: "company" as const,
          name: user.profile?.companyName ?? user.fullName,
          registrationNumber: user.profile?.siretNumber ?? null,
          // A prospect has no phone of its own yet — the searchable number
          // is the contact phone an admin recorded when creating it.
          phone: user.phone ?? user.prospectContactPhone,
          city: user.city,
          isProspect: user.isProspect ?? false,
        })),
        ...agencies.map((user) => ({
          id: user.id,
          userType: "agency" as const,
          name: user.profile?.agencyName ?? user.fullName,
          registrationNumber: user.profile?.licenseNumber ?? null,
          phone: user.phone ?? user.prospectContactPhone,
          city: user.city,
          isProspect: user.isProspect ?? false,
        })),
      ];

      const results = candidates
        .filter((org) =>
          org.name.toLowerCase().includes(q) ||
          (org.registrationNumber ?? "").toLowerCase().includes(q) ||
          (org.phone ?? "").toLowerCase().includes(q),
        )
        .slice(0, 20);

      res.json(results);
    } catch (error) {
      console.error("Organization search error:", error);
      res.status(500).json({ message: "Erreur lors de la recherche" });
    }
  });

  // Lists every organization an admin is tracking (still-unclaimed
  // prospects and ones that started as a prospect but have since been
  // claimed) — filterable via ?prospect=true|false and ?type=company|agency.
  app.get("/api/admin/organizations", requireAdmin, requireAdminPermission("organisations:gerer"), async (req, res) => {
    try {
      let orgs = await storage.getProspectOrganizations();

      const prospectFilter = req.query.prospect;
      if (prospectFilter === "true") {
        orgs = orgs.filter((org) => org.isProspect);
      } else if (prospectFilter === "false") {
        orgs = orgs.filter((org) => !org.isProspect);
      }

      const typeFilter = req.query.type;
      if (typeFilter === "company" || typeFilter === "agency") {
        orgs = orgs.filter((org) => org.userType === typeFilter);
      }

      const enriched = await Promise.all(
        orgs.map(async (org) => {
          const jobs = org.userType === "agency"
            ? await storage.getJobPostingsByAgency(org.id)
            : await storage.getJobPostingsByCompany(org.id);
          return {
            id: org.id,
            userType: org.userType,
            email: org.email,
            name: org.userType === "agency"
              ? (org.profile as { agencyName?: string })?.agencyName ?? org.fullName
              : (org.profile as { companyName?: string })?.companyName ?? org.fullName,
            city: org.city,
            industry: org.userType === "company" ? (org.profile as { industry?: string } | undefined)?.industry ?? null : null,
            jobCount: jobs.length,
            claimed: !org.isProspect,
            claimToken: org.isProspect ? org.claimToken : null,
            contactName: org.prospectContactName,
            contactPhone: org.prospectContactPhone,
            createdAt: org.createdAt,
          };
        }),
      );
      res.json(enriched);
    } catch (error) {
      console.error("Organizations list error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des organisations" });
    }
  });

  app.post("/api/admin/organizations/prospect", requireAdmin, requireAdminPermission("organisations:creer_prospect"), async (req, res) => {
    try {
      const validatedData = prospectOrganizationCreateSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }

      const admin = req.adminUser;
      const claimToken = crypto.randomBytes(24).toString("hex");
      // Prospect accounts can't log in until claimed — lock them with a
      // password nobody knows rather than leaving the field predictable.
      const unusablePassword = await hashPassword(crypto.randomBytes(24).toString("hex"));

      const prospectUser = await storage.createUser({
        email: validatedData.email,
        password: unusablePassword,
        userType: validatedData.userType,
        fullName: validatedData.organizationName,
        phone: validatedData.phone ?? null,
        city: validatedData.city ?? null,
        country: validatedData.country ?? null,
        isProspect: true,
        claimToken,
        prospectContactName: validatedData.contactName ?? null,
        prospectContactPhone: validatedData.contactPhone ?? null,
        // References adminProfiles.id, not users.id.
        createdByAdminId: req.adminProfile?.id ?? null,
      } as any);

      if (validatedData.userType === "agency") {
        await storage.createAgencyProfile({
          userId: prospectUser.id,
          agencyName: validatedData.organizationName,
          description: null,
          specializations: null,
          website: null,
          licenseNumber: null,
          candidatesPlaced: 0,
        });
      } else {
        await storage.createCompanyProfile({
          userId: prospectUser.id,
          companyName: validatedData.organizationName,
          industry: validatedData.industry ?? null,
          secteur: secteurDeCategorie(validatedData.industry),
          description: null,
          website: null,
          employeeCount: null,
          foundedYear: null,
          logoUrl: null,
        });
      }

      await storage.createActivityLog({
        action: "prospect_organization_created",
        userId: admin?.id ?? null,
        userLabel: admin?.email ?? "admin",
        ipAddress: req.ip ?? null,
        status: "success",
        details: `Organisation prospect "${validatedData.organizationName}" (${validatedData.userType}) créée`,
      });

      res.status(201).json({
        id: prospectUser.id,
        userType: prospectUser.userType,
        email: prospectUser.email,
        name: validatedData.organizationName,
        claimToken,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Prospect organization creation error:", error);
      res.status(500).json({ message: "Erreur lors de la création de l'organisation" });
    }
  });

  app.post("/api/admin/organizations/:id/jobs", requireAdmin, requireAdminPermission("offres:creer_pour_autrui"), async (req, res) => {
    try {
      const orgId = String(req.params.id);
      const org = await storage.getUser(orgId);
      if (!org || (org.userType !== "company" && org.userType !== "agency")) {
        return res.status(404).json({ message: "Organisation non trouvée" });
      }

      const validatedData = adminManagedJobCreateSchema.parse(req.body);
      const admin = req.adminUser;

      // No separate review step here: the admin creating this job on
      // behalf of the organization is the validator, so it publishes
      // directly with validation stamped at creation time.
      const now = new Date();
      const job = await storage.createJobPosting({
        ...validatedData,
        companyId: org.userType === "company" ? org.id : (req.body.companyId ?? org.id),
        agencyId: org.userType === "agency" ? org.id : null,
        managementType: "geree_par_baaramatch",
        // Both reference adminProfiles.id, not users.id.
        createdByAdminId: req.adminProfile?.id ?? null,
        validatedByAdminId: req.adminProfile?.id ?? null,
        validatedAt: now,
        isActive: true,
      } as any);

      await storage.createActivityLog({
        action: "job_created_for_third_party",
        userId: admin?.id ?? null,
        userLabel: admin?.email ?? "admin",
        ipAddress: req.ip ?? null,
        status: "success",
        details: `Offre "${job.title}" publiée au nom de "${org.fullName}"`,
      });

      res.status(201).json(job);
      notifierAbonnesEmployeur(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Admin third-party job creation error:", error);
      res.status(500).json({ message: "Erreur lors de la création de l'offre" });
    }
  });

  // Traceability screen: every job an admin created on behalf of an
  // organization, with who created it and for whom.
  // Filterable via ?createdByAdminId=<admin profile id> and/or
  // ?organizationId=<company/agency user id>.
  app.get("/api/admin/organizations/managed-jobs", requireAdmin, requireAdminPermission("organisations:gerer"), async (req, res) => {
    try {
      let jobs = await storage.getAdminManagedJobPostings();

      const createdByFilter = typeof req.query.createdByAdminId === "string" ? req.query.createdByAdminId : undefined;
      if (createdByFilter) {
        jobs = jobs.filter((job) => job.createdByAdminId === createdByFilter);
      }

      const organizationIdFilter = typeof req.query.organizationId === "string" ? req.query.organizationId : undefined;
      if (organizationIdFilter) {
        jobs = jobs.filter((job) => job.companyId === organizationIdFilter || job.agencyId === organizationIdFilter);
      }

      const enriched = await Promise.all(
        jobs.map(async (job) => {
          const orgId = job.companyId || job.agencyId!;
          const org = await storage.getUser(orgId);
          const adminProfile = job.createdByAdminId ? await storage.getAdminProfileById(job.createdByAdminId) : undefined;
          const admin = adminProfile ? await storage.getUser(adminProfile.userId) : undefined;
          return {
            id: job.id,
            title: job.title,
            isActive: job.isActive,
            organizationId: orgId,
            organizationName: org?.fullName ?? "Organisation supprimée",
            organizationType: org?.userType ?? null,
            createdByAdminId: job.createdByAdminId,
            createdByAdminName: admin?.fullName ?? "Admin inconnu",
            validatedAt: job.validatedAt,
            createdAt: job.createdAt,
          };
        }),
      );
      res.json(enriched);
    } catch (error) {
      console.error("Admin managed jobs list error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des offres gérées" });
    }
  });

  // Single-organization detail — the fuller view behind an "Organisation
  // detail" screen: profile info, prospect/claim status, and every job
  // posted for it (self-service and admin-managed alike).
  app.get("/api/admin/organizations/:id", requireAdmin, requireAdminPermission("organisations:gerer"), async (req, res) => {
    try {
      const orgId = String(req.params.id);
      const org = await storage.getUser(orgId);
      if (!org || (org.userType !== "company" && org.userType !== "agency")) {
        return res.status(404).json({ message: "Organisation non trouvée" });
      }

      const profile = org.userType === "agency"
        ? await storage.getAgencyProfile(org.id)
        : await storage.getCompanyProfile(org.id);
      const creatorProfile = org.createdByAdminId ? await storage.getAdminProfileById(org.createdByAdminId) : undefined;
      const creator = creatorProfile ? await storage.getUser(creatorProfile.userId) : undefined;
      const jobs = org.userType === "agency"
        ? await storage.getJobPostingsByAgency(org.id)
        : await storage.getJobPostingsByCompany(org.id);

      res.json({
        id: org.id,
        userType: org.userType,
        email: org.email,
        name: org.userType === "agency"
          ? (profile as { agencyName?: string } | undefined)?.agencyName ?? org.fullName
          : (profile as { companyName?: string } | undefined)?.companyName ?? org.fullName,
        industry: org.userType === "company" ? (profile as { industry?: string } | null)?.industry ?? null : null,
        city: org.city,
        country: org.country,
        phone: org.phone,
        isProspect: org.isProspect,
        claimedAt: org.claimedAt,
        contactName: org.prospectContactName,
        contactPhone: org.prospectContactPhone,
        createdByAdminId: org.createdByAdminId,
        createdByAdminName: creator?.fullName ?? null,
        createdAt: org.createdAt,
        jobs: jobs.map((job) => ({
          id: job.id,
          title: job.title,
          isActive: job.isActive,
          managementType: job.managementType,
          createdAt: job.createdAt,
        })),
      });
    } catch (error) {
      console.error("Organization detail error:", error);
      res.status(500).json({ message: "Erreur lors du chargement de l'organisation" });
    }
  });

  const organizationUpdateSchema = z.object({
    organizationName: z.string().min(2).optional(),
    industry: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    contactName: z.string().nullable().optional(),
    contactPhone: z.string().nullable().optional(),
  }).strict();

  app.patch("/api/admin/organizations/:id", requireAdmin, requireAdminPermission("organisations:gerer"), async (req, res) => {
    try {
      const orgId = String(req.params.id);
      const org = await storage.getUser(orgId);
      if (!org || (org.userType !== "company" && org.userType !== "agency")) {
        return res.status(404).json({ message: "Organisation non trouvée" });
      }

      const validatedData = organizationUpdateSchema.parse(req.body);

      const userUpdates: Partial<typeof org> = {};
      if (validatedData.city !== undefined) userUpdates.city = validatedData.city;
      if (validatedData.contactName !== undefined) userUpdates.prospectContactName = validatedData.contactName;
      if (validatedData.contactPhone !== undefined) userUpdates.prospectContactPhone = validatedData.contactPhone;
      if (validatedData.organizationName !== undefined) userUpdates.fullName = validatedData.organizationName;
      if (Object.keys(userUpdates).length > 0) {
        await storage.updateUser(orgId, userUpdates);
      }

      if (org.userType === "agency") {
        const profileUpdates: { agencyName?: string } = {};
        if (validatedData.organizationName !== undefined) profileUpdates.agencyName = validatedData.organizationName;
        if (Object.keys(profileUpdates).length > 0) {
          await storage.updateAgencyProfile(orgId, profileUpdates);
        }
      } else {
        const profileUpdates: { companyName?: string; industry?: string | null } = {};
        if (validatedData.organizationName !== undefined) profileUpdates.companyName = validatedData.organizationName;
        if (validatedData.industry !== undefined) profileUpdates.industry = validatedData.industry;
        if (Object.keys(profileUpdates).length > 0) {
          await storage.updateCompanyProfile(orgId, profileUpdates);
        }
      }

      const admin = req.adminUser;
      await storage.createActivityLog({
        action: "organization_updated",
        userId: admin?.id ?? null,
        userLabel: admin?.email ?? "admin",
        ipAddress: req.ip ?? null,
        status: "success",
        details: `Organisation "${org.fullName}" modifiée par un administrateur`,
      });

      const updatedOrg = await storage.getUser(orgId);
      res.json({ id: orgId, updated: true, name: updatedOrg?.fullName });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Organization update error:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour de l'organisation" });
    }
  });

  app.post("/api/organizations/claim", authRateLimiter, async (req, res) => {
    try {
      const { token, password } = claimOrganizationSchema.parse(req.body);

      const user = await storage.getUserByClaimToken(token);
      if (!user || !user.isProspect) {
        return res.status(404).json({ message: "Lien de récupération invalide ou déjà utilisé" });
      }

      const hashedPassword = await hashPassword(password);
      const claimedUser = await storage.updateUser(user.id, {
        password: hashedPassword,
        isProspect: false,
        claimToken: null,
        claimedAt: new Date(),
        isVerified: true,
      });

      // Agence prospect : l'essai Partenaire de lancement démarre à la
      // reprise du compte (sauf Partenaire définitif choisi par l'admin).
      if (user.userType === "agency") {
        const profilAgence = await storage.getAgencyProfile(user.id);
        if (profilAgence && !(profilAgence.subscriptionPlan === "partner" && !profilAgence.partnerTrialEndsAt)) {
          await storage.updateAgencyProfile(user.id, debutEssaiPartenaire());
        }
      }

      await storage.createActivityLog({
        action: "organization_claimed",
        userId: user.id,
        userLabel: user.email,
        ipAddress: req.ip ?? null,
        status: "success",
        details: `Organisation "${user.fullName}" reprise par son propriétaire`,
      });

      req.session.userId = user.id;
      req.session.userType = user.userType;
      const { password: _, ...userWithoutPassword } = claimedUser!;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Organization claim error:", error);
      res.status(500).json({ message: "Erreur lors de la récupération du compte" });
    }
  });

  // Self-service "is this your business?" — offered during registration.
  // Returns just enough to let the registrant recognize the match; never the
  // claimToken (that would let anyone claim by guessing name/phone).
  app.post("/api/organizations/prospect-match", authRateLimiter, async (req, res) => {
    try {
      const { userType, phone } = prospectMatchCheckSchema.parse(req.body);
      const match = await storage.getProspectByContactPhone(userType, phone);
      if (!match) {
        return res.json({ match: false });
      }
      const profile = userType === "agency"
        ? await storage.getAgencyProfile(match.id)
        : await storage.getCompanyProfile(match.id);
      const organizationName = userType === "agency"
        ? (profile as { agencyName?: string } | undefined)?.agencyName ?? match.fullName
        : (profile as { companyName?: string } | undefined)?.companyName ?? match.fullName;
      res.json({ match: true, organizationName });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Prospect match check error:", error);
      res.status(500).json({ message: "Erreur lors de la vérification" });
    }
  });

  // Completes the self-service claim once the registrant confirms the match
  // — re-verifies the phone server-side rather than trusting the client's
  // earlier check, and reuses the same claim semantics as the token flow.
  app.post("/api/organizations/claim-by-contact", authRateLimiter, async (req, res) => {
    try {
      const { userType, phone, password } = claimByContactSchema.parse(req.body);

      const user = await storage.getProspectByContactPhone(userType, phone);
      if (!user) {
        return res.status(404).json({ message: "Aucune organisation prospect ne correspond à ces informations" });
      }

      const hashedPassword = await hashPassword(password);
      const claimedUser = await storage.updateUser(user.id, {
        password: hashedPassword,
        isProspect: false,
        claimToken: null,
        claimedAt: new Date(),
        isVerified: true,
      });

      // Agence prospect : l'essai Partenaire de lancement démarre à la
      // reprise du compte (sauf Partenaire définitif choisi par l'admin).
      if (user.userType === "agency") {
        const profilAgence = await storage.getAgencyProfile(user.id);
        if (profilAgence && !(profilAgence.subscriptionPlan === "partner" && !profilAgence.partnerTrialEndsAt)) {
          await storage.updateAgencyProfile(user.id, debutEssaiPartenaire());
        }
      }

      await storage.createActivityLog({
        action: "organization_claimed",
        userId: user.id,
        userLabel: user.email,
        ipAddress: req.ip ?? null,
        status: "success",
        details: `Organisation "${user.fullName}" reprise par son propriétaire (correspondance téléphone)`,
      });

      req.session.userId = user.id;
      req.session.userType = user.userType;
      const { password: _, ...userWithoutPassword } = claimedUser!;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Claim by contact error:", error);
      res.status(500).json({ message: "Erreur lors de la récupération du compte" });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const [companies, agencies, candidates, admins] = await Promise.all([
        storage.getAllCompanies(),
        storage.getAllAgencies(),
        storage.getAllCandidates(),
        pool.query("select id, email, full_name, user_type, city, country, is_verified, created_at from users where user_type = 'admin' order by created_at desc"),
      ]);

      const users = [
        ...companies.map((user) => ({
          id: user.id,
          name: user.fullName,
          email: user.email,
          userType: user.userType,
          city: user.city,
          country: user.country,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        })),
        ...agencies.map((user) => ({
          id: user.id,
          name: user.fullName,
          email: user.email,
          userType: user.userType,
          city: user.city,
          country: user.country,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        })),
        ...candidates.map((user) => ({
          id: user.id,
          name: user.fullName,
          email: user.email,
          userType: user.userType,
          city: user.city,
          country: user.country,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        })),
        ...(admins.rows as Array<any>).map((user) => ({
          id: user.id,
          name: user.full_name,
          email: user.email,
          userType: user.user_type,
          city: user.city,
          country: user.country,
          isVerified: user.is_verified,
          createdAt: user.created_at,
        })),
      ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

      res.json(users);
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ message: "Erreur lors du chargement des utilisateurs" });
    }
  });

  // The only admin-facing endpoint that returns a candidate's full profile
  // (CV, skills, salary expectation, contact details) — every other admin
  // endpoint returning candidates must stay to minimal fields (see
  // /api/admin/users above). Every successful call here is written to the
  // audit journal automatically; this is not optional or skippable by the
  // caller.
  app.get("/api/admin/candidates/:id", requireAdmin, requireAdminPermission("candidats:consulter_profil_complet"), async (req, res) => {
    try {
      const candidateId = req.params.id as string;
      const candidate = await storage.getUser(candidateId);
      if (!candidate || candidate.userType !== "candidate") {
        return res.status(404).json({ message: "Candidat non trouvé" });
      }

      const profile = await storage.getCandidateProfile(candidateId);
      const { password: _, ...candidateWithoutPassword } = candidate;

      try {
        await storage.createActivityLog({
          action: "candidate_profile_viewed",
          userId: req.adminUser!.id,
          userLabel: req.adminUser!.email,
          ipAddress: req.ip ?? null,
          status: "success",
          details: `Consultation du profil complet de "${candidate.fullName}"`,
          targetType: "candidate",
          targetId: candidateId,
        });
      } catch (auditError) {
        // Never let an audit-log failure block a legitimate support
        // request — but it must be investigated, hence the loud log.
        console.error("Failed to write candidate-view audit log:", auditError);
      }

      res.json({ ...candidateWithoutPassword, profile });
    } catch (error) {
      console.error("Admin candidate detail error:", error);
      res.status(500).json({ message: "Erreur lors de la récupération du candidat" });
    }
  });

  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.getAllJobPostings();
      // Only agencies are subject to the company's visibleToAgencies
      // opt-out — everyone else (public visitors, candidates, the poster
      // itself) sees the full list as before. A job an agency posted
      // itself is always visible to that agency regardless of the flag.
      const visibleJobs = req.session.userType === "agency"
        ? jobs.filter((job) => job.agencyId === req.session.userId || job.visibleToAgencies !== false)
        : jobs;
      res.json(visibleJobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des offres" });
    }
  });

  // Page Employeurs (/agencies) : recherche, facettes et pagination côté
  // serveur. Paramètres : q, lieu, type, secteur[], pays[], offres, tri,
  // page, taille (voir shared/recherche-employeurs.ts). « verifie » ne vient
  // que de la vérification admin (verified_at).
  app.get("/api/employeurs", async (req, res) => {
    try {
      const lignes = await storage.getEmployeursPublics();
      res.json(rechercherEmployeurs(lignes.map(employeurDepuisLigne), lireParametresEmployeurs(req.query as Record<string, unknown>)));
    } catch (error) {
      console.error("Error searching employers:", error);
      res.status(500).json({ message: "Erreur lors de la recherche des employeurs" });
    }
  });

  // Profil public d'un employeur (pages /agencies/:id et /companies/:id) :
  // identité, vérification, offres actives, résumé des avis, et pour
  // l'utilisateur connecté s'il suit l'employeur et peut donner un avis.
  app.get("/api/employeurs/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      const ligne = await storage.getProfilEmployeurPublic(id);
      if (!ligne) return res.status(404).json({ message: "Employeur introuvable" });
      const candidatId = req.session.userType === "candidate" ? req.session.userId : undefined;
      const [avis, suiviParMoi, aPostule] = await Promise.all([
        storage.getAvisEmployeur(id),
        candidatId ? storage.estSuiviPar(id, candidatId) : false,
        candidatId ? storage.aPostuleChezEmployeur(id, candidatId) : false,
      ]);
      res.json(profilDepuisLigne(ligne, { avis: resumerAvis(avis.map((a) => a.note)), suiviParMoi, peutDonnerAvis: aPostule }));
    } catch (error) {
      console.error("Error fetching employer profile:", error);
      res.status(500).json({ message: "Erreur lors de la récupération du profil" });
    }
  });

  // Suivre un employeur : candidats seulement.
  const exigerCandidat = (req: Request, res: Response): string | null => {
    if (!req.session.userId) { res.status(401).json({ message: "Connectez-vous pour suivre un employeur" }); return null; }
    if (req.session.userType !== "candidate") { res.status(403).json({ message: "Réservé aux candidats" }); return null; }
    return req.session.userId;
  };
  const employeurExiste = async (id: string, res: Response) => {
    if (await storage.getProfilEmployeurPublic(id)) return true;
    res.status(404).json({ message: "Employeur introuvable" });
    return false;
  };

  app.get("/api/employeurs/:id/suivi", async (req, res) => {
    const candidatId = exigerCandidat(req, res);
    if (!candidatId) return;
    try {
      res.json({ suivi: await storage.estSuiviPar(String(req.params.id), candidatId) });
    } catch (error) {
      console.error("Error reading follow:", error);
      res.status(500).json({ message: "Erreur lors de la lecture du suivi" });
    }
  });

  for (const methode of ["post", "delete"] as const) {
    app[methode]("/api/employeurs/:id/suivi", async (req, res) => {
      const candidatId = exigerCandidat(req, res);
      if (!candidatId) return;
      try {
        const id = String(req.params.id);
        if (!(await employeurExiste(id, res))) return;
        if (methode === "post") await storage.suivreEmployeur(id, candidatId);
        else await storage.nePlusSuivreEmployeur(id, candidatId);
        res.json({ suivi: methode === "post" });
      } catch (error) {
        console.error("Error updating follow:", error);
        res.status(500).json({ message: "Erreur lors de l'enregistrement du suivi" });
      }
    });
  }

  // Avis de candidats : liste publique (sans auteur), résumé, et l'avis du
  // candidat connecté marqué pour qu'il puisse le modifier.
  app.get("/api/employeurs/:id/avis", async (req, res) => {
    try {
      const id = String(req.params.id);
      if (!(await employeurExiste(id, res))) return;
      const lignes = await storage.getAvisEmployeur(id);
      const moi = req.session.userType === "candidate" ? req.session.userId : undefined;
      const avis: AvisPublic[] = lignes.map((a) => ({
        id: a.id, note: a.note, commentaire: a.commentaire, publieLe: new Date(a.publieLe).toISOString(), estLeMien: !!moi && a.candidatId === moi,
      }));
      res.json({ resume: resumerAvis(lignes.map((a) => a.note)), avis });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des avis" });
    }
  });

  // Donner ou modifier son avis : candidat ayant postulé à une offre de
  // l'employeur ; un seul avis par employeur.
  app.put("/api/employeurs/:id/avis", async (req, res) => {
    const candidatId = exigerCandidat(req, res);
    if (!candidatId) return;
    try {
      const id = String(req.params.id);
      if (!(await employeurExiste(id, res))) return;
      if (!(await storage.aPostuleChezEmployeur(id, candidatId))) {
        return res.status(403).json({ message: "Seuls les candidats ayant postulé à une offre de cet employeur peuvent donner un avis." });
      }
      const { note, commentaire } = avisSchema.parse(req.body);
      await storage.enregistrerAvisEmployeur(id, candidatId, note, commentaire ?? null);
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Avis invalide : une note de 1 à 5 est requise.", errors: error.errors });
      console.error("Error saving review:", error);
      res.status(500).json({ message: "Erreur lors de l'enregistrement de l'avis" });
    }
  });

  app.delete("/api/employeurs/:id/avis", async (req, res) => {
    const candidatId = exigerCandidat(req, res);
    if (!candidatId) return;
    try {
      const supprime = await storage.supprimerAvisEmployeur(String(req.params.id), candidatId);
      if (!supprime) return res.status(404).json({ message: "Aucun avis à retirer" });
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Erreur lors du retrait de l'avis" });
    }
  });

  // Page Offres (/jobs) : recherche, facettes et pagination côté serveur.
  // Paramètres : q, lieu, contrat, secteur[], ville[], exp[],
  // publiee_depuis_jours, tri, page, taille (voir shared/recherche-offres.ts).
  // Même règle de visibilité pour les agences que GET /api/jobs.
  app.get("/api/offres", async (req, res) => {
    try {
      const lignes = await storage.getOffresPubliques();
      const visibles = req.session.userType === "agency"
        ? lignes.filter((job) => job.agencyId === req.session.userId || job.visibleToAgencies !== false)
        : lignes;
      res.json(rechercherOffres(visibles.map(offreDepuisLigne), lireParametresOffres(req.query as Record<string, unknown>)));
    } catch (error) {
      console.error("Error searching jobs:", error);
      res.status(500).json({ message: "Erreur lors de la recherche des offres" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJobPosting(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Offre non trouvée" });
      }

      // Counts genuine outside interest, not the poster (or an admin
      // previewing it from the moderation queue) checking their own listing.
      const viewerId = req.session.userId;
      const isOwnerOrAdmin = viewerId != null
        && (viewerId === job.companyId || viewerId === job.agencyId || req.session.userType === "admin");
      if (!isOwnerOrAdmin) {
        await storage.incrementJobViewCount(job.id);
        job.viewCount = (job.viewCount ?? 0) + 1;
      }

      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ message: "Erreur lors de la récupération de l'offre" });
    }
  });

  // Prévient les candidats qui suivent l'employeur (l'agence si agencyId,
  // sinon l'entreprise) qu'il vient de publier une offre. Sans effet sur la
  // publication en cas d'échec.
  async function notifierAbonnesEmployeur(job: { id: string; title: string; agencyId: string | null; companyId: string }) {
    const employeurId = job.agencyId ?? job.companyId;
    try {
      const [abonnes, profil] = await Promise.all([storage.getAbonnesEmployeur(employeurId), storage.getProfilEmployeurPublic(employeurId)]);
      const nom = profil?.nom?.trim() || "Un employeur que vous suivez";
      for (const userId of abonnes) {
        await storage.createNotification({
          userId,
          type: "employer_job",
          title: `Nouvelle offre de ${nom}`,
          message: `${job.title.trim()} : consultez l'offre et postulez.`,
          actionUrl: `/jobs/${job.id}`,
        });
      }
    } catch (error) {
      console.error(`[suivi] Abonnés non prévenus pour l'offre ${job.id} :`, error);
    }
  }

  // Notifies candidates who are a strong match for a newly-active job.
  // Uses the V0 rule-based scorer (shared/matching.ts) rather than the
  // pgvector/embeddings path — that one is deferred to V1.1 (needs data
  // volume to be reliable, and is currently blocked anyway: the OpenAI
  // account has no credits). Best-effort and silent on failure — never
  // blocks the caller, and never falls back to notifying everyone: a
  // default/neutral score would be spam, not a match.
  async function notifyMatchingCandidatesForJob(job: { id: string; title: string; requiredSkills: string[] | null; location: string; experienceMin: number | null }) {
    try {
      const candidates = await storage.getAllCandidates();

      const strongMatches = candidates
        .map((candidate) => ({
          userId: candidate.id,
          ...calculateMatchScore(
            { skills: candidate.profile?.skills, city: candidate.city, experienceYears: candidate.profile?.experienceYears },
            { requiredSkills: job.requiredSkills, location: job.location, experienceMin: job.experienceMin },
          ),
        }))
        .filter((match) => match.score >= 65)
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);

      for (const match of strongMatches) {
        await storage.createNotification({
          userId: match.userId,
          type: "job_match",
          title: `Nouvelle offre qui vous correspond : "${job.title}"`,
          message: `${match.score}% de compatibilité avec votre profil.`,
          actionUrl: `/jobs/${job.id}`,
        });
      }
    } catch (error) {
      console.error(`[job-match] Could not notify candidates for job ${job.id}:`, error);
    }
  }

  app.post("/api/jobs", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || (user.userType !== "company" && user.userType !== "agency")) {
        return res.status(403).json({ message: "Non autorisé à publier des offres" });
      }

      const validatedData = insertJobPostingSchema.parse({
        ...req.body,
        companyId: user.userType === "company" ? user.id : req.body.companyId,
        agencyId: user.userType === "agency" ? user.id : null,
      });

      // Standard-plan agencies can't self-publish — skipping the review
      // queue is the "Agence Partenaire" perk. Companies and partner-plan
      // agencies keep publishing immediately, as before.
      let requiresModeration = false;
      if (user.userType === "agency" && validatedData.isActive) {
        const agencyProfile = await storage.getAgencyProfile(user.id);
        requiresModeration = !estPartenaire(agencyProfile);
      }

      const job = await storage.createJobPosting({
        ...validatedData,
        isActive: requiresModeration ? false : validatedData.isActive,
      });

      if (requiresModeration) {
        await storage.createModerationItem({
          targetType: "job",
          targetEntityId: job.id,
          targetUserId: user.id,
          targetUserType: user.userType,
          targetLabel: job.title,
          reason: "Nouvelle offre publiée par une agence en plan standard — validation requise avant mise en ligne.",
          reportedBy: "system",
          priority: "medium",
        });
      }

      res.status(201).json(job);

      if (job.isActive) {
        notifyMatchingCandidatesForJob(job);
        notifierAbonnesEmployeur(job);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error creating job:", error);
      res.status(500).json({ message: "Erreur lors de la création de l'offre" });
    }
  });

  app.patch("/api/jobs/:id", requireAuth, async (req, res) => {
    try {
      const jobId = String(req.params.id);
      const job = await storage.getJobPosting(jobId);
      if (!job) {
        return res.status(404).json({ message: "Offre non trouvée" });
      }

      if (job.companyId !== req.session.userId && job.agencyId !== req.session.userId) {
        return res.status(403).json({ message: "Non autorisé à modifier cette offre" });
      }

      const updates = jobUpdateSchema.parse(req.body);

      // Same gate as POST /api/jobs: a standard-plan agency can't put a
      // never-validated job live by flipping isActive. The activation is
      // turned into a (re)submission to the review queue instead. Jobs
      // already validated once can be closed and reopened freely.
      let requiresModeration = false;
      if (updates.isActive === true && !job.isActive && !job.validatedAt && job.agencyId === req.session.userId) {
        const agencyProfile = await storage.getAgencyProfile(req.session.userId!);
        requiresModeration = !estPartenaire(agencyProfile);
      }

      const updatedJob = await storage.updateJobPosting(jobId, requiresModeration ? { ...updates, isActive: false } : updates);

      if (requiresModeration && updatedJob) {
        const alreadyQueued = (await storage.listModerationItems()).some(
          (item) => item.targetType === "job" && item.targetEntityId === jobId && item.status === "pending",
        );
        if (!alreadyQueued) {
          await storage.createModerationItem({
            targetType: "job",
            targetEntityId: jobId,
            targetUserId: req.session.userId!,
            targetUserType: "agency",
            targetLabel: updatedJob.title,
            reason: "Offre soumise à nouveau par une agence en plan standard — validation requise avant mise en ligne.",
            reportedBy: "system",
            priority: "medium",
          });
        }
      }

      res.json(updatedJob);

      // A draft or closed job just went live: same candidate alerts as a
      // job published straight from POST /api/jobs.
      if (updatedJob?.isActive && !job.isActive) {
        notifyMatchingCandidatesForJob(updatedJob);
        notifierAbonnesEmployeur(updatedJob);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error updating job:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour de l'offre" });
    }
  });

  app.delete("/api/jobs/:id", requireAuth, async (req, res) => {
    try {
      const jobId = String(req.params.id);
      const job = await storage.getJobPosting(jobId);
      if (!job) {
        return res.status(404).json({ message: "Offre non trouvée" });
      }

      if (job.companyId !== req.session.userId && job.agencyId !== req.session.userId) {
        return res.status(403).json({ message: "Non autorisé à supprimer cette offre" });
      }

      await storage.deleteJobPosting(jobId);
      res.json({ message: "Offre supprimée avec succès" });
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ message: "Erreur lors de la suppression de l'offre" });
    }
  });

  // Full candidate profiles (CV, skills, salary expectation) — restricted to
  // the agency dashboard's own candidate-management tools, its only real
  // consumers. Admins must go through the separately gated, audit-logged
  // /api/admin/candidates/:id instead — never through this route, or the
  // permission/audit system above would be trivially bypassable.
  app.get("/api/candidates", requireRole("agency"), async (req, res) => {
    try {
      const candidates = await storage.getAllCandidates();
      const candidatesWithoutPasswords = candidates.map(({ password: _, ...rest }) => rest);
      res.json(candidatesWithoutPasswords);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des candidats" });
    }
  });

  // Also unauthenticated before this pass — anyone could create candidate
  // accounts. Its only consumer is the agency's "add a candidate on behalf
  // of a client" form.
  app.post("/api/candidates", requireRole("agency"), async (req, res) => {
    try {
      const { user: userData, profile: profileData } = req.body;

      if (!userData?.email || !userData?.fullName || !userData?.phone) {
        return res.status(400).json({ message: "Email, nom et téléphone requis" });
      }

      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Un utilisateur avec cet email existe déjà" });
      }

      const hashedPassword = await bcrypt.hash(userData.password || Math.random().toString(36).slice(-8), 12);

      const newUser = await storage.createUser({
        email: userData.email,
        password: hashedPassword,
        fullName: userData.fullName,
        phone: userData.phone,
        city: userData.city || null,
        // Aucun pays inventé (il valait « Sénégal » d'office).
        country: userData.country || null,
        userType: "candidate",
      });

      if (profileData) {
        await storage.createCandidateProfile({
          userId: newUser.id,
          title: profileData.title || null,
          bio: profileData.bio || null,
          skills: profileData.skills || null,
          experience: profileData.experience || null,
          experienceYears: profileData.experienceYears || null,
          education: profileData.education || null,
          educationLevel: profileData.educationLevel || null,
          languages: profileData.languages || null,
          availableFrom: profileData.availableFrom || null,
          salaryExpectation: profileData.salaryExpectation || null,
          whatsappNumber: profileData.whatsappNumber || userData.phone,
          preferredContact: profileData.preferredContact || "whatsapp",
        });
      }

      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating candidate:", error);
      res.status(500).json({ message: "Erreur lors de la création du candidat" });
    }
  });

  // Agencies: unrestricted (candidate sourcing is their core business).
  // Companies: only candidates who actually applied to one of their own
  // jobs — never a general "browse candidates" capability.
  app.get("/api/candidates/:id", requireAuth, async (req, res) => {
    try {
      const requester = await storage.getUser(req.session.userId!);
      if (!requester) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }
      if (requester.userType === "company") {
        const canView = await storage.hasApplicationToOrganization(req.params.id as string, requester.id);
        if (!canView) {
          return res.status(403).json({ message: "Ce candidat n'a pas postulé à l'une de vos offres" });
        }
      } else if (requester.userType !== "agency") {
        return res.status(403).json({ message: "Non autorisé" });
      }

      const candidateId = String(req.params.id);
      const candidate = await storage.getUser(candidateId);

      if (!candidate || candidate.userType !== "candidate") {
        return res.status(404).json({ message: "Candidat non trouvé" });
      }

      const profile = await storage.getCandidateProfile(candidateId);
      const { password: _, ...candidateWithoutPassword } = candidate;
      // CV vocal : jamais l'audio dans la réponse ; son adresse d'écoute
      // seulement pour un recruteur qui a reçu une candidature du candidat.
      const peutEcouter = await storage.hasApplicationToOrganization(candidateId, requester.id);
      const cvVocal = peutEcouter ? cvVocalPourReponse(profile, `/api/candidates/${candidateId}/cv-vocal`) : null;

      res.json({ ...candidateWithoutPassword, profile: profile ? { ...profile, voiceCvUrl: cvVocal?.url ?? null, cvVocal, profileEmbedding: undefined } : profile });
    } catch (error) {
      console.error("Error fetching candidate:", error);
      res.status(500).json({ message: "Erreur lors de la récupération du candidat" });
    }
  });

  // "Envoyer message" — no chat/inbox system exists, so this reuses the
  // real notifications the candidate already sees on /candidate-applications.
  // Same authorization as the profile route above (agency unrestricted,
  // company scoped to its own applicants).
  app.post("/api/candidates/:id/message", requireAuth, async (req, res) => {
    try {
      const requester = await storage.getUser(req.session.userId!);
      if (!requester) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }
      if (requester.userType === "company") {
        const canMessage = await storage.hasApplicationToOrganization(req.params.id as string, requester.id);
        if (!canMessage) {
          return res.status(403).json({ message: "Ce candidat n'a pas postulé à l'une de vos offres" });
        }
      } else if (requester.userType !== "agency") {
        return res.status(403).json({ message: "Non autorisé" });
      }

      const messageBody = z.string().trim().min(1).max(2000).parse(req.body.message);
      const candidate = await storage.getUser(req.params.id as string);
      if (!candidate || candidate.userType !== "candidate") {
        return res.status(404).json({ message: "Candidat non trouvé" });
      }

      const senderProfile = requester.userType === "company"
        ? await storage.getCompanyProfile(requester.id)
        : await storage.getAgencyProfile(requester.id);
      const senderName = requester.userType === "company"
        ? (senderProfile as any)?.companyName ?? requester.fullName
        : (senderProfile as any)?.agencyName ?? requester.fullName;

      await storage.createNotification({
        userId: candidate.id,
        type: "application_update",
        title: `Message de ${senderName}`,
        message: messageBody,
        actionUrl: "/candidate-applications",
      });

      res.status(201).json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Message invalide" });
      }
      console.error("Error sending message to candidate:", error);
      res.status(500).json({ message: "Erreur lors de l'envoi du message" });
    }
  });

  // /api/agencies and /api/companies are public directory endpoints (no
  // auth). They used to return whole `users` rows minus the password — which
  // leaked each prospect organization's claimToken, and with it a full
  // account takeover through POST /api/organizations/claim. Only an explicit
  // allowlist of public fields goes out now; never spread a users row here.
  const toPublicOrganizationUser = (user: User) => ({
    id: user.id,
    userType: user.userType,
    fullName: user.fullName,
    // A prospect account was created by an admin for a third party who
    // hasn't signed up: its contact details were never published by them.
    email: user.isProspect ? null : user.email,
    phone: user.isProspect ? null : user.phone,
    city: user.city,
    country: user.country,
    avatarUrl: user.avatarUrl,
    isVerified: user.isVerified,
    isProspect: user.isProspect,
    createdAt: user.createdAt,
  });

  app.get("/api/agencies", async (req, res) => {
    try {
      const agencies = await storage.getAllAgencies();
      res.json(agencies.map(({ profile, ...user }) => {
        const agencyProfile: AgencyProfile | undefined = profile;
        return {
          ...toPublicOrganizationUser(user),
          profile: agencyProfile ? {
            id: agencyProfile.id,
            agencyName: agencyProfile.agencyName,
            description: agencyProfile.description,
            specializations: agencyProfile.specializations,
            website: agencyProfile.website,
            licenseNumber: agencyProfile.licenseNumber,
            rccmNumber: agencyProfile.rccmNumber,
            verificationStatus: agencyProfile.verificationStatus,
            candidatesPlaced: agencyProfile.candidatesPlaced,
            totalPlacements: agencyProfile.totalPlacements,
            activePlacements: agencyProfile.activePlacements,
            rating: agencyProfile.rating ?? null,
            foundedYear: agencyProfile.foundedYear,
            employeeCount: agencyProfile.employeeCount,
            averageAge: agencyProfile.averageAge,
            genderRatioMale: agencyProfile.genderRatioMale,
            createdAt: agencyProfile.createdAt,
          } : null,
        };
      }));
    } catch (error) {
      console.error("Error fetching agencies:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des agences" });
    }
  });

  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies.map(({ profile, ...user }) => ({
        ...toPublicOrganizationUser(user),
        profile: profile ? {
          id: profile.id,
          companyName: profile.companyName,
          industry: profile.industry,
          description: profile.description,
          website: profile.website,
          rating: profile.rating ?? null,
          employeeCount: profile.employeeCount,
          foundedYear: profile.foundedYear,
          logoUrl: profile.logoUrl,
          coverImageUrl: profile.coverImageUrl,
          rccmNumber: profile.rccmNumber,
          createdAt: profile.createdAt,
        } : null,
      })));
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des entreprises" });
    }
  });

  // Accueil, « Entreprises qui recrutent en ce moment ». Les 6 secteurs de
  // l'accueil qui ont au moins une offre active, triés par nombre d'offres.
  // offresActives compte toutes les offres actives du secteur (anciennes
  // catégories comprises, voir secteurDeCategorie) ; entreprises ne liste que
  // les organisations qui ont coché visibleAccueil (opt-in), 4 au plus, par
  // nombre d'offres décroissant. Une requête SQL groupée, sans session.
  app.get("/api/accueil/secteurs", async (_req, res) => {
    try {
      const lignes = await storage.getOffresActivesParCategorieEtEmployeur();
      const secteurs: SecteurQuiRecrute[] = SECTEURS_ACCUEIL_BASE.map(({ libelle, valeur }) => {
        const cible = secteurDeCategorie(valeur);
        const duSecteur = lignes.filter((l) => secteurDeCategorie(l.category) === cible);
        const parEmployeur = new Map<string, EmployeurQuiRecrute & { offres: number }>();
        for (const l of duSecteur) {
          if (!l.visibleAccueil || !l.nom) continue;
          const deja = parEmployeur.get(l.organisationId);
          if (deja) deja.offres += l.offres;
          else parEmployeur.set(l.organisationId, { id: l.organisationId, nom: l.nom, logoUrl: l.logoUrl, offres: l.offres });
        }
        return {
          secteur: libelle,
          valeur,
          offresActives: duSecteur.reduce((total, l) => total + l.offres, 0),
          entreprises: Array.from(parEmployeur.values())
            .sort((a, b) => b.offres - a.offres || a.nom.localeCompare(b.nom, "fr"))
            .slice(0, 4)
            .map(({ offres: _offres, ...employeur }) => employeur),
        };
      });
      res.json(secteurs.filter((s) => s.offresActives > 0).sort((a, b) => b.offresActives - a.offresActives));
    } catch (error) {
      console.error("Error fetching home sectors:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des secteurs" });
    }
  });

  // Fired once on mount by agency-profile.tsx / company-profile.tsx —
  // counts genuine outside interest for the admin "Top organisations
  // visitées" statistic, same owner-exclusion logic as job view counts.
  app.post("/api/agencies/:id/view", async (req, res) => {
    try {
      const agencyId = String(req.params.id);
      if (req.session.userId !== agencyId) {
        await storage.incrementAgencyProfileView(agencyId);
      }
      res.status(204).end();
    } catch (error) {
      console.error("Error recording agency profile view:", error);
      res.status(500).json({ message: "Erreur lors de l'enregistrement de la consultation" });
    }
  });

  app.post("/api/companies/:id/view", async (req, res) => {
    try {
      const companyId = String(req.params.id);
      if (req.session.userId !== companyId) {
        await storage.incrementCompanyProfileView(companyId);
      }
      res.status(204).end();
    } catch (error) {
      console.error("Error recording company profile view:", error);
      res.status(500).json({ message: "Erreur lors de l'enregistrement de la consultation" });
    }
  });

  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      let profile: unknown = null;
      if (user.userType === "candidate") {
        profile = profilCandidatPourLui(user, await storage.getCandidateProfile(user.id));
      } else if (user.userType === "agency") {
        profile = await storage.getAgencyProfile(user.id);
      } else if (user.userType === "company") {
        profile = await storage.getCompanyProfile(user.id);
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, profile });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Erreur lors de la récupération du profil" });
    }
  });

  app.patch("/api/profile", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      const { userUpdates: rawUserUpdates, profileUpdates: rawProfileUpdates } = req.body;

      if (rawUserUpdates) {
        const userUpdates = selfUserUpdateSchema.parse(rawUserUpdates);
        await storage.updateUser(user.id, userUpdates);
      }

      let profile: unknown = null;
      if (rawProfileUpdates) {
        if (user.userType === "candidate") {
          const profileUpdates = candidateProfileSelfUpdateSchema.parse(rawProfileUpdates);
          const misAJour = await storage.updateCandidateProfile(user.id, profileUpdates);
          profile = profilCandidatPourLui((await storage.getUser(user.id)) ?? user, misAJour);
        } else if (user.userType === "agency") {
          const profileUpdates = agencyProfileSelfUpdateSchema.parse(rawProfileUpdates);
          profile = await storage.updateAgencyProfile(user.id, profileUpdates);
        } else if (user.userType === "company") {
          const profileUpdates = companyProfileSelfUpdateSchema.parse(rawProfileUpdates);
          profile = await storage.updateCompanyProfile(user.id, profileUpdates);
        }
      }

      const updatedUser = await storage.getUser(user.id);
      const { password: _, ...userWithoutPassword } = updatedUser!;
      res.json({ user: userWithoutPassword, profile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du profil" });
    }
  });

  // CV du candidat connecté : affiché dans le navigateur, ou téléchargé
  // avec ?telechargement=1. Remplace l'adresse data: (base64) qui partait
  // auparavant dans chaque réponse de /api/profile.
  app.get("/api/profile/cv", requireRole("candidate"), async (req, res) => {
    try {
      const profil = await storage.getCandidateProfile(req.session.userId!);
      const source = profil?.resumeUrl;
      if (!source) return res.status(404).json({ message: "Aucun CV enregistré" });
      const telechargement = req.query.telechargement === "1";
      // Fichier déjà dans le stockage d'objets : sa propre route le sert.
      if (!source.startsWith("data:")) {
        if (!source.startsWith("/")) return res.status(404).json({ message: "CV introuvable" });
        return res.redirect(302, source);
      }
      const m = source.match(/^data:([^;,]*)(;base64)?,([\s\S]*)$/);
      if (!m) return res.status(500).json({ message: "CV illisible" });
      const typeMime = profil.resumeMimeType || m[1] || "application/octet-stream";
      const contenu = m[2] ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]));
      const nom = nomFichierCv(profil.resumeFileName, typeMime);
      const nomAscii = nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "_");
      res.setHeader("Content-Type", typeMime);
      res.setHeader("Content-Length", String(contenu.length));
      res.setHeader("Content-Disposition", `${telechargement ? "attachment" : "inline"}; filename="${nomAscii}"; filename*=UTF-8''${encodeURIComponent(nom)}`);
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.end(contenu);
    } catch (error) {
      console.error("Error serving resume:", error);
      res.status(500).json({ message: "Erreur lors de la lecture du CV" });
    }
  });

  app.post("/api/profile/resume-chunk", requireRole("candidate"), async (req, res) => {
    try {
      cleanupOldResumeUploads();

      const chunkSchema = z.object({
        uploadId: z.string().min(6),
        fileName: z.string().min(1),
        mimeType: z.string().min(1),
        chunkIndex: z.number().int().min(0),
        totalChunks: z.number().int().min(1).max(400),
        chunkBase64: z.string().min(1),
      });

      const payload = chunkSchema.parse(req.body);
      const { uploadId, fileName, mimeType, chunkIndex, totalChunks, chunkBase64 } = payload;

      if (mimeType !== "application/pdf") {
        return res.status(400).json({ message: "Seuls les PDF sont autorisés." });
      }

      if (chunkIndex >= totalChunks) {
        return res.status(400).json({ message: "Index de chunk invalide." });
      }

      const chunkBuffer = Buffer.from(chunkBase64, "base64");
      if (!chunkBuffer.length) {
        return res.status(400).json({ message: "Chunk invalide." });
      }

      const key = `${req.session.userId}:${uploadId}`;
      let uploadState = resumeChunkUploads.get(key);

      if (!uploadState) {
        uploadState = {
          userId: req.session.userId!,
          fileName,
          mimeType,
          totalChunks,
          chunks: Array.from({ length: totalChunks }, () => null),
          createdAt: Date.now(),
        };
        resumeChunkUploads.set(key, uploadState);
      }

      if (uploadState.totalChunks !== totalChunks) {
        return res.status(400).json({ message: "Nombre de chunks incohérent." });
      }

      uploadState.chunks[chunkIndex] = chunkBuffer;

      const receivedChunks = uploadState.chunks.filter(Boolean).length;
      const isComplete = receivedChunks === totalChunks;

      if (!isComplete) {
        return res.json({ success: true, completed: false, receivedChunks, totalChunks });
      }

      const orderedChunks = uploadState.chunks as Buffer[];
      const fileBuffer = Buffer.concat(orderedChunks);

      if (fileBuffer.length > MAX_RESUME_BYTES) {
        resumeChunkUploads.delete(key);
        return res.status(400).json({ message: "Le CV doit faire 5 Mo maximum." });
      }

      let resumeUrl = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
      try {
        resumeUrl = await uploadToObjectStorage("resumes", req.session.userId!, fileBuffer, mimeType);
      } catch (err) {
        console.warn("Object storage unavailable, storing resume inline:", (err as Error).message);
      }

      await storage.updateCandidateProfile(req.session.userId!, {
        resumeUrl,
        resumeFileName: fileName,
        resumeMimeType: mimeType,
      });

      resumeChunkUploads.delete(key);

      return res.json({
        success: true,
        completed: true,
        resumeFileName: fileName,
        resumeMimeType: mimeType,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Payload invalide", errors: error.errors });
      }

      console.error("Error uploading resume chunk:", error);
      return res.status(500).json({ message: "Erreur lors de l'upload du CV" });
    }
  });

  app.post("/api/applications", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.userType !== "candidate") {
        return res.status(403).json({ message: "Seuls les candidats peuvent postuler" });
      }

      const existingApplications = await storage.getApplicationsByCandidate(user.id);
      const alreadyApplied = existingApplications.some((app) => app.jobId === req.body.jobId);
      if (alreadyApplied) {
        return res.status(400).json({ message: "Vous avez déjà postulé à cette offre" });
      }

      const validatedData = insertApplicationSchema.parse({
        ...req.body,
        candidateId: user.id,
      });

      const job = await storage.getJobPosting(validatedData.jobId);
      if (!job) {
        return res.status(404).json({ message: "Offre non trouvée" });
      }

      const candidateProfile = await storage.getCandidateProfile(user.id);
      const { score: matchScore } = calculateMatchScore(
        { skills: candidateProfile?.skills, city: user.city, experienceYears: candidateProfile?.experienceYears },
        { requiredSkills: job.requiredSkills, location: job.location, experienceMin: job.experienceMin },
      );

      const application = await storage.createApplication({
        ...validatedData,
        matchScore,
      });

      const recipientId = job.agencyId || job.companyId;
      if (recipientId) {
        await storage.createNotification({
          userId: recipientId,
          type: "application_update",
          title: "Nouvelle candidature",
          message: `${user.fullName} a postulé à l'offre "${job.title}".`,
          actionUrl: job.agencyId ? "/agency/missions" : "/company/applications",
        });
      }

      res.status(201).json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Erreur lors de la candidature" });
    }
  });

  // Backs the "Heart" save button on job-detail.tsx / jobs.tsx.
  app.get("/api/saved-jobs", requireRole("candidate"), async (req, res) => {
    try {
      const saved = await storage.getSavedJobsByCandidate(req.session.userId!);
      res.json(saved);
    } catch (error) {
      console.error("Error fetching saved jobs:", error);
      res.status(500).json({ message: "Erreur lors du chargement des offres sauvegardées" });
    }
  });

  app.post("/api/saved-jobs", requireRole("candidate"), async (req, res) => {
    try {
      const jobId = String(req.body.jobId ?? "");
      if (!jobId) {
        return res.status(400).json({ message: "jobId requis" });
      }
      const job = await storage.getJobPosting(jobId);
      if (!job) {
        return res.status(404).json({ message: "Offre non trouvée" });
      }
      const saved = await storage.saveJob(req.session.userId!, jobId);
      res.status(201).json(saved);
    } catch (error) {
      console.error("Error saving job:", error);
      res.status(500).json({ message: "Erreur lors de la sauvegarde de l'offre" });
    }
  });

  app.delete("/api/saved-jobs/:jobId", requireRole("candidate"), async (req, res) => {
    try {
      await storage.unsaveJob(req.session.userId!, String(req.params.jobId));
      res.status(204).end();
    } catch (error) {
      console.error("Error unsaving job:", error);
      res.status(500).json({ message: "Erreur lors de la suppression de l'offre sauvegardée" });
    }
  });

  app.get("/api/applications", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      let applications;
      if (user.userType === "candidate") {
        // ?limite=N : les N plus récentes (1 à 100).
        const limite = Number.parseInt(String(req.query.limite ?? ""), 10);
        applications = await storage.getApplicationsByCandidateWithJobs(
          user.id,
          Number.isFinite(limite) && limite > 0 ? Math.min(limite, 100) : undefined,
        );
      } else {
        return res.status(403).json({ message: "Non autorisé" });
      }

      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des candidatures" });
    }
  });

  app.get("/api/jobs/:jobId/applications", requireAuth, async (req, res) => {
    try {
      const jobId = String(req.params.jobId);
      const job = await storage.getJobPosting(jobId);
      if (!job) {
        return res.status(404).json({ message: "Offre non trouvée" });
      }

      if (job.companyId !== req.session.userId && job.agencyId !== req.session.userId) {
        return res.status(403).json({ message: "Non autorisé à voir les candidatures" });
      }

      const applications = await storage.getApplicationsByJob(jobId);
      const enriched = await Promise.all(
        applications.map(async (application) => {
          const candidate = await storage.getUser(application.candidateId);
          const candidateProfile = await storage.getCandidateProfile(application.candidateId);
          // Why the score is what it is, from the same V0 criteria. The
          // score itself stays the one stored when the candidate applied.
          const { details } = calculateMatchScore(
            { skills: candidateProfile?.skills, city: candidate?.city, experienceYears: candidateProfile?.experienceYears },
            { requiredSkills: job.requiredSkills, location: job.location, experienceMin: job.experienceMin },
          );
          return {
            id: application.id,
            jobId: application.jobId,
            status: application.status ?? "pending",
            matchScore: application.matchScore ? Math.round(application.matchScore) : 0,
            matchExplanation: explainMatchScore(details),
            createdAt: application.createdAt,
            voiceIntroUrl: application.voiceIntroUrl ?? null,
            candidate: candidate
              ? {
                  id: candidate.id,
                  name: candidate.fullName,
                  email: candidate.email,
                  phone: candidate.phone,
                  city: candidate.city,
                  avatarUrl: candidate.avatarUrl,
                  title: candidateProfile?.title ?? null,
                  resumeUrl: candidateProfile?.resumeUrl ?? null,
                  resumeFileName: candidateProfile?.resumeFileName ?? null,
                  // Le recruteur a reçu cette candidature : il peut écouter le
                  // CV vocal actuel du candidat (route, pas l'audio).
                  cvVocal: cvVocalPourReponse(candidateProfile, `/api/candidates/${candidate.id}/cv-vocal`),
                }
              : null,
          };
        }),
      );
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching job applications:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des candidatures" });
    }
  });

  // ---- Recruitment Kanban board (company + agency) ----
  // Cross-job overview for the drag-and-drop pipeline board — deliberately
  // separate from GET /api/jobs/:jobId/applications above, which stays
  // scoped to one job at a time for the existing per-offer table views.
  // Only real ApplicationStatus values are used as columns; "Entretien"
  // covers both interview_proposed and interview (the only two states this
  // app actually tracks for interviews — there's no second "client
  // interview" stage in the data model, so the board doesn't invent one).
  // Rejected/withdrawn applications are left off the active board, same as
  // the existing "en pipeline" KPI convention elsewhere in this file.
  const boardActiveStatuses = ["pending", "reviewing", "shortlisted", "interview_proposed", "interview", "offered", "hired"] as const;

  async function buildBoardCard(application: Application, jobTitle: string, isUrgent: boolean, clientCompanyName: string | null) {
    const [candidate, candidateProfile] = await Promise.all([
      storage.getUser(application.candidateId),
      storage.getCandidateProfile(application.candidateId),
    ]);
    const statusChangedAt = application.statusChangedAt ?? application.updatedAt ?? application.createdAt ?? new Date();
    const daysInStage = Math.max(0, Math.floor((Date.now() - new Date(statusChangedAt).getTime()) / (1000 * 60 * 60 * 24)));

    return {
      id: application.id,
      jobId: application.jobId,
      jobTitle,
      clientCompanyName,
      stage: application.status ?? "pending",
      matchScore: application.matchScore ? Math.round(application.matchScore) : 0,
      isPriority: isUrgent,
      daysInStage,
      statusChangedAt,
      appliedAt: application.createdAt,
      candidate: candidate
        ? {
            id: candidate.id,
            name: candidate.fullName,
            avatarUrl: candidate.avatarUrl,
            title: candidateProfile?.title ?? null,
            skills: (candidateProfile?.skills ?? []).slice(0, 2),
          }
        : null,
    };
  }

  app.get("/api/company/applications-board", requireRole("company"), async (req, res) => {
    try {
      const jobs = await storage.getJobPostingsByCompany(req.session.userId!);
      const cards = (
        await Promise.all(
          jobs.map(async (job) => {
            const applications = (await storage.getApplicationsByJob(job.id)).filter((application) =>
              (boardActiveStatuses as readonly string[]).includes(application.status ?? "pending"),
            );
            return Promise.all(applications.map((application) => buildBoardCard(application, job.title, !!job.isUrgent, null)));
          }),
        )
      ).flat();
      res.json(cards);
    } catch (error) {
      console.error("Error fetching company applications board:", error);
      res.status(500).json({ message: "Erreur lors du chargement du pipeline" });
    }
  });

  app.get("/api/agency/applications-board", requireRole("agency"), async (req, res) => {
    try {
      const jobs = await storage.getJobPostingsByAgency(req.session.userId!);
      const companyCache = new Map<string, string>();
      const cards = (
        await Promise.all(
          jobs.map(async (job) => {
            if (!companyCache.has(job.companyId)) {
              const company = await storage.getCompanyProfile(job.companyId);
              const companyUser = company ? null : await storage.getUser(job.companyId);
              companyCache.set(job.companyId, company?.companyName ?? companyUser?.fullName ?? "Client");
            }
            const applications = (await storage.getApplicationsByJob(job.id)).filter((application) =>
              (boardActiveStatuses as readonly string[]).includes(application.status ?? "pending"),
            );
            return Promise.all(
              applications.map((application) =>
                buildBoardCard(application, job.title, !!job.isUrgent, companyCache.get(job.companyId) ?? "Client"),
              ),
            );
          }),
        )
      ).flat();
      res.json(cards);
    } catch (error) {
      console.error("Error fetching agency applications board:", error);
      res.status(500).json({ message: "Erreur lors du chargement du pipeline" });
    }
  });

  app.patch("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const applicationId = String(req.params.id);
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Candidature non trouvée" });
      }

      const job = await storage.getJobPosting(application.jobId);
      if (!job) {
        return res.status(404).json({ message: "Offre non trouvée" });
      }

      if (job.companyId !== req.session.userId && job.agencyId !== req.session.userId) {
        return res.status(403).json({ message: "Non autorisé à modifier cette candidature" });
      }

      const updates = applicationUpdateSchema.parse(req.body);
      const isRealStatusChange = updates.status !== undefined && updates.status !== application.status;
      const updatedApplication = await storage.updateApplication(applicationId, {
        ...updates,
        ...(isRealStatusChange ? { statusChangedAt: new Date() } : {}),
      });

      // A hire (direct or agency-sourced) makes this person part of the
      // company's real workforce — without this, "hired" was just a status
      // label with no lasting record anywhere (see employee-management's
      // operational-module state, the same generic per-company JSONB store
      // the "Employés" screen itself reads/writes). Idempotent on
      // candidateId so re-saving an already-hired application, or a
      // rejected->hired->hired edge case, never creates a duplicate fiche.
      // On an agency's own mission companyId is the agency itself: the hire
      // becomes a placement at the client via « Affectations » instead.
      const isAgencyOwnMission = !!job.agencyId && job.companyId === job.agencyId;
      if (updates.status === "hired" && application.status !== "hired" && !isAgencyOwnMission) {
        try {
          const candidate = await storage.getUser(application.candidateId);
          if (candidate) {
            const existingState = await storage.getCompanyOperationalState(job.companyId, "employee");
            const employees = (existingState?.state?.employees as any[] | undefined) ?? [];
            const documents = (existingState?.state?.documents as any[] | undefined) ?? [];
            const alreadyOnRoster = employees.some((e) => e.candidateId === application.candidateId);
            if (!alreadyOnRoster) {
              const nextId = employees.reduce((max, e) => Math.max(max, e.id ?? 0), 0) + 1;
              const newEmployee = {
                id: nextId,
                candidateId: application.candidateId,
                applicationId: application.id,
                name: candidate.fullName,
                email: candidate.email,
                phone: candidate.phone ?? "",
                department: "",
                position: job.title,
                type: "Non renseigné",
                startDate: new Date().toISOString().split("T")[0],
                status: "onboarding",
                role: "employee",
                manager: null,
                location: job.location,
              };
              await storage.setCompanyOperationalState(job.companyId, "employee", {
                employees: [...employees, newEmployee],
                documents,
              });
            }
          }
        } catch (error) {
          console.error("Error creating employee roster entry on hire:", error);
        }
      }

      if (updates.status && updates.status !== application.status) {
        const statusMessages: Partial<Record<typeof updates.status, string>> = {
          shortlisted: "Votre candidature a été présélectionnée",
          interview: "Vous avez été invité(e) à un entretien",
          offered: "Une offre vous a été faite",
          hired: "Votre candidature a été retenue",
          rejected: "Votre candidature n'a pas été retenue",
        };
        const message = statusMessages[updates.status];
        if (message) {
          await storage.createNotification({
            userId: application.candidateId,
            type: "application_update",
            title: `Candidature pour "${job.title}"`,
            message,
            actionUrl: "/candidate-applications",
          });
          // Same news on WhatsApp for candidates who use it — 24h-window
          // aware, never dropped (see the header of whatsapp-bot.ts).
          // Fire-and-forget: Meta's latency must not slow the recruiter down.
          notifyApplicationStatusChange({
            candidateId: application.candidateId,
            applicationId: application.id,
            jobTitle: job.title,
            status: updates.status,
            message,
          }).catch((error) => console.error(`[WhatsApp] Status notification failed for application ${application.id}:`, error));
        }
      }

      res.json(updatedApplication);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour de la candidature" });
    }
  });

  // Espace candidat, « Relancer » : une notification à l'employeur, pour une
  // candidature sans réponse depuis SEUIL_RELANCE_JOURS jours, au plus une
  // fois tous les INTERVALLE_RELANCE_JOURS jours.
  app.post("/api/applications/:id/relance", requireRole("candidate"), async (req, res) => {
    try {
      const application = await storage.getApplication(String(req.params.id));
      if (!application) return res.status(404).json({ message: "Candidature non trouvée" });
      if (application.candidateId !== req.session.userId) return res.status(403).json({ message: "Non autorisé à relancer cette candidature" });
      if (!(STATUTS_SANS_REPONSE as readonly string[]).includes(application.status ?? "pending")) {
        return res.status(400).json({ message: "L'employeur a déjà répondu à cette candidature." });
      }
      const depuis = application.statusChangedAt ?? application.createdAt;
      const jours = depuis ? joursEcoules(depuis) : 0;
      if (jours < SEUIL_RELANCE_JOURS) {
        return res.status(400).json({ message: `Vous pourrez relancer ${SEUIL_RELANCE_JOURS} jours après votre candidature.` });
      }
      if (application.lastFollowUpAt && Date.now() - new Date(application.lastFollowUpAt).getTime() < INTERVALLE_RELANCE_JOURS * JOUR_MS) {
        return res.status(429).json({ message: `Vous avez déjà relancé cet employeur. Nouvelle relance possible ${INTERVALLE_RELANCE_JOURS} jours après la précédente.` });
      }
      const job = await storage.getJobPosting(application.jobId);
      const recipientId = job?.agencyId || job?.companyId;
      if (!job || !recipientId) return res.status(404).json({ message: "Offre non trouvée" });
      const candidate = await storage.getUser(application.candidateId);
      await storage.createNotification({
        userId: recipientId,
        type: "application_update",
        title: "Relance d'un candidat",
        message: `${candidate?.fullName ?? "Un candidat"} relance sa candidature pour « ${job.title} », sans réponse depuis ${libelleDuree(jours)}.`,
        actionUrl: job.agencyId ? "/agency/missions" : "/company/applications",
      });
      const misAJour = await storage.updateApplication(application.id, { lastFollowUpAt: new Date() });
      res.json(misAJour);
    } catch (error) {
      console.error("Error following up application:", error);
      res.status(500).json({ message: "Erreur lors de la relance de la candidature" });
    }
  });

  // Espace candidat, « Attendre encore » : la tâche de cette candidature
  // revient dans REPORT_RAPPEL_JOURS jours.
  app.post("/api/applications/:id/rappel", requireRole("candidate"), async (req, res) => {
    try {
      const application = await storage.getApplication(String(req.params.id));
      if (!application) return res.status(404).json({ message: "Candidature non trouvée" });
      if (application.candidateId !== req.session.userId) return res.status(403).json({ message: "Non autorisé à modifier cette candidature" });
      if (!(STATUTS_SANS_REPONSE as readonly string[]).includes(application.status ?? "pending")) {
        return res.status(400).json({ message: "L'employeur a déjà répondu à cette candidature." });
      }
      const misAJour = await storage.updateApplication(application.id, { reminderSnoozedUntil: new Date(Date.now() + REPORT_RAPPEL_JOURS * JOUR_MS) });
      res.json(misAJour);
    } catch (error) {
      console.error("Error snoozing application reminder:", error);
      res.status(500).json({ message: "Erreur lors du report du rappel" });
    }
  });

  // Self-service withdrawal — candidate-only, and only while the
  // candidature is still active (an offer/hire/rejection is a decision the
  // recruiter already made; withdrawing at that point doesn't mean anything).
  const withdrawableStatuses = ["pending", "reviewing", "shortlisted", "interview_proposed", "interview"];
  app.patch("/api/applications/:id/withdraw", requireRole("candidate"), async (req, res) => {
    try {
      const applicationId = String(req.params.id);
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Candidature non trouvée" });
      }
      if (application.candidateId !== req.session.userId) {
        return res.status(403).json({ message: "Non autorisé à modifier cette candidature" });
      }
      if (!withdrawableStatuses.includes(application.status ?? "pending")) {
        return res.status(400).json({ message: "Cette candidature ne peut plus être retirée." });
      }

      const updatedApplication = await storage.updateApplication(applicationId, { status: "withdrawn" });

      const job = await storage.getJobPosting(application.jobId);
      const candidate = await storage.getUser(application.candidateId);
      const recipientId = job?.agencyId || job?.companyId;
      if (job && recipientId) {
        await storage.createNotification({
          userId: recipientId,
          type: "application_update",
          title: "Candidature retirée",
          message: `${candidate?.fullName ?? "Le candidat"} a retiré sa candidature pour "${job.title}".`,
          actionUrl: job.agencyId ? "/agency/missions" : "/company/applications",
        });
      }

      res.json(updatedApplication);
    } catch (error) {
      console.error("Error withdrawing application:", error);
      res.status(500).json({ message: "Erreur lors du retrait de la candidature" });
    }
  });

  // Recruiter proposes candidate-choice interview times ("Planifier un
  // entretien" — BambooHR-style self-scheduling, not a single fixed date).
  app.post("/api/applications/:id/interview-slots", requireAuth, async (req, res) => {
    try {
      const applicationId = String(req.params.id);
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Candidature non trouvée" });
      }
      const job = await storage.getJobPosting(application.jobId);
      if (!job) {
        return res.status(404).json({ message: "Offre non trouvée" });
      }
      if (job.companyId !== req.session.userId && job.agencyId !== req.session.userId) {
        return res.status(403).json({ message: "Non autorisé" });
      }

      const body = z.object({
        slots: z.array(z.coerce.date()).min(1, "Proposez au moins un créneau").max(8, "8 créneaux maximum"),
      }).parse(req.body);

      const createdSlots = await storage.createInterviewSlots(applicationId, body.slots);
      await storage.updateApplication(applicationId, { status: "interview_proposed" });

      const candidate = await storage.getUser(application.candidateId);
      const organizationName = job.companyId === req.session.userId
        ? (await storage.getCompanyProfile(req.session.userId))?.companyName
        : (await storage.getAgencyProfile(req.session.userId))?.agencyName;

      await storage.createNotification({
        userId: application.candidateId,
        type: "application_update",
        title: `Proposition d'entretien pour "${job.title}"`,
        message: `${organizationName ?? "Le recruteur"} vous propose ${body.slots.length} créneau${body.slots.length > 1 ? "x" : ""} d'entretien. Choisissez celui qui vous convient.`,
        actionUrl: "/candidate-applications",
      });

      if (candidate?.email) {
        const slotsListHtml = createdSlots
          .map((slot) => `<li>${new Date(slot.startTime).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}</li>`)
          .join("");
        await sendEmail({
          to: candidate.email,
          subject: `Proposition d'entretien — ${job.title}`,
          html: `
            <p>Bonjour ${candidate.fullName},</p>
            <p><strong>${organizationName ?? "Le recruteur"}</strong> vous propose un entretien pour le poste <strong>${job.title}</strong>. Choisissez le créneau qui vous convient (premier arrivé, premier servi) :</p>
            <ul>${slotsListHtml}</ul>
            <p>Connectez-vous sur BaaraMatch, rubrique "Mes candidatures", pour sélectionner votre créneau.</p>
          `,
        });
      }

      res.status(201).json(createdSlots);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message ?? "Données invalides" });
      }
      console.error("Error proposing interview slots:", error);
      res.status(500).json({ message: "Erreur lors de la proposition de créneaux" });
    }
  });

  app.get("/api/applications/:id/interview-slots", requireAuth, async (req, res) => {
    try {
      const applicationId = String(req.params.id);
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Candidature non trouvée" });
      }
      const job = await storage.getJobPosting(application.jobId);
      const isRecruiter = !!job && (job.companyId === req.session.userId || job.agencyId === req.session.userId);
      const isCandidate = application.candidateId === req.session.userId;
      if (!isRecruiter && !isCandidate) {
        return res.status(403).json({ message: "Non autorisé" });
      }

      const slots = await storage.getInterviewSlotsByApplication(applicationId);
      res.json(slots);
    } catch (error) {
      console.error("Error fetching interview slots:", error);
      res.status(500).json({ message: "Erreur lors du chargement des créneaux" });
    }
  });

  // Candidate self-scheduling — first click wins (see
  // storage.claimInterviewSlot for the atomic guard).
  app.post("/api/applications/:id/interview-slots/:slotId/select", requireRole("candidate"), async (req, res) => {
    try {
      const applicationId = String(req.params.id);
      const application = await storage.getApplication(applicationId);
      if (!application || application.candidateId !== req.session.userId) {
        return res.status(404).json({ message: "Candidature non trouvée" });
      }

      const claimed = await storage.claimInterviewSlot(String(req.params.slotId), applicationId);
      if (!claimed) {
        return res.status(409).json({ message: "Ce créneau n'est plus disponible — un autre a peut-être déjà été choisi." });
      }

      await storage.updateApplication(applicationId, {
        status: "interview",
        interviewDate: claimed.startTime,
      });

      const job = await storage.getJobPosting(application.jobId);
      const candidate = await storage.getUser(application.candidateId);
      const recipientId = job?.agencyId || job?.companyId;
      if (job && recipientId) {
        await storage.createNotification({
          userId: recipientId,
          type: "application_update",
          title: "Entretien confirmé",
          message: `${candidate?.fullName ?? "Le candidat"} a choisi un créneau pour l'entretien "${job.title}" : ${new Date(claimed.startTime).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}.`,
          actionUrl: "/company/applications",
        });
      }

      res.json({ application: await storage.getApplication(applicationId), slot: claimed });
    } catch (error) {
      console.error("Error selecting interview slot:", error);
      res.status(500).json({ message: "Erreur lors de la sélection du créneau" });
    }
  });

  // Calendar view (company + agency) — every confirmed interview
  // (interviewDate set) across the requester's own jobs.
  app.get("/api/interviews", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || (user.userType !== "company" && user.userType !== "agency")) {
        return res.status(403).json({ message: "Non autorisé" });
      }
      const interviews = await storage.getUpcomingInterviewsForOrganization(user.id);
      res.json(interviews);
    } catch (error) {
      console.error("Error fetching interviews:", error);
      res.status(500).json({ message: "Erreur lors du chargement des entretiens" });
    }
  });

  app.get("/api/dashboard/agency", requireRole("agency"), async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      const profile = await storage.getAgencyProfile(user.id);
      const [candidates, jobs, placements, companies] = await Promise.all([
        storage.getAllCandidates(),
        storage.getJobPostingsByAgency(user.id),
        storage.getAgencyPlacements(user.id),
        storage.getAllCompanies(),
      ]);

      const jobsWithApplications = await Promise.all(
        jobs.map(async (job) => ({
          job,
          applications: await storage.getApplicationsByJob(job.id),
        })),
      );

      // The client of a placement is the agency's fiche (it may not have a
      // BaaraMatch account), falling back to the registered company.
      const clientsById = await loadAgencyClientsById(user.id);
      const placementClient = (placement: { agencyClientId: string | null; companyId: string | null }) => {
        const fiche = placement.agencyClientId ? clientsById.get(placement.agencyClientId) : undefined;
        const company = placement.companyId ? companies.find((item) => item.id === placement.companyId) : undefined;
        return {
          name: fiche?.name ?? company?.profile?.companyName ?? company?.fullName ?? "Entreprise inconnue",
          sector: fiche?.sector ?? company?.profile?.industry ?? "Autre",
        };
      };

      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const totalApplications = jobsWithApplications.reduce(
        (sum, entry) => sum + entry.applications.length,
        0,
      );
      const pendingApplications = jobsWithApplications.reduce(
        (sum, entry) => sum + entry.applications.filter((application) => ["pending", "reviewing"].includes(application.status ?? "pending")).length,
        0,
      );
      const urgentMissions = jobs.filter((job) => job.isActive && job.isUrgent).length;
      const totalPlacements = placements.length;
      const placementsThisMonth = placements.filter((placement) => {
        const createdAt = placement.createdAt ? new Date(placement.createdAt) : null;
        return createdAt && createdAt >= startOfCurrentMonth && createdAt <= endOfCurrentMonth;
      }).length;
      const activePlacements = placements.filter((placement) => placement.status === "active");
      const completedPlacements = placements.filter((placement) => placement.status === "completed");
      const endingThisMonth = placements.filter((placement) => {
        const endDate = placement.endDate ? new Date(placement.endDate) : null;
        return endDate && endDate >= startOfCurrentMonth && endDate <= endOfCurrentMonth;
      }).length;
      const totalRevenueValue = placements.reduce((sum, placement) => sum + (placement.commissionAmount ?? 0), 0);
      const avgTimeToPlacement = placements.length === 0
        ? 0
        : Math.round(
            placements.reduce((sum, placement) => {
              if (!placement.createdAt || !placement.startDate) {
                return sum;
              }

              const createdAt = new Date(placement.createdAt).getTime();
              const startDate = new Date(placement.startDate).getTime();
              const days = Math.max(0, Math.round((startDate - createdAt) / (1000 * 60 * 60 * 24)));
              return sum + days;
            }, 0) / placements.length,
          );

      const fillRate = jobs.length === 0 ? 0 : Math.min(100, Math.round((totalPlacements / jobs.length) * 100));
      const relatedCompanyIds = new Set<string>();
      for (const job of jobs) {
        relatedCompanyIds.add(job.companyId);
      }
      for (const placement of placements) {
        if (placement.companyId) relatedCompanyIds.add(placement.companyId);
      }

      // Only companies this agency actually works with. There used to be a
      // "no relation yet → every company on the platform" fallback here,
      // which handed a brand-new agency the name and email of every
      // registered company. The client list now lives in the agency CRM.
      const relatedCompanies = companies
        .filter((company) => relatedCompanyIds.has(company.id))
        .map((company) => ({
          id: company.id,
          name: company.profile?.companyName ?? company.fullName,
          industry: company.profile?.industry ?? "Non défini",
          city: company.city,
          country: company.country,
          activeJobs: jobs.filter((job) => job.companyId === company.id && job.isActive).length,
          status: company.isVerified ? "active" : "pending",
          createdAt: company.createdAt,
        }))
        .sort((left, right) => left.name.localeCompare(right.name));

      const activeContracts = await Promise.all(
        activePlacements
          .sort((left, right) => {
            const leftEnd = left.endDate ? new Date(left.endDate).getTime() : Number.MAX_SAFE_INTEGER;
            const rightEnd = right.endDate ? new Date(right.endDate).getTime() : Number.MAX_SAFE_INTEGER;
            return leftEnd - rightEnd;
          })
          .slice(0, 8)
          .map(async (placement) => {
            const candidate = await storage.getUser(placement.candidateId);

            const endDate = placement.endDate ? new Date(placement.endDate) : null;
            const hasAlert = !!endDate && endDate.getTime() - now.getTime() <= 1000 * 60 * 60 * 24 * 30;
            const initials = (candidate?.fullName ?? "?")
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? "")
              .join("");

            return {
              id: placement.id,
              candidateName: candidate?.fullName ?? "Candidat inconnu",
              initials,
              company: placementClient(placement).name,
              status: hasAlert ? "imminent" : "active",
              endDate: endDate ? endDate.toISOString() : null,
              hasAlert,
            };
          }),
      );

      const placementStatusLabels: Record<string, string> = {
        active: "Actifs",
        completed: "Terminés",
        terminated: "Annulés",
        on_leave: "En pause",
      };

      const placementsByStatus = ["active", "completed", "terminated", "on_leave"]
        .map((status) => {
          const count = placements.filter((placement) => placement.status === status).length;
          const percentage = totalPlacements === 0 ? 0 : Math.round((count / totalPlacements) * 100);
          const color = status === "active"
            ? "bg-green-500"
            : status === "completed"
            ? "bg-blue-500"
            : status === "terminated"
            ? "bg-red-500"
            : "bg-amber-500";

          return {
            status: placementStatusLabels[status] ?? status,
            count,
            percentage,
            color,
          };
        })
        .filter((entry) => entry.count > 0 || totalPlacements === 0);

      const sectorMap = new Map<string, { count: number; revenue: number }>();
      for (const placement of placements) {
        const sector = placementClient(placement).sector;
        const current = sectorMap.get(sector) ?? { count: 0, revenue: 0 };
        current.count += 1;
        current.revenue += placement.commissionAmount ?? 0;
        sectorMap.set(sector, current);
      }

      const placementsBySector = Array.from(sectorMap.entries())
        .map(([sector, data]) => ({
          sector,
          count: data.count,
          percentage: totalPlacements === 0 ? 0 : Math.round((data.count / totalPlacements) * 100),
          revenue: `${(data.revenue / 1000).toFixed(0)}K XOF`,
        }))
        .sort((left, right) => right.count - left.count);

      const recentPlacements = await Promise.all(
        placements
          .sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime())
          .slice(0, 10)
          .map(async (placement) => {
            const [candidate, candidateProfile] = await Promise.all([
              storage.getUser(placement.candidateId),
              storage.getCandidateProfile(placement.candidateId),
            ]);

            return {
              id: placement.id,
              candidateName: candidate?.fullName ?? "Candidat inconnu",
              candidateTitle: candidateProfile?.title ?? "Profil candidat",
              companyName: placementClient(placement).name,
              sector: placementClient(placement).sector,
              startDate: placement.startDate,
              contractType: placement.contractType ?? "Non défini",
              status: placement.status === "terminated" ? "cancelled" : placement.status,
              monthlyRate: `${placement.salary ?? 0} ${placement.salaryCurrency ?? "XOF"}`,
            };
          }),
      );

      const monthlyTrends = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
        const nextDate = new Date(now.getFullYear(), now.getMonth() - (4 - index), 1);
        const placementsCount = placements.filter((placement) => {
          const createdAt = placement.createdAt ? new Date(placement.createdAt) : null;
          return createdAt && createdAt >= date && createdAt < nextDate;
        }).length;

        return {
          month: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(date),
          placements: placementsCount,
          target: Math.max(placementsCount, 1) + 2,
        };
      });

      // Overview block for the redesigned agency home: every figure is scoped
      // to this agency's own jobs/applications/placements (never the global
      // candidate pool) so the KPIs stay truthful for a brand-new agency.
      const DAY_MS = 1000 * 60 * 60 * 24;
      const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const allApplications = jobsWithApplications.flatMap((entry) => entry.applications);
      const isInRange = (value: Date | string | null | undefined, from: Date, to: Date) => {
        if (!value) return false;
        const date = new Date(value);
        return date >= from && date < to;
      };

      const activeCandidateIds = new Set<string>();
      for (const application of allApplications) {
        if (!["rejected", "withdrawn"].includes(application.status ?? "pending")) {
          activeCandidateIds.add(application.candidateId);
        }
      }
      for (const placement of activePlacements) {
        activeCandidateIds.add(placement.candidateId);
      }
      const newCandidatesThisMonth = new Set(
        allApplications
          .filter((application) => isInRange(application.createdAt, startOfCurrentMonth, endOfCurrentMonth))
          .map((application) => application.candidateId),
      ).size;
      const placedCandidateIds = new Set(activePlacements.map((placement) => placement.candidateId));

      const openJobs = jobsWithApplications.filter((entry) => entry.job.isActive);
      const openPositions = openJobs.reduce((sum, entry) => sum + (entry.job.positions ?? 1), 0);
      const filledPositions = openJobs.reduce(
        (sum, entry) => sum + Math.min(entry.job.positions ?? 1, entry.applications.filter((application) => application.status === "hired").length),
        0,
      );

      const daysUntil = (value: Date | string) => Math.ceil((new Date(value).getTime() - now.getTime()) / DAY_MS);
      const expiringPlacements = activePlacements.filter((placement) => {
        if (!placement.endDate) return false;
        const days = daysUntil(placement.endDate);
        return days >= 0 && days <= 30;
      });

      const revenueBetween = (from: Date, to: Date) =>
        placements
          .filter((placement) => isInRange(placement.createdAt, from, to))
          .reduce((sum, placement) => sum + (placement.commissionAmount ?? 0), 0);
      const revenueThisMonth = revenueBetween(startOfCurrentMonth, new Date(now.getFullYear(), now.getMonth() + 1, 1));
      const revenuePreviousMonth = revenueBetween(startOfPreviousMonth, startOfCurrentMonth);
      const revenueTrend = revenuePreviousMonth === 0
        ? null
        : Math.round(((revenueThisMonth - revenuePreviousMonth) / revenuePreviousMonth) * 1000) / 10;

      const activity = Array.from({ length: 6 }, (_, index) => {
        const from = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
        const to = new Date(now.getFullYear(), now.getMonth() - (4 - index), 1);
        return {
          month: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(from).replace(".", ""),
          placements: placements.filter((placement) => isInRange(placement.createdAt, from, to)).length,
          interviews: allApplications.filter((application) => isInRange(application.interviewDate, from, to)).length,
        };
      });

      const companyNameById = new Map(companies.map((company) => [company.id, company.profile?.companyName ?? company.fullName]));
      const priorityMissions = openJobs
        .map(({ job, applications }) => ({
          id: job.id,
          title: job.title,
          // An agency's own job has companyId = the agency: the real client
          // is the fiche the job was created for.
          company: (job.agencyClientId ? clientsById.get(job.agencyClientId)?.name : undefined) ?? companyNameById.get(job.companyId) ?? "Entreprise",
          location: job.location,
          category: job.category ?? null,
          candidates: applications.filter((application) => !["rejected", "withdrawn"].includes(application.status ?? "pending")).length,
          isUrgent: !!job.isUrgent,
          daysLeft: job.applicationDeadline ? daysUntil(job.applicationDeadline) : null,
        }))
        .filter((mission) => mission.isUrgent || (mission.daysLeft !== null && mission.daysLeft >= 0 && mission.daysLeft <= 14))
        .sort((left, right) => (left.daysLeft ?? Number.MAX_SAFE_INTEGER) - (right.daysLeft ?? Number.MAX_SAFE_INTEGER));

      const expiringContracts = await Promise.all(
        activePlacements
          .filter((placement) => placement.endDate && daysUntil(placement.endDate) >= 0)
          .sort((left, right) => new Date(left.endDate!).getTime() - new Date(right.endDate!).getTime())
          .slice(0, 6)
          .map(async (placement) => {
            const candidate = await storage.getUser(placement.candidateId);
            const job = placement.jobId ? jobs.find((item) => item.id === placement.jobId) : undefined;
            return {
              id: placement.id,
              candidateName: candidate?.fullName ?? "Candidat inconnu",
              position: placement.position ?? job?.title ?? "—",
              company: placementClient(placement).name,
              contractType: placement.contractType ?? null,
              endDate: new Date(placement.endDate!).toISOString(),
              daysLeft: daysUntil(placement.endDate!),
            };
          }),
      );

      const overview = {
        candidates: { active: activeCandidateIds.size, newThisMonth: newCandidatesThisMonth, placed: placedCandidateIds.size },
        missions: { open: openJobs.length, urgent: urgentMissions, openPositions, filledPositions },
        contracts: { active: activePlacements.length, expiringSoon: expiringPlacements.length },
        revenue: { thisMonth: revenueThisMonth, previousMonth: revenuePreviousMonth, trend: revenueTrend, currency: "XOF" },
        activity,
        priorityMissions: priorityMissions.slice(0, 5),
        priorityMissionsTotal: priorityMissions.length,
        expiringContracts,
      };

      const { password: _, ...userWithoutPassword } = user;
      res.json({
        user: userWithoutPassword,
        profile,
        overview,
        managedCandidates: candidates.length,
        activeJobs: jobs.filter(j => j.isActive).length,
        totalPlacements: profile?.candidatesPlaced || 0,
        verificationStatus: profile?.verificationStatus || "pending",
        relatedCompanies,
        kpis: {
          fillRate,
          urgentMissions,
          placedCandidates: totalPlacements,
          pendingApplications,
          revenue: totalRevenueValue,
          trends: {
            fillRate: 0,
            urgentMissions: `${urgentMissions} urgentes`,
            placedCandidates: placementsThisMonth,
            pendingApplications,
            revenue: 0,
          },
        },
        activeContracts,
        placementReport: {
          stats: {
            totalPlacements,
            placementsThisMonth,
            successRate: totalPlacements === 0 ? 0 : Math.round(((activePlacements.length + completedPlacements.length) / totalPlacements) * 100),
            avgTimeToPlacement,
            activeContracts: activePlacements.length,
            endingThisMonth,
            renewalRate: activePlacements.length === 0 ? 0 : Math.round(((activePlacements.length - endingThisMonth) / activePlacements.length) * 100),
            totalRevenue: `${(totalRevenueValue / 1000).toFixed(0)}K XOF`,
          },
          placementsByStatus,
          placementsBySector,
          recentPlacements,
          monthlyTrends,
        },
      });
    } catch (error) {
      console.error("Error fetching agency dashboard:", error);
      res.status(500).json({ message: "Erreur lors de la récupération du tableau de bord" });
    }
  });

  app.get("/api/dashboard/company", requireRole("company"), async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      const profile = await storage.getCompanyProfile(user.id);
      const [jobs, modules] = await Promise.all([
        storage.getJobPostingsByCompany(user.id),
        profile ? storage.getCompanyModules(profile.id) : Promise.resolve([]),
      ]);

      const jobsWithApplications = await Promise.all(
        jobs.map(async (job) => {
          const applications = await storage.getApplicationsByJob(job.id);
          return { job, applications };
        }),
      );

      const enrichedApplications = await Promise.all(
        jobsWithApplications.flatMap(({ job, applications }) =>
          applications.map(async (application) => {
            const candidate = await storage.getUser(application.candidateId);
            const candidateProfile = await storage.getCandidateProfile(application.candidateId);

            return {
              id: application.id,
              jobId: job.id,
              jobTitle: job.title,
              stage: application.status ?? "pending",
              appliedAt: application.createdAt,
              matchScore: application.matchScore ? Math.round(application.matchScore) : 0,
              candidate: candidate
                ? {
                    id: candidate.id,
                    name: candidate.fullName,
                    email: candidate.email,
                    phone: candidate.phone,
                    city: candidate.city,
                    avatarUrl: candidate.avatarUrl,
                    title: candidateProfile?.title ?? null,
                  }
                : null,
            };
          }),
        ),
      );

      const totalApplications = enrichedApplications.length;
      const interviewStages = ["interview", "offered"];
      const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const previousMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);

      const jobsPayload = jobsWithApplications
        .map(({ job, applications }) => {
          const newApplications = applications.filter((application) => {
            const createdAt = application.createdAt ? new Date(application.createdAt) : null;
            return createdAt && createdAt >= currentMonthStart;
          }).length;

          const hiredCount = applications.filter((application) => application.status === "hired").length;
          const daysOpen = Math.floor((Date.now() - new Date(job.createdAt ?? Date.now()).getTime()) / (1000 * 60 * 60 * 24));

          return {
            id: job.id,
            title: job.title,
            department: job.category ?? "Général",
            location: job.location,
            type: job.jobType,
            status: job.isActive ? "active" : "paused",
            postedAt: job.createdAt,
            salary: job.salaryRange ?? `${job.salaryMin ?? 0} - ${job.salaryMax ?? 0} ${job.salaryCurrency ?? "XOF"}`,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency,
            applications: applications.length,
            newApplications,
            description: job.description,
            isUrgent: !!job.isUrgent,
            requiredSkills: job.requiredSkills ?? [],
            positions: job.positions ?? 1,
            hiredCount,
            daysOpen,
          };
        })
        .sort((left, right) => new Date(right.postedAt ?? 0).getTime() - new Date(left.postedAt ?? 0).getTime());

      const totalJobs = jobs.length;
      const activeJobs = jobs.filter((job) => job.isActive).length;
      const interviewsScheduled = enrichedApplications.filter((application) => interviewStages.includes(application.stage)).length;
      const hiredApplications = enrichedApplications.filter((application) => application.stage === "hired").length;
      const previousMonthApplications = enrichedApplications.filter((application) => {
        const createdAt = application.appliedAt ? new Date(application.appliedAt) : null;
        return createdAt && createdAt >= previousMonthStart && createdAt < currentMonthStart;
      }).length;
      const currentMonthApplications = enrichedApplications.filter((application) => {
        const createdAt = application.appliedAt ? new Date(application.appliedAt) : null;
        return createdAt && createdAt >= currentMonthStart;
      }).length;

      const monthlyApplications = Array.from({ length: 6 }, (_, index) => {
        const start = new Date(new Date().getFullYear(), new Date().getMonth() - (5 - index), 1);
        const end = new Date(new Date().getFullYear(), new Date().getMonth() - (4 - index), 1);
        const count = enrichedApplications.filter((application) => {
          const createdAt = application.appliedAt ? new Date(application.appliedAt) : null;
          return createdAt && createdAt >= start && createdAt < end;
        }).length;

        return {
          month: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(start),
          count,
        };
      });

      const pipeline = [
        { key: "pending", label: "CV reçus", stages: ["pending"] },
        { key: "reviewing", label: "Présélection", stages: ["reviewing", "shortlisted"] },
        { key: "interview", label: "Entretien", stages: ["interview"] },
        { key: "offered", label: "Offre", stages: ["offered"] },
        { key: "hired", label: "Recrutés", stages: ["hired"] },
      ].map((step) => ({
        key: step.key,
        label: step.label,
        count: enrichedApplications.filter((application) => step.stages.includes(application.stage)).length,
      }));

      const { password: _, ...userWithoutPassword } = user;
      res.json({
        user: userWithoutPassword,
        profile,
        modules: modules.map((module) => module.moduleType),
        stats: {
          activeJobs,
          totalJobs,
          totalApplicationsReceived: totalApplications,
          interviewsScheduled,
          conversionRate: totalApplications === 0 ? 0 : Math.round((hiredApplications / totalApplications) * 100),
          monthlyApplicationsDelta: currentMonthApplications - previousMonthApplications,
        },
        jobs: jobsPayload,
        applications: enrichedApplications.sort(
          (left, right) => new Date(right.appliedAt ?? 0).getTime() - new Date(left.appliedAt ?? 0).getTime(),
        ),
        recentApplications: enrichedApplications
          .sort((left, right) => new Date(right.appliedAt ?? 0).getTime() - new Date(left.appliedAt ?? 0).getTime())
          .slice(0, 5),
        pipeline,
        monthlyApplications,
      });
    } catch (error) {
      console.error("Error fetching company dashboard:", error);
      res.status(500).json({ message: "Erreur lors de la récupération du tableau de bord" });
    }
  });

  const operationalModuleSchema = z.enum(operationalModuleKeys);

  app.get("/api/company/modules/:moduleKey/state", requireRole("company"), async (req, res) => {
    try {
      const moduleKey = operationalModuleSchema.parse(req.params.moduleKey);
      const state = await storage.getCompanyOperationalState(req.session.userId!, moduleKey);
      res.json({ state: state?.state ?? null, updatedAt: state?.updatedAt ?? null });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Module invalide", errors: error.errors });
      }
      console.error("Error fetching module state:", error);
      res.status(500).json({ message: "Erreur lors de la récupération du module" });
    }
  });

  app.patch("/api/company/modules/:moduleKey/state", requireRole("company"), async (req, res) => {
    try {
      const moduleKey = operationalModuleSchema.parse(req.params.moduleKey);
      const payload = z.object({ state: z.record(z.unknown()) }).parse(req.body);
      const state = await storage.setCompanyOperationalState(req.session.userId!, moduleKey, payload.state);
      res.json({ state: state.state, updatedAt: state.updatedAt });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error saving module state:", error);
      res.status(500).json({ message: "Erreur lors de la sauvegarde du module" });
    }
  });

  // ============================================
  // SEMANTIC MATCHING API ENDPOINTS
  // ============================================

  // Generate embedding for a job posting
  app.post("/api/embeddings/job/:id", requireRole("agency", "company"), async (req, res) => {
    try {
      const job = await storage.getJobPosting(req.params.id as string);
      if (!job) {
        return res.status(404).json({ message: "Offre non trouvée" });
      }

      // Check authorization
      if (job.companyId !== req.session.userId && job.agencyId !== req.session.userId) {
        return res.status(403).json({ message: "Non autorisé" });
      }

      const embedding = await generateJobEmbedding(job);
      await storage.updateJobPosting(job.id, { jobEmbedding: embedding });

      res.json({ message: "Embedding généré avec succès", jobId: job.id });
    } catch (error) {
      console.error("Error generating job embedding:", error);
      res.status(500).json({ message: "Erreur lors de la génération de l'embedding" });
    }
  });

  // Generate embedding for a candidate profile
  app.post("/api/embeddings/candidate", requireRole("candidate"), async (req, res) => {
    try {
      const profile = await storage.getCandidateProfile(req.session.userId!);
      if (!profile) {
        return res.status(404).json({ message: "Profil non trouvé" });
      }

      const embedding = await generateCandidateEmbedding(profile);
      await storage.updateCandidateProfile(req.session.userId!, { profileEmbedding: embedding });

      res.json({ message: "Embedding généré avec succès" });
    } catch (error) {
      console.error("Error generating candidate embedding:", error);
      res.status(500).json({ message: "Erreur lors de la génération de l'embedding" });
    }
  });

  // Generate embeddings for all jobs (agency/admin batch operation)
  app.post("/api/embeddings/jobs/batch", requireRole("agency"), async (req, res) => {
    try {
      const jobs = await storage.getAllJobPostings();
      const results: { jobId: string; success: boolean; error?: string }[] = [];

      for (const job of jobs) {
        try {
          if (!job.jobEmbedding) {
            const embedding = await generateJobEmbedding(job);
            await storage.updateJobPosting(job.id, { jobEmbedding: embedding });
            results.push({ jobId: job.id, success: true });
          } else {
            results.push({ jobId: job.id, success: true });
          }
        } catch (err) {
          results.push({ jobId: job.id, success: false, error: String(err) });
        }
      }

      res.json({ 
        message: "Batch embedding terminé", 
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      });
    } catch (error) {
      console.error("Error in batch job embeddings:", error);
      res.status(500).json({ message: "Erreur lors de la génération batch" });
    }
  });

  // Semantic search: Find matching candidates for a job (SQL-based with pgvector)
  app.get("/api/matching/job/:jobId/candidates", requireRole("agency", "company"), async (req, res) => {
    try {
      const job = await storage.getJobPosting(req.params.jobId as string);
      if (!job) {
        return res.status(404).json({ message: "Offre non trouvée" });
      }

      // Generate job embedding if not exists
      let jobEmbedding = job.jobEmbedding;
      if (!jobEmbedding) {
        try {
          jobEmbedding = await generateJobEmbedding(job);
          await storage.updateJobPosting(job.id, { jobEmbedding });
        } catch (err) {
          console.error("Could not generate job embedding:", err);
        }
      }

      // Build filter parameters
      const sqlFilters = {
        city: req.query.location as string || req.query.landmark as string,
        experienceMin: req.query.experienceMin ? parseInt(req.query.experienceMin as string) : undefined,
        experienceMax: req.query.experienceMax ? parseInt(req.query.experienceMax as string) : undefined,
        skills: req.query.skills ? (req.query.skills as string).split(",") : undefined,
      };

      // Use SQL-based matching with pgvector if embedding available
      if (jobEmbedding) {
        const matchedCandidates = await findMatchingCandidatesSQL(jobEmbedding, sqlFilters);
        
        const candidates = matchedCandidates.map(c => ({
          id: c.userId,
          user: {
            id: c.userId,
            email: c.email,
            fullName: c.fullName,
            phone: c.phone,
            city: c.city,
            avatarUrl: c.avatarUrl,
          },
          profile: {
            skills: c.skills,
            experienceYears: c.experienceYears,
            salaryExpectation: c.salaryExpectation,
            // Décision du 22/10/2026 : écoute réservée aux recruteurs qui ont reçu une candidature.
            voiceCvUrl: null,
          },
          matchScore: c.matchScore,
        }));

        res.json({
          jobId: job.id,
          jobTitle: job.title,
          candidates,
          totalMatches: candidates.length,
          filtersApplied: Object.fromEntries(
            Object.entries(sqlFilters).filter(([_, v]) => v !== undefined)
          ),
          matchingMethod: "pgvector-sql",
        });
      } else {
        // Fallback to JS-based matching without embeddings
        const candidates = await storage.getAllCandidates();
        const candidatesWithProfiles = await Promise.all(
          candidates.map(async (candidate) => {
            const profile = await storage.getCandidateProfile(candidate.id);
            const { password: _, ...userWithoutPassword } = candidate;
            return {
              id: candidate.id,
              user: userWithoutPassword,
              // Sans l'audio du CV vocal : écoute réservée aux recruteurs qui
              // ont reçu une candidature (décision du 22/10/2026).
              profile: profile ? { ...profile, voiceCvUrl: null, profileEmbedding: undefined } : profile,
              matchScore: 50, // Default score when no embedding
            };
          })
        );

        res.json({
          jobId: job.id,
          jobTitle: job.title,
          candidates: candidatesWithProfiles.filter(c => c.profile),
          totalMatches: candidatesWithProfiles.length,
          filtersApplied: {},
          matchingMethod: "fallback-no-embedding",
        });
      }
    } catch (error) {
      console.error("Error finding matching candidates:", error);
      res.status(500).json({ message: "Erreur lors de la recherche de candidats" });
    }
  });

  // Semantic search: Find matching jobs for a candidate (SQL-based with pgvector)
  app.get("/api/matching/candidate/jobs", requireRole("candidate"), async (req, res) => {
    try {
      const profile = await storage.getCandidateProfile(req.session.userId!);
      if (!profile) {
        return res.status(404).json({ message: "Profil non trouvé" });
      }

      // Generate candidate embedding if not exists
      let candidateEmbedding = profile.profileEmbedding;
      if (!candidateEmbedding && profile.skills?.length) {
        try {
          candidateEmbedding = await generateCandidateEmbedding(profile);
          await storage.updateCandidateProfile(req.session.userId!, { profileEmbedding: candidateEmbedding });
        } catch (err) {
          console.error("Could not generate candidate embedding:", err);
        }
      }

      // Use SQL-based matching with pgvector if embedding available
      if (candidateEmbedding) {
        const matchedJobs = await findMatchingJobsSQL(candidateEmbedding);
        
        res.json({
          jobs: matchedJobs.map(j => ({
            id: j.jobId,
            title: j.title,
            description: j.description,
            location: j.location,
            salaryRange: j.salaryRange,
            jobType: j.jobType,
            matchScore: j.matchScore,
          })),
          totalMatches: matchedJobs.length,
          matchingMethod: "pgvector-sql",
        });
      } else {
        // Fallback without embedding
        const jobs = await storage.getAllJobPostings();
        const activeJobs = jobs.filter(j => j.isActive);

        res.json({
          jobs: activeJobs.map(j => ({
            ...j,
            matchScore: 50, // Default score
          })),
          totalMatches: activeJobs.length,
          matchingMethod: "fallback-no-embedding",
        });
      }
    } catch (error) {
      console.error("Error finding matching jobs:", error);
      res.status(500).json({ message: "Erreur lors de la recherche d'offres" });
    }
  });

  // Store matching result
  app.post("/api/matching/results", requireRole("agency", "company"), async (req, res) => {
    try {
      const result = await storage.createMatchingResult(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error storing matching result:", error);
      res.status(500).json({ message: "Erreur lors de l'enregistrement du résultat" });
    }
  });

  // Get matching results for a job
  app.get("/api/matching/job/:jobId/results", requireRole("agency", "company"), async (req, res) => {
    try {
      const results = await storage.getMatchingResultsByJob(req.params.jobId as string);
      res.json(results);
    } catch (error) {
      console.error("Error fetching matching results:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des résultats" });
    }
  });

  // =====================================================
  // WhatsApp Business API Webhook Routes
  // =====================================================

  // WhatsApp webhook verification (GET request from Meta)
  app.get("/api/whatsapp/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[WhatsApp] Webhook verified successfully");
      res.status(200).send(challenge);
    } else {
      console.log("[WhatsApp] Webhook verification failed");
      res.sendStatus(403);
    }
  });

  // WhatsApp webhook receiver (POST - receives messages)
  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      const appSecret = process.env.WHATSAPP_APP_SECRET;
      if (appSecret) {
        const signatureHeader = req.headers["x-hub-signature-256"];
        const providedSignature = typeof signatureHeader === "string" ? signatureHeader.replace("sha256=", "") : "";
        const expectedSignature = crypto
          .createHmac("sha256", appSecret)
          .update((req.rawBody as Buffer) ?? Buffer.from(""))
          .digest("hex");
        const expectedBuffer = Buffer.from(expectedSignature, "hex");
        const providedBuffer = Buffer.from(providedSignature, "hex");
        const isValidSignature =
          expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);

        if (!isValidSignature) {
          console.log("[WhatsApp] Rejected webhook: invalid signature");
          return res.sendStatus(401);
        }
      } else {
        console.warn("[WhatsApp] WHATSAPP_APP_SECRET not configured — webhook signature is not verified");
      }

      res.sendStatus(200);

      const payload = parseWhatsAppWebhook(req.body);
      if (!payload) {
        console.log("[WhatsApp] Invalid webhook payload");
        return;
      }

      const messages = getMessagesFromWebhook(payload);
      console.log(`[WhatsApp] Received ${messages.length} message(s)`);

      for (const { message, senderName } of messages) {
        // The candidate just wrote, which reopens the 24h service window:
        // first deliver the status notifications that were waiting for it.
        try {
          await deliverPendingWhatsAppNotifications(message.from);
        } catch (error) {
          console.error(`[WhatsApp] Could not deliver pending notifications to ${message.from}:`, error);
        }
        try {
          await handleWebhookMessage(message, senderName);
        } finally {
          // Recorded after the bot ran: updatedAt is also the bot's idle
          // timeout, which must be judged against the previous message.
          await storage.touchWhatsAppSession(message.from).catch((error) =>
            console.error(`[WhatsApp] Could not record inbound message from ${message.from}:`, error),
          );
        }
      }
    } catch (error) {
      console.error("[WhatsApp] Webhook processing error:", error);
    }
  });

  // One inbound WhatsApp message: voice CV, or the conversational bot.
  async function handleWebhookMessage(message: WhatsAppMessage, senderName: string) {
        if (message.type === "audio" || message.type === "voice") {
          // An audio message received mid-application (bot waiting on
          // "voice note or confirm?") belongs to the conversational bot's
          // flow, not the standalone "build my profile from a voice CV"
          // feature — everywhere else, audio keeps its pre-existing
          // behavior so that feature isn't regressed by adding the bot.
          const awaitingApplicationVoice = await isAwaitingApplicationVoiceNote(message.from);
          if (awaitingApplicationVoice) {
            console.log(`[WhatsApp] Routing voice note to application bot for ${message.from}`);
            await handleIncomingWhatsAppMessage(message, senderName);
            return;
          }

          console.log(`[WhatsApp] Processing voice CV from ${message.from}`);

          const result = await processVoiceCVMessage(message, senderName);

          if (result.success) {
            const confirmationMessage = `Bonjour ${senderName}!\n\nMerci pour votre CV vocal. Votre profil a été mis à jour avec succès.\n\nScore de complétude: ${result.completenessScore}%\n\nNous vous contacterons dès qu'une opportunité correspondant à votre profil sera disponible.\n\nTapez un message pour accéder au menu BaaraMatch (rechercher une offre, suivre vos candidatures...).\n\n- L'équipe BaaraMatch Africa`;

            await sendWhatsAppMessage(message.from, confirmationMessage);
            console.log(`[WhatsApp] Confirmation sent to ${message.from}`);
          } else {
            const errorMessage = `Bonjour ${senderName},\n\nNous avons reçu votre message mais n'avons pas pu traiter votre CV vocal. Veuillez réessayer ou nous contacter pour assistance.\n\n- L'équipe BaaraMatch Africa`;

            await sendWhatsAppMessage(message.from, errorMessage);
            console.log(`[WhatsApp] Error notification sent to ${message.from}: ${result.error}`);
          }
        } else if (message.type === "text" && message.text) {
          console.log(`[WhatsApp] Routing text message to bot for ${message.from}`);
          await handleIncomingWhatsAppMessage(message, senderName);
        }
  }

  // Avatar upload endpoint
  app.post("/api/avatar/upload", requireAuth, async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ message: "Image data required" });
      }

      // Validate that it's a valid data URL with image MIME type
      const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
      if (!dataUrlPattern.test(imageBase64)) {
        return res.status(400).json({ message: "Format d'image invalide. Utilisez PNG, JPEG, GIF ou WebP." });
      }

      // Check size (max 2MB base64 encoded ~ 2.7MB string)
      if (imageBase64.length > 2.7 * 1024 * 1024) {
        return res.status(400).json({ message: "Image trop volumineuse. Maximum 2 Mo." });
      }

      let avatarUrl = imageBase64;
      const [, mimeType, base64Payload] = /^data:([^;]+);base64,(.+)$/.exec(imageBase64) ?? [];
      if (mimeType && base64Payload) {
        try {
          avatarUrl = await uploadToObjectStorage(
            "avatars",
            req.session.userId!,
            Buffer.from(base64Payload, "base64"),
            mimeType,
          );
        } catch (err) {
          console.warn("Object storage unavailable, storing avatar inline:", (err as Error).message);
        }
      }

      await storage.updateUser(req.session.userId!, {
        avatarUrl,
      });

      res.json({
        success: true,
        avatarUrl,
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      res.status(500).json({ message: "Erreur lors du téléchargement de la photo" });
    }
  });

  app.post("/api/company/logo/upload", requireRole("company"), async (req, res) => {
    try {
      const { imageBase64 } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ message: "Image data required" });
      }

      const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
      if (!dataUrlPattern.test(imageBase64)) {
        return res.status(400).json({ message: "Format d'image invalide. Utilisez PNG, JPEG, GIF ou WebP." });
      }

      if (imageBase64.length > 2.7 * 1024 * 1024) {
        return res.status(400).json({ message: "Image trop volumineuse. Maximum 2 Mo." });
      }

      let logoUrl = imageBase64;
      const [, mimeType, base64Payload] = /^data:([^;]+);base64,(.+)$/.exec(imageBase64) ?? [];
      if (mimeType && base64Payload) {
        try {
          logoUrl = await uploadToObjectStorage(
            "company-logos",
            req.session.userId!,
            Buffer.from(base64Payload, "base64"),
            mimeType,
          );
        } catch (err) {
          console.warn("Object storage unavailable, storing company logo inline:", (err as Error).message);
        }
      }

      await storage.updateCompanyProfile(req.session.userId!, { logoUrl });

      res.json({ success: true, logoUrl });
    } catch (error) {
      console.error("Error uploading company logo:", error);
      res.status(500).json({ message: "Erreur lors du téléchargement du logo" });
    }
  });

  app.post("/api/company/cover/upload", requireRole("company"), async (req, res) => {
    try {
      const { imageBase64 } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ message: "Image data required" });
      }

      const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
      if (!dataUrlPattern.test(imageBase64)) {
        return res.status(400).json({ message: "Format d'image invalide. Utilisez PNG, JPEG, GIF ou WebP." });
      }

      // Cover banners run larger than avatars/logos — 5 Mo cap.
      if (imageBase64.length > 6.7 * 1024 * 1024) {
        return res.status(400).json({ message: "Image trop volumineuse. Maximum 5 Mo." });
      }

      let coverImageUrl = imageBase64;
      const [, mimeType, base64Payload] = /^data:([^;]+);base64,(.+)$/.exec(imageBase64) ?? [];
      if (mimeType && base64Payload) {
        try {
          coverImageUrl = await uploadToObjectStorage(
            "company-covers",
            req.session.userId!,
            Buffer.from(base64Payload, "base64"),
            mimeType,
          );
        } catch (err) {
          console.warn("Object storage unavailable, storing company cover inline:", (err as Error).message);
        }
      }

      await storage.updateCompanyProfile(req.session.userId!, { coverImageUrl });

      res.json({ success: true, coverImageUrl });
    } catch (error) {
      console.error("Error uploading company cover image:", error);
      res.status(500).json({ message: "Erreur lors du téléchargement de l'image de couverture" });
    }
  });

  // CV vocal : envoi (l'audio d'abord, la transcription ensuite si OpenAI
  // répond), écoute par le candidat, suppression, écoute par un recruteur
  // qui a reçu sa candidature (server/cv-vocal.ts).
  registerCvVocalRoutes(app, { requireAuth, requireRole });

  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.listNotifications(req.session.userId!);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Erreur lors du chargement des notifications" });
    }
  });

  app.patch("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.session.userId!);
      res.json({ message: "Toutes les notifications ont été marquées comme lues" });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour des notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const notification = await storage.markNotificationRead(String(req.params.id), req.session.userId!);
      if (!notification) {
        return res.status(404).json({ message: "Notification non trouvée" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour de la notification" });
    }
  });

  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteNotification(String(req.params.id), req.session.userId!);
      if (!deleted) {
        return res.status(404).json({ message: "Notification non trouvée" });
      }
      res.json({ message: "Notification supprimée" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Erreur lors de la suppression de la notification" });
    }
  });

  // Serves files uploaded to Replit Object Storage (resumes, avatars, voice CVs).
  // requireAuth (not owner-only): these URLs are already embedded as-is in JSON
  // responses shown to other authenticated roles (e.g. a company viewing a
  // candidate's resume/voice CV while reviewing an application) — same trust
  // level as before this migration, when they were inline data: URLs in those
  // same responses.
  app.get("/api/files/:category/:ownerId/:filename", requireAuth, async (req, res) => {
    try {
      const category = String(req.params.category);
      const ownerId = String(req.params.ownerId);
      const filename = String(req.params.filename);
      const key = `${category}/${ownerId}/${filename}`;
      const ext = filename.includes(".") ? filename.split(".").pop()! : "";
      const buffer = await downloadFromObjectStorage(key);
      res.setHeader("Content-Type", mimeForExtension(ext));
      res.send(buffer);
    } catch (error) {
      console.error("Error serving file from object storage:", error);
      res.status(404).json({ message: "Fichier non trouvé" });
    }
  });

  // ---- Agency "CV & pièces jointes" -------------------------------------
  // Documents are scoped to the depositing agency and only ever served
  // through these ownership-checked routes (never via a raw URL handed to
  // the client), so identity papers and medical certificates stay private.
  const CANDIDATE_DOCUMENT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  const MAX_CANDIDATE_DOCUMENT_BYTES = 10 * 1024 * 1024;

  const sendStoredFile = async (
    res: Response,
    url: string,
    mimeType: string,
    fileName: string,
    download: boolean,
  ) => {
    const buffer = await readStoredFile(url);
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(buffer);
  };

  app.get("/api/agency/candidate-documents", requireRole("agency"), async (req, res) => {
    try {
      res.json(await storage.getCandidateDocumentsByAgency(req.session.userId!));
    } catch (error) {
      console.error("Error fetching candidate documents:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des documents" });
    }
  });

  app.post("/api/agency/candidates/:candidateId/documents", requireRole("agency"), async (req, res) => {
    try {
      const payload = z.object({
        type: z.enum(candidateDocumentTypes),
        name: z.string().trim().min(1).max(200),
        mimeType: z.string(),
        dataBase64: z.string().min(1),
        expiresAt: z.coerce.date().nullable().optional(),
      }).parse(req.body);

      if (!CANDIDATE_DOCUMENT_MIME_TYPES.includes(payload.mimeType)) {
        return res.status(400).json({ message: "Formats acceptés : PDF, JPG, PNG ou WebP." });
      }

      const candidateId = String(req.params.candidateId);
      const candidate = await storage.getUser(candidateId);
      if (!candidate || candidate.userType !== "candidate") {
        return res.status(404).json({ message: "Candidat introuvable" });
      }

      const buffer = Buffer.from(payload.dataBase64, "base64");
      if (!buffer.length) {
        return res.status(400).json({ message: "Fichier vide." });
      }
      if (buffer.length > MAX_CANDIDATE_DOCUMENT_BYTES) {
        return res.status(400).json({ message: "Le fichier doit faire 10 Mo maximum." });
      }

      let url = `data:${payload.mimeType};base64,${buffer.toString("base64")}`;
      try {
        url = await uploadToObjectStorage("candidate-documents", req.session.userId!, buffer, payload.mimeType);
      } catch (err) {
        console.warn("Object storage unavailable, storing candidate document inline:", (err as Error).message);
      }

      const { url: _url, ...document } = await storage.createCandidateDocument({
        agencyId: req.session.userId!,
        candidateId,
        type: payload.type,
        name: payload.name,
        url,
        mimeType: payload.mimeType,
        sizeBytes: buffer.length,
        expiresAt: payload.expiresAt ?? null,
      });
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error uploading candidate document:", error);
      res.status(500).json({ message: "Erreur lors de l'envoi du document" });
    }
  });

  app.get("/api/agency/candidate-documents/:id/file", requireRole("agency"), async (req, res) => {
    try {
      const document = await storage.getCandidateDocument(String(req.params.id));
      // 404 (not 403) for another agency's document: don't confirm it exists.
      if (!document || document.agencyId !== req.session.userId) {
        return res.status(404).json({ message: "Document introuvable" });
      }
      await sendStoredFile(res, document.url, document.mimeType, document.name, req.query.download === "1");
    } catch (error) {
      console.error("Error serving candidate document:", error);
      res.status(404).json({ message: "Fichier indisponible" });
    }
  });

  app.delete("/api/agency/candidate-documents/:id", requireRole("agency"), async (req, res) => {
    try {
      const document = await storage.getCandidateDocument(String(req.params.id));
      if (!document || document.agencyId !== req.session.userId) {
        return res.status(404).json({ message: "Document introuvable" });
      }
      await storage.deleteCandidateDocument(document.id);
      const key = objectKeyFromUrl(document.url);
      if (key) {
        // Best effort: the DB row is the source of truth; an orphaned blob
        // is harmless and unreachable (served only through the route above).
        deleteFromObjectStorage(key).catch((err) =>
          console.warn("Could not delete candidate document blob:", (err as Error).message),
        );
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting candidate document:", error);
      res.status(500).json({ message: "Erreur lors de la suppression du document" });
    }
  });

  // The CV the candidate uploaded themselves. Served as a file rather than
  // letting the client open profile.resumeUrl directly: browsers refuse to
  // navigate a tab to an inline data: URL, so "Voir le CV" silently did nothing.
  app.get("/api/agency/candidates/:candidateId/resume", requireRole("agency"), async (req, res) => {
    try {
      const candidateId = String(req.params.candidateId);
      const [candidate, profile] = await Promise.all([
        storage.getUser(candidateId),
        storage.getCandidateProfile(candidateId),
      ]);
      if (!candidate || candidate.userType !== "candidate" || !profile?.resumeUrl) {
        return res.status(404).json({ message: "CV introuvable" });
      }
      const fileName = profile.resumeFileName || `CV_${candidate.fullName.replace(/\s+/g, "_")}.pdf`;
      await sendStoredFile(res, profile.resumeUrl, profile.resumeMimeType || "application/pdf", fileName, req.query.download === "1");
    } catch (error) {
      console.error("Error serving candidate resume:", error);
      res.status(404).json({ message: "CV indisponible" });
    }
  });

  // The agency's own job postings for "Offres & Missions" — unlike the
  // public GET /api/jobs (every active job on the platform, used for
  // candidate/agency browsing), this scopes strictly to jobs this agency
  // itself posted, since that screen manages (edits/deletes/toggles) them.
  app.get("/api/agency/jobs", requireRole("agency"), async (req, res) => {
    try {
      const [jobs, moderationItems] = await Promise.all([
        storage.getJobPostingsByAgency(req.session.userId!),
        storage.listModerationItems(),
      ]);
      // Jobs actually sitting in the admin review queue — the only ones
      // that are "en attente de validation". A draft or a closed job is
      // also inactive and unvalidated, so isActive/validatedAt can't tell.
      const pendingReviewJobIds = new Set(
        moderationItems
          .filter((item) => item.targetType === "job" && item.status === "pending" && item.targetEntityId)
          .map((item) => item.targetEntityId!),
      );
      // job_postings.application_count is never incremented anywhere in the
      // app (always 0) — compute the real count from the applications table
      // rather than trust a stored counter with no write path. hiredCount
      // (real "postes pourvus" signal) and clientCompanyName come from the
      // same join, for the mission-cards redesign.
      const companyCache = new Map<string, string>();
      const jobsWithRealCounts = await Promise.all(
        jobs.map(async (job) => {
          const applications = await storage.getApplicationsByJob(job.id);
          const hiredCount = applications.filter((application) => application.status === "hired").length;
          const daysOpen = Math.floor((Date.now() - new Date(job.createdAt ?? Date.now()).getTime()) / (1000 * 60 * 60 * 24));

          if (!companyCache.has(job.companyId)) {
            const company = await storage.getCompanyProfile(job.companyId);
            const companyUser = company ? null : await storage.getUser(job.companyId);
            companyCache.set(job.companyId, company?.companyName ?? companyUser?.fullName ?? "Client");
          }

          return {
            ...job,
            applicationCount: applications.length,
            hiredCount,
            daysOpen,
            clientCompanyName: companyCache.get(job.companyId) ?? "Client",
            // A standard-plan agency's job posted with isActive intent gets
            // forced inactive pending admin review (see POST /api/jobs) —
            // isActive alone can't tell "closed" apart from "under review",
            // so the mission cards need this distinct signal.
            isPendingModeration: !job.isActive && pendingReviewJobIds.has(job.id),
          };
        }),
      );
      res.json(jobsWithRealCounts);
    } catch (error) {
      console.error("Error fetching agency jobs:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des offres" });
    }
  });

  // Job list for the agency's applications pipeline ("Candidatures" screen) —
  // per-job application counts so the agency can pick a Poste to drill into,
  // sorted most recent first like the rest of "Offres & Missions".
  app.get("/api/agency/jobs-with-applications", requireRole("agency"), async (req, res) => {
    try {
      const [jobs, clientsById] = await Promise.all([
        storage.getJobPostingsByAgency(req.session.userId!),
        loadAgencyClientLabels(req.session.userId!),
      ]);
      const jobsWithCounts = await Promise.all(
        jobs.map(async (job) => {
          const applications = await storage.getApplicationsByJob(job.id);
          return {
            id: job.id,
            title: job.title,
            category: job.category,
            location: job.location,
            createdAt: job.createdAt,
            isActive: job.isActive,
            applicationCount: applications.length,
            // The end client (CRM fiche) — null for older missions with no fiche.
            client: job.agencyClientId ? clientsById.get(job.agencyClientId) ?? null : null,
          };
        }),
      );
      res.json(jobsWithCounts);
    } catch (error) {
      console.error("Error fetching agency jobs with applications:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des offres" });
    }
  });

  app.get("/api/company/jobs-with-applications", requireRole("company"), async (req, res) => {
    try {
      const jobs = await storage.getJobPostingsByCompany(req.session.userId!);
      const jobsWithCounts = await Promise.all(
        jobs.map(async (job) => {
          const applications = await storage.getApplicationsByJob(job.id);
          return {
            id: job.id,
            title: job.title,
            category: job.category,
            location: job.location,
            createdAt: job.createdAt,
            isActive: job.isActive,
            applicationCount: applications.length,
          };
        }),
      );
      res.json(jobsWithCounts);
    } catch (error) {
      console.error("Error fetching company jobs with applications:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des offres" });
    }
  });

  // ---- Agency billing: placements (contracts) ----
  // The real entity behind the "Contrats" page, the invoicing/salary
  // pickers, and the dashboard's KPIs/revenue-by-sector. Originally
  // read-only (a placement could only ever exist if someone inserted one
  // directly in the DB) — POST/PATCH below are what actually let an agency
  // create and manage a contract through the product.

  app.get("/api/agency/placements", requireRole("agency"), async (req, res) => {
    try {
      const [placements, agencyInvoices] = await Promise.all([
        storage.getAgencyPlacements(req.session.userId!),
        storage.listInvoices(req.session.userId!),
      ]);

      const lineItemsByInvoice = await Promise.all(
        agencyInvoices.map((invoice) => storage.getInvoiceLineItems(invoice.id)),
      );
      const invoiceByPlacementId = new Map<string, { invoiceNumber: string; status: string }>();
      agencyInvoices.forEach((invoice, index) => {
        for (const item of lineItemsByInvoice[index]) {
          if (item.placementId) {
            invoiceByPlacementId.set(item.placementId, { invoiceNumber: invoice.invoiceNumber, status: invoice.status });
          }
        }
      });

      // A human-readable contract number isn't a stored column — it's
      // derived here, numbered sequentially within each contract's start
      // year in creation order, so it stays stable as long as nothing is
      // deleted.
      const byYear = new Map<number, typeof placements>();
      for (const placement of placements) {
        const year = new Date(placement.startDate).getFullYear();
        const bucket = byYear.get(year) ?? [];
        bucket.push(placement);
        byYear.set(year, bucket);
      }
      const contractNumberByPlacementId = new Map<string, string>();
      Array.from(byYear.entries()).forEach(([year, bucket]) => {
        bucket
          .slice()
          .sort((left, right) => new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime())
          .forEach((placement, index) => {
            contractNumberByPlacementId.set(placement.id, `CTR-${year}-${String(index + 1).padStart(3, "0")}`);
          });
      });

      const clientsById = await loadAgencyClientsById(req.session.userId!);
      const enriched = await Promise.all(
        placements.map(async (placement) => {
          const [candidate, company, job] = await Promise.all([
            storage.getUser(placement.candidateId),
            placement.companyId ? storage.getUser(placement.companyId) : Promise.resolve(undefined),
            placement.jobId ? storage.getJobPosting(placement.jobId) : Promise.resolve(undefined),
          ]);
          const fiche = placement.agencyClientId ? clientsById.get(placement.agencyClientId) : undefined;
          const invoiceInfo = invoiceByPlacementId.get(placement.id);
          return {
            id: placement.id,
            contractNumber: contractNumberByPlacementId.get(placement.id),
            candidateId: placement.candidateId,
            candidateName: candidate?.fullName ?? "Candidat inconnu",
            candidateAvatarUrl: candidate?.avatarUrl ?? null,
            position: placement.position ?? job?.title ?? null,
            companyId: placement.companyId,
            agencyClientId: placement.agencyClientId,
            companyName: fiche?.name ?? company?.fullName ?? "Entreprise inconnue",
            contractType: placement.contractType,
            status: placement.status,
            salary: placement.salary,
            salaryCurrency: placement.salaryCurrency,
            commissionRate: placement.commissionRate,
            commissionAmount: placement.commissionAmount,
            startDate: placement.startDate,
            endDate: placement.endDate,
            invoiceNumber: invoiceInfo?.invoiceNumber ?? null,
            invoiceStatus: invoiceInfo?.status ?? null,
            performanceRating: placement.performanceRating,
            notes: placement.notes,
            createdAt: placement.createdAt,
          };
        }),
      );
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching agency placements:", error);
      res.status(500).json({ message: "Erreur lors du chargement des placements" });
    }
  });

  const agencyPlacementCreateSchema = z.object({
    candidateId: z.string().min(1),
    // Preferred: the agency CRM fiche. companyId (a registered company's
    // user id) is still accepted for older callers.
    agencyClientId: z.string().min(1).optional(),
    companyId: z.string().min(1).optional(),
    position: z.string().min(1),
    contractType: z.enum(["CDI", "CDD", "Freelance"]),
    salary: z.number().int().positive(),
    salaryCurrency: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    commissionRate: z.number().min(0).max(100).nullable().optional(),
  }).refine((data) => !data.endDate || data.endDate > data.startDate, {
    message: "La date de fin doit être après la date de début",
    path: ["endDate"],
  }).refine((data) => data.agencyClientId || data.companyId, {
    message: "Le client est requis",
    path: ["agencyClientId"],
  });

  app.post("/api/agency/placements", requireRole("agency"), async (req, res) => {
    try {
      const data = agencyPlacementCreateSchema.parse(req.body);

      // The client of record is always one of the agency's fiches — the
      // client does NOT need a BaaraMatch account. A legacy companyId is
      // mapped to (or gets) the agency's fiche for that company.
      const client = await resolveAgencyClient(req.session.userId!, {
        agencyClientId: data.agencyClientId,
        companyUserId: data.companyId,
      });
      if (!client) {
        return res.status(400).json({ message: "Entreprise cliente introuvable" });
      }

      const candidate = await storage.getUser(data.candidateId);
      if (!candidate || candidate.userType !== "candidate") {
        return res.status(400).json({ message: "Candidat introuvable" });
      }

      // Taux non fourni (champ absent, pas vidé) : taux réglé pour ce client.
      if (data.commissionRate === undefined) {
        data.commissionRate = (await chargerTauxApplicable(req.session.userId!, client.id, data.contractType))?.taux;
      }
      const commissionAmount = data.commissionRate
        ? Math.round((data.salary * data.commissionRate) / 100)
        : null;

      const placement = await storage.createAgencyPlacement({
        agencyId: req.session.userId!,
        candidateId: data.candidateId,
        companyId: client.companyUserId ?? null,
        agencyClientId: client.id,
        position: data.position,
        contractType: data.contractType,
        salary: data.salary,
        salaryCurrency: data.salaryCurrency ?? "XOF",
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        commissionRate: data.commissionRate ?? null,
        commissionAmount,
        status: "active",
      });

      res.status(201).json(placement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error creating agency placement:", error);
      res.status(500).json({ message: "Erreur lors de la création du contrat" });
    }
  });

  const agencyPlacementUpdateSchema = z.object({
    status: z.enum(placementStatuses).optional(),
    endDate: z.coerce.date().optional(),
    // End-of-mission evaluation, shown in "Historique placements". Whole
    // stars only; null clears a rating entered by mistake.
    performanceRating: z.number().int().min(1).max(5).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  });

  app.patch("/api/agency/placements/:id", requireRole("agency"), async (req, res) => {
    try {
      const placement = await storage.getAgencyPlacement(req.params.id as string);
      if (!placement || placement.agencyId !== req.session.userId) {
        return res.status(404).json({ message: "Contrat introuvable" });
      }
      const updates = agencyPlacementUpdateSchema.parse(req.body);
      const updated = await storage.updateAgencyPlacement(placement.id, updates);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error updating agency placement:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du contrat" });
    }
  });

  // ---- V0 field missions (partner agencies) ----
  // Minimal VMS: create a mission, track its status, close it with a client
  // feedback. Deliberately no scheduling/alerts — see shared/schema.ts's
  // fieldMissions comment for why this is a separate table from
  // agencyPlacements, and why "field mission" rather than "mission" (that
  // word already means an agency's job posting elsewhere in this app).
  // A super_admin gets read access for supervision; writes are agency-only,
  // gated to the "Agence Partenaire" plan like the rest of the billing suite.

  const fieldMissionCreateSchema = z.object({
    candidateId: z.string().min(1),
    clientName: z.string().min(1),
    jobTitle: z.string().min(1),
    location: z.string().min(1),
    startDate: z.coerce.date(),
    plannedEndDate: z.coerce.date(),
    dailyRateFcfa: z.number().int().positive(),
  }).refine((data) => data.plannedEndDate > data.startDate, {
    message: "La date de fin prévue doit être après la date de début",
    path: ["plannedEndDate"],
  });

  const fieldMissionStatusUpdateSchema = z.discriminatedUnion("status", [
    z.object({
      status: z.literal("completed"),
      actualEndDate: z.coerce.date(),
      feedback: z.object({
        noteClient: z.number().int().min(1).max(5),
        commentaireClient: z.string().optional(),
      }),
    }),
    z.object({
      status: z.literal("disputed"),
      disputeReason: z.string().min(1),
    }),
    z.object({
      status: z.enum(["in_progress", "cancelled"]),
    }),
  ]);

  app.get("/api/agency/field-missions", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || (user.userType !== "agency" && user.userType !== "admin")) {
        return res.status(403).json({ message: "Non autorisé" });
      }
      const agencyId = user.userType === "agency" ? user.id : (req.query.agencyId as string | undefined);
      if (!agencyId) {
        return res.status(400).json({ message: "agencyId requis" });
      }
      const status = req.query.status as FieldMissionStatus | undefined;
      const missions = await storage.getFieldMissionsByAgency(agencyId, status);
      res.json(missions);
    } catch (error) {
      console.error("Error fetching field missions:", error);
      res.status(500).json({ message: "Erreur lors du chargement des missions" });
    }
  });

  app.get("/api/agency/field-missions/clients", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || (user.userType !== "agency" && user.userType !== "admin")) {
        return res.status(403).json({ message: "Non autorisé" });
      }
      const agencyId = user.userType === "agency" ? user.id : (req.query.agencyId as string | undefined);
      if (!agencyId) {
        return res.status(400).json({ message: "agencyId requis" });
      }
      const clients = await storage.getFieldMissionClientsByAgency(agencyId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching field mission clients:", error);
      res.status(500).json({ message: "Erreur lors du chargement des clients" });
    }
  });

  app.get("/api/agency/field-missions/hired-candidates", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const candidates = await storage.getHiredCandidatesByAgency(req.session.userId!);
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching hired candidates:", error);
      res.status(500).json({ message: "Erreur lors du chargement des candidats embauchés" });
    }
  });

  app.get("/api/agency/field-missions/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || (user.userType !== "agency" && user.userType !== "admin")) {
        return res.status(403).json({ message: "Non autorisé" });
      }
      const mission = await storage.getFieldMission(String(req.params.id));
      if (!mission) {
        return res.status(404).json({ message: "Mission non trouvée" });
      }
      if (user.userType === "agency" && mission.agencyId !== user.id) {
        return res.status(403).json({ message: "Non autorisé" });
      }
      res.json(mission);
    } catch (error) {
      console.error("Error fetching field mission:", error);
      res.status(500).json({ message: "Erreur lors du chargement de la mission" });
    }
  });

  app.post("/api/agency/field-missions", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const body = fieldMissionCreateSchema.parse(req.body);
      const candidate = await storage.getUser(body.candidateId);
      if (!candidate || candidate.userType !== "candidate") {
        return res.status(404).json({ message: "Candidat non trouvé" });
      }
      const mission = await storage.createFieldMission({
        ...body,
        agencyId: req.session.userId!,
      });
      res.status(201).json(mission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error creating field mission:", error);
      res.status(500).json({ message: "Erreur lors de la création de la mission" });
    }
  });

  app.patch("/api/agency/field-missions/:id/status", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const mission = await storage.getFieldMission(String(req.params.id));
      if (!mission) {
        return res.status(404).json({ message: "Mission non trouvée" });
      }
      if (mission.agencyId !== req.session.userId) {
        return res.status(403).json({ message: "Non autorisé" });
      }

      const body = fieldMissionStatusUpdateSchema.parse(req.body);

      let updates: Partial<FieldMission>;
      if (body.status === "completed") {
        updates = {
          status: "completed",
          actualEndDate: body.actualEndDate,
          clientRating: body.feedback.noteClient,
          clientFeedback: body.feedback.commentaireClient ?? null,
        };
      } else if (body.status === "disputed") {
        updates = { status: "disputed", disputeReason: body.disputeReason };
      } else {
        updates = { status: body.status };
      }

      const updated = await storage.updateFieldMission(mission.id, updates);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error updating field mission status:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour de la mission" });
    }
  });

  // ---- Agency billing: financial settings ----

  const agencyFinancialSettingsUpdateSchema = z.object({
    currency: z.string().optional(),
    invoicePrefix: z.string().min(1).optional(),
    defaultPaymentTerms: z.number().int().min(0).optional(),
    vatRate: z.number().min(0).max(100).optional(),
    autoInvoice: z.boolean().optional(),
    reminderEnabled: z.boolean().optional(),
    reminderDays: z.number().int().min(0).optional(),
    bankName: z.string().nullable().optional(),
    accountName: z.string().nullable().optional(),
    iban: z.string().nullable().optional(),
    bic: z.string().nullable().optional(),
  }).strict();

  app.get("/api/agency/financial-settings", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const settings = await storage.getAgencyFinancialSettings(req.session.userId!);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching agency financial settings:", error);
      res.status(500).json({ message: "Erreur lors du chargement des paramètres financiers" });
    }
  });

  app.patch("/api/agency/financial-settings", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const updates = agencyFinancialSettingsUpdateSchema.parse(req.body);
      const settings = await storage.updateAgencyFinancialSettings(req.session.userId!, updates);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error updating agency financial settings:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour des paramètres financiers" });
    }
  });

  // ---- Agency billing: commission rate settings ----

  // Réglé par client et par type de contrat ; null = tous les clients /
  // tous les contrats (règle d'application : shared/commissions.ts).
  const commissionRateBodySchema = z.object({
    agencyClientId: z.string().min(1).nullable().optional(),
    contractType: z.enum(placementContractTypes).nullable().optional(),
    rate: z.number().min(0).max(100),
    minAmount: z.number().int().min(0).nullable().optional(),
    isActive: z.boolean().optional(),
  }).strict();

  // Un seul réglage par couple (client, type de contrat), et seulement pour
  // un client de l'agence. Renvoie un message d'erreur, ou null si tout va bien.
  async function verifierReglageTaux(agencyId: string, reglage: { agencyClientId?: string | null; contractType?: string | null }, ignorerId?: string) {
    const client = reglage.agencyClientId ?? null;
    const contrat = reglage.contractType ?? null;
    if (client && !(await clientDeLAgence(agencyId, client))) return { status: 404, message: "Client introuvable" };
    const existants = await storage.listCommissionRateSettings(agencyId);
    if (existants.some((r) => r.id !== ignorerId && (r.agencyClientId ?? null) === client && (r.contractType ?? null) === contrat)) {
      return { status: 409, message: "Un taux existe déjà pour ce client et ce type de contrat. Modifiez-le plutôt." };
    }
    return null;
  }

  app.get("/api/agency/commission-rates", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const rates = await storage.listCommissionRateSettings(req.session.userId!);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching commission rates:", error);
      res.status(500).json({ message: "Erreur lors du chargement des taux de commission" });
    }
  });

  app.post("/api/agency/commission-rates", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const data = commissionRateBodySchema.parse(req.body);
      const refus = await verifierReglageTaux(req.session.userId!, data);
      if (refus) return res.status(refus.status).json({ message: refus.message });
      const rate = await storage.createCommissionRateSetting({ ...data, agencyId: req.session.userId! });
      res.status(201).json(rate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error creating commission rate:", error);
      res.status(500).json({ message: "Erreur lors de la création du taux de commission" });
    }
  });

  app.patch("/api/agency/commission-rates/:id", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const updates = commissionRateBodySchema.partial().parse(req.body);
      if ("agencyClientId" in updates || "contractType" in updates) {
        const actuel = (await storage.listCommissionRateSettings(req.session.userId!)).find((r) => r.id === String(req.params.id));
        if (actuel) {
          const refus = await verifierReglageTaux(req.session.userId!, {
            agencyClientId: "agencyClientId" in updates ? updates.agencyClientId : actuel.agencyClientId,
            contractType: "contractType" in updates ? updates.contractType : actuel.contractType,
          }, actuel.id);
          if (refus) return res.status(refus.status).json({ message: refus.message });
        }
      }
      const rate = await storage.updateCommissionRateSetting(String(req.params.id), req.session.userId!, updates);
      if (!rate) {
        return res.status(404).json({ message: "Taux de commission non trouvé" });
      }
      res.json(rate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error updating commission rate:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du taux de commission" });
    }
  });

  app.delete("/api/agency/commission-rates/:id", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const deleted = await storage.deleteCommissionRateSetting(String(req.params.id), req.session.userId!);
      if (!deleted) {
        return res.status(404).json({ message: "Taux de commission non trouvé" });
      }
      res.json({ message: "Taux de commission supprimé" });
    } catch (error) {
      console.error("Error deleting commission rate:", error);
      res.status(500).json({ message: "Erreur lors de la suppression du taux de commission" });
    }
  });

  // ---- Agency billing: payment method settings ----

  const paymentMethodBodySchema = z.object({
    name: z.string().min(1),
    type: z.enum(["bank", "mobile"]),
    accountInfo: z.string().min(1),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }).strict();

  app.get("/api/agency/payment-methods", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const methods = await storage.listPaymentMethodSettings(req.session.userId!);
      res.json(methods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ message: "Erreur lors du chargement des moyens de paiement" });
    }
  });

  app.post("/api/agency/payment-methods", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const data = paymentMethodBodySchema.parse(req.body);
      const method = await storage.createPaymentMethodSetting({ ...data, agencyId: req.session.userId! });
      res.status(201).json(method);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error creating payment method:", error);
      res.status(500).json({ message: "Erreur lors de la création du moyen de paiement" });
    }
  });

  app.patch("/api/agency/payment-methods/:id", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const updates = paymentMethodBodySchema.partial().parse(req.body);
      const method = await storage.updatePaymentMethodSetting(String(req.params.id), req.session.userId!, updates);
      if (!method) {
        return res.status(404).json({ message: "Moyen de paiement non trouvé" });
      }
      res.json(method);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error updating payment method:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du moyen de paiement" });
    }
  });

  app.delete("/api/agency/payment-methods/:id", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const deleted = await storage.deletePaymentMethodSetting(String(req.params.id), req.session.userId!);
      if (!deleted) {
        return res.status(404).json({ message: "Moyen de paiement non trouvé" });
      }
      res.json({ message: "Moyen de paiement supprimé" });
    } catch (error) {
      console.error("Error deleting payment method:", error);
      res.status(500).json({ message: "Erreur lors de la suppression du moyen de paiement" });
    }
  });

  // ---- Agency billing: invoices ----

  const invoiceLineItemBodySchema = z.object({
    placementId: z.string().nullable().optional(),
    description: z.string().min(1),
    quantity: z.number().int().min(1),
    unitPrice: z.number().int().min(0),
  });

  const createInvoiceBodySchema = z.object({
    // Preferred: the agency's CRM fiche — the client need not be registered
    // on BaaraMatch. clientId (a registered account) is still accepted.
    agencyClientId: z.string().min(1).optional(),
    clientId: z.string().min(1).optional(),
    clientType: z.enum(["company", "agency"]).default("company"),
    issueDate: z.coerce.date(),
    dueDate: z.coerce.date(),
    notes: z.string().nullable().optional(),
    status: z.enum(["draft", "pending"]).default("pending"),
    lineItems: z.array(invoiceLineItemBodySchema).min(1),
  }).refine((data) => data.agencyClientId || data.clientId, { message: "Le client est requis", path: ["agencyClientId"] });

  // Who an invoice is addressed to, for the list, the detail and the PDF:
  // the fiche when there is one, else the registered account (legacy rows).
  const describeInvoiceClient = async (
    invoice: { agencyClientId: string | null; clientId: string | null },
    clientsById: Awaited<ReturnType<typeof loadAgencyClientsById>>,
  ) => {
    const fiche = invoice.agencyClientId ? clientsById.get(invoice.agencyClientId) : undefined;
    if (fiche) {
      return { clientName: fiche.name, clientAddress: fiche.address, clientCity: [fiche.city, fiche.country].filter(Boolean).join(", ") || null, clientRegistrationNumber: fiche.registrationNumber, clientEmail: fiche.email };
    }
    const account = invoice.clientId ? await storage.getUser(invoice.clientId) : undefined;
    return { clientName: account?.fullName ?? "Client", clientAddress: null, clientCity: [account?.city, account?.country].filter(Boolean).join(", ") || null, clientRegistrationNumber: null, clientEmail: null };
  };

  app.get("/api/agency/invoices", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      await markOverdueInvoices(req.session.userId!);
      const list = await storage.listInvoices(req.session.userId!);
      const clientsById = await loadAgencyClientsById(req.session.userId!);
      res.json(await Promise.all(list.map(async (invoice) => ({ ...invoice, ...(await describeInvoiceClient(invoice, clientsById)) }))));
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Erreur lors du chargement des factures" });
    }
  });

  app.get("/api/agency/invoices/:id", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      await markOverdueInvoices(req.session.userId!);
      const invoice = await storage.getInvoice(String(req.params.id), req.session.userId!);
      if (!invoice) {
        return res.status(404).json({ message: "Facture non trouvée" });
      }
      const [lineItems, clientsById] = await Promise.all([
        storage.getInvoiceLineItems(invoice.id),
        loadAgencyClientsById(req.session.userId!),
      ]);
      res.json({ ...invoice, ...(await describeInvoiceClient(invoice, clientsById)), lineItems });
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Erreur lors du chargement de la facture" });
    }
  });

  app.post("/api/agency/invoices", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const body = createInvoiceBodySchema.parse(req.body);
      const client = await resolveAgencyClient(req.session.userId!, { agencyClientId: body.agencyClientId, companyUserId: body.clientId });
      if (!client) {
        return res.status(400).json({ message: "Client introuvable" });
      }
      // Billed lines must be this agency's own placements for this client.
      const placementIds = body.lineItems.map((item) => item.placementId).filter((id): id is string => !!id);
      if (placementIds.length) {
        const ownPlacements = await storage.getAgencyPlacements(req.session.userId!);
        const allowed = new Set(ownPlacements.filter((placement) => placement.agencyClientId === client.id).map((placement) => placement.id));
        if (placementIds.some((id) => !allowed.has(id))) {
          return res.status(400).json({ message: "Une ligne vise un placement qui n'appartient pas à ce client." });
        }
      }
      const lineItemsWithTotals = body.lineItems.map((item) => ({
        placementId: item.placementId ?? null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      }));
      const subtotal = lineItemsWithTotals.reduce((sum, item) => sum + item.total, 0);
      const settings = await storage.getAgencyFinancialSettings(req.session.userId!);
      const taxRate = settings.vatRate ?? 18;
      const taxAmount = Math.round(subtotal * (taxRate / 100));
      const totalAmount = subtotal + taxAmount;

      const invoice = await storage.createInvoice(
        req.session.userId!,
        {
          clientId: client.companyUserId ?? null,
          agencyClientId: client.id,
          clientType: body.clientType,
          issueDate: body.issueDate,
          dueDate: body.dueDate,
          notes: body.notes ?? null,
          status: body.status,
          subtotal,
          taxRate,
          taxAmount,
          totalAmount,
          currency: settings.currency ?? "XOF",
        },
        lineItemsWithTotals,
      );

      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Erreur lors de la création de la facture" });
    }
  });

  const updateInvoiceBodySchema = z.object({
    status: z.enum(invoiceStatuses).optional(),
    paymentMethod: z.string().nullable().optional(),
    paidDate: z.coerce.date().nullable().optional(),
    notes: z.string().nullable().optional(),
  }).strict();

  app.patch("/api/agency/invoices/:id", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const updates = updateInvoiceBodySchema.parse(req.body);
      const invoice = await storage.updateInvoice(String(req.params.id), req.session.userId!, updates);
      if (!invoice) {
        return res.status(404).json({ message: "Facture non trouvée" });
      }
      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour de la facture" });
    }
  });

  // ---- Agency billing: salary payments ----

  const createSalaryPaymentBodySchema = z.object({
    placementId: z.string().min(1),
    // "AAAA-MM": sortable, comparable (one salary per placement and month)
    // and dated for the accounting export — free text like "Sept. 2026" was not.
    period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Période attendue au format AAAA-MM"),
    baseSalary: z.number().int().min(0),
    bonus: z.number().int().min(0).default(0),
    deductions: z.number().int().min(0).default(0),
  });

  app.get("/api/agency/salary-payments", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const list = await storage.listSalaryPayments(req.session.userId!);
      res.json(list);
    } catch (error) {
      console.error("Error fetching salary payments:", error);
      res.status(500).json({ message: "Erreur lors du chargement des paiements de salaire" });
    }
  });

  app.post("/api/agency/salary-payments", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const body = createSalaryPaymentBodySchema.parse(req.body);
      const netSalary = body.baseSalary + body.bonus - body.deductions;
      if (netSalary < 0) {
        return res.status(400).json({ message: "Les retenues dépassent le salaire : le net serait négatif." });
      }
      const placement = await storage.getAgencyPlacement(body.placementId);
      if (!placement || placement.agencyId !== req.session.userId) {
        return res.status(404).json({ message: "Placement introuvable" });
      }
      const alreadyPaid = (await storage.listSalaryPayments(req.session.userId!))
        .find((payment) => payment.placementId === body.placementId && payment.period === body.period);
      if (alreadyPaid) {
        return res.status(409).json({ message: `Un salaire existe déjà pour ce placement sur la période ${body.period}.` });
      }
      const payment = await storage.createSalaryPayment({
        agencyId: req.session.userId!,
        placementId: body.placementId,
        period: body.period,
        baseSalary: body.baseSalary,
        bonus: body.bonus,
        deductions: body.deductions,
        netSalary,
        status: "pending",
      });
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error creating salary payment:", error);
      res.status(500).json({ message: "Erreur lors de la création du paiement de salaire" });
    }
  });

  const updateSalaryPaymentBodySchema = z.object({
    status: z.enum(salaryPaymentStatuses).optional(),
    paymentDate: z.coerce.date().nullable().optional(),
    paymentMethod: z.string().nullable().optional(),
  }).strict();

  app.patch("/api/agency/salary-payments/:id", requireRole("agency"), requirePartnerPlan, async (req, res) => {
    try {
      const updates = updateSalaryPaymentBodySchema.parse(req.body);
      const payment = await storage.updateSalaryPayment(String(req.params.id), req.session.userId!, updates);
      if (!payment) {
        return res.status(404).json({ message: "Paiement non trouvé" });
      }
      res.json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error updating salary payment:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du paiement" });
    }
  });

  registerAgencyCrmRoutes(app, requireRole);
  registerAgencyCommissionRoutes(app, requireRole);
  registerAgencyCandidateRoutes(app, requireRole);
  registerAgencyRecruitmentRoutes(app, requireRole);
  registerAgencyBillingRoutes(app, requireRole, requirePartnerPlan);
  registerAgencyRelationsRoutes(app, requireRole);

  return httpServer;
}
