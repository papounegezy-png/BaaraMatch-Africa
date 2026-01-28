import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { storage } from "./storage";
import { pool } from "./db";
import { insertUserSchema, loginSchema, insertJobPostingSchema, insertApplicationSchema, type UserType } from "@shared/schema";
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
import {
  parseWhatsAppWebhook,
  getMessagesFromWebhook,
  processVoiceCVMessage,
  sendWhatsAppMessage,
  calculateProfileCompleteness,
} from "./whatsapp";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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

  app.post("/api/auth/register", async (req, res) => {
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

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      const isValidPassword = await verifyPassword(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      req.session.userId = user.id;
      req.session.userType = user.userType;
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Erreur lors de la connexion" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erreur lors de la déconnexion" });
      }
      res.json({ message: "Déconnexion réussie" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Utilisateur non trouvé" });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.getAllJobPostings();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des offres" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJobPosting(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Offre non trouvée" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ message: "Erreur lors de la récupération de l'offre" });
    }
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Non authentifié" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || (user.userType !== "company" && user.userType !== "agency")) {
        return res.status(403).json({ message: "Non autorisé à publier des offres" });
      }

      const validatedData = insertJobPostingSchema.parse({
        ...req.body,
        companyId: user.userType === "company" ? user.id : req.body.companyId,
        agencyId: user.userType === "agency" ? user.id : null,
      });

      const job = await storage.createJobPosting(validatedData);
      res.status(201).json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error creating job:", error);
      res.status(500).json({ message: "Erreur lors de la création de l'offre" });
    }
  });

  app.patch("/api/jobs/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Non authentifié" });
      }

      const job = await storage.getJobPosting(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Offre non trouvée" });
      }

      if (job.companyId !== req.session.userId && job.agencyId !== req.session.userId) {
        return res.status(403).json({ message: "Non autorisé à modifier cette offre" });
      }

      const updatedJob = await storage.updateJobPosting(req.params.id, req.body);
      res.json(updatedJob);
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour de l'offre" });
    }
  });

  app.delete("/api/jobs/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Non authentifié" });
      }

      const job = await storage.getJobPosting(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Offre non trouvée" });
      }

      if (job.companyId !== req.session.userId && job.agencyId !== req.session.userId) {
        return res.status(403).json({ message: "Non autorisé à supprimer cette offre" });
      }

      await storage.deleteJobPosting(req.params.id);
      res.json({ message: "Offre supprimée avec succès" });
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ message: "Erreur lors de la suppression de l'offre" });
    }
  });

  app.get("/api/candidates", async (req, res) => {
    try {
      const candidates = await storage.getAllCandidates();
      const candidatesWithoutPasswords = candidates.map(({ password: _, ...rest }) => rest);
      res.json(candidatesWithoutPasswords);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des candidats" });
    }
  });

  app.get("/api/agencies", async (req, res) => {
    try {
      const agencies = await storage.getAllAgencies();
      const agenciesWithoutPasswords = agencies.map(({ password: _, ...rest }) => rest);
      res.json(agenciesWithoutPasswords);
    } catch (error) {
      console.error("Error fetching agencies:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des agences" });
    }
  });

  app.get("/api/profile", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Non authentifié" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      let profile = null;
      if (user.userType === "candidate") {
        profile = await storage.getCandidateProfile(user.id);
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

  app.patch("/api/profile", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Non authentifié" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      const { userUpdates, profileUpdates } = req.body;

      if (userUpdates) {
        await storage.updateUser(user.id, userUpdates);
      }

      let profile = null;
      if (profileUpdates) {
        if (user.userType === "candidate") {
          profile = await storage.updateCandidateProfile(user.id, profileUpdates);
        } else if (user.userType === "agency") {
          profile = await storage.updateAgencyProfile(user.id, profileUpdates);
        } else if (user.userType === "company") {
          profile = await storage.updateCompanyProfile(user.id, profileUpdates);
        }
      }

      const updatedUser = await storage.getUser(user.id);
      const { password: _, ...userWithoutPassword } = updatedUser!;
      res.json({ user: userWithoutPassword, profile });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du profil" });
    }
  });

  app.post("/api/applications", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Non authentifié" });
      }

      const user = await storage.getUser(req.session.userId);
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

      const application = await storage.createApplication(validatedData);
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Erreur lors de la candidature" });
    }
  });

  app.get("/api/applications", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Non authentifié" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      let applications;
      if (user.userType === "candidate") {
        applications = await storage.getApplicationsByCandidate(user.id);
      } else {
        return res.status(403).json({ message: "Non autorisé" });
      }

      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des candidatures" });
    }
  });

  app.get("/api/jobs/:jobId/applications", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Non authentifié" });
      }

      const job = await storage.getJobPosting(req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Offre non trouvée" });
      }

      if (job.companyId !== req.session.userId && job.agencyId !== req.session.userId) {
        return res.status(403).json({ message: "Non autorisé à voir les candidatures" });
      }

      const applications = await storage.getApplicationsByJob(req.params.jobId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching job applications:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des candidatures" });
    }
  });

  app.patch("/api/applications/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Non authentifié" });
      }

      const application = await storage.getApplication(req.params.id);
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

      const updatedApplication = await storage.updateApplication(req.params.id, req.body);
      res.json(updatedApplication);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour de la candidature" });
    }
  });

  app.get("/api/dashboard/candidate", requireRole("candidate"), async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      const profile = await storage.getCandidateProfile(user.id);
      const applications = await storage.getApplicationsByCandidate(user.id);
      const jobs = await storage.getAllJobPostings();

      const { password: _, ...userWithoutPassword } = user;
      res.json({
        user: userWithoutPassword,
        profile,
        applications,
        recommendedJobs: jobs.slice(0, 5),
        stats: {
          applicationsSent: applications.length,
          interviewsScheduled: applications.filter(a => a.status === "interview").length,
          acceptedApplications: applications.filter(a => a.status === "hired").length,
        }
      });
    } catch (error) {
      console.error("Error fetching candidate dashboard:", error);
      res.status(500).json({ message: "Erreur lors de la récupération du tableau de bord" });
    }
  });

  app.get("/api/dashboard/agency", requireRole("agency"), async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      const profile = await storage.getAgencyProfile(user.id);
      const candidates = await storage.getAllCandidates();
      const jobs = await storage.getJobPostingsByAgency(user.id);

      const { password: _, ...userWithoutPassword } = user;
      res.json({
        user: userWithoutPassword,
        profile,
        managedCandidates: candidates.length,
        activeJobs: jobs.filter(j => j.isActive).length,
        totalPlacements: profile?.candidatesPlaced || 0,
        verificationStatus: profile?.verificationStatus || "pending",
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
      const jobs = await storage.getJobPostingsByCompany(user.id);
      
      let totalApplications = 0;
      for (const job of jobs) {
        const applications = await storage.getApplicationsByJob(job.id);
        totalApplications += applications.length;
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({
        user: userWithoutPassword,
        profile,
        activeJobs: jobs.filter(j => j.isActive).length,
        totalJobs: jobs.length,
        totalApplicationsReceived: totalApplications,
      });
    } catch (error) {
      console.error("Error fetching company dashboard:", error);
      res.status(500).json({ message: "Erreur lors de la récupération du tableau de bord" });
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
            voiceCvUrl: c.voiceCvUrl,
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
              profile,
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
      res.sendStatus(200);

      const payload = parseWhatsAppWebhook(req.body);
      if (!payload) {
        console.log("[WhatsApp] Invalid webhook payload");
        return;
      }

      const messages = getMessagesFromWebhook(payload);
      console.log(`[WhatsApp] Received ${messages.length} message(s)`);

      for (const { message, senderName } of messages) {
        if (message.type === "audio" || message.type === "voice") {
          console.log(`[WhatsApp] Processing voice CV from ${message.from}`);
          
          const result = await processVoiceCVMessage(message, senderName);

          if (result.success) {
            const confirmationMessage = `Bonjour ${senderName}!\n\nMerci pour votre CV vocal. Votre profil a été mis à jour avec succès.\n\nScore de complétude: ${result.completenessScore}%\n\nNous vous contacterons dès qu'une opportunité correspondant à votre profil sera disponible.\n\n- L'équipe BaaraMatch Africa`;
            
            await sendWhatsAppMessage(message.from, confirmationMessage);
            console.log(`[WhatsApp] Confirmation sent to ${message.from}`);
          } else {
            const errorMessage = `Bonjour ${senderName},\n\nNous avons reçu votre message mais n'avons pas pu traiter votre CV vocal. Veuillez réessayer ou nous contacter pour assistance.\n\n- L'équipe BaaraMatch Africa`;
            
            await sendWhatsAppMessage(message.from, errorMessage);
            console.log(`[WhatsApp] Error notification sent to ${message.from}: ${result.error}`);
          }
        } else if (message.type === "text" && message.text) {
          const welcomeMessage = `Bonjour ${senderName}!\n\nBienvenue sur BaaraMatch Africa. Pour créer ou mettre à jour votre profil, envoyez-nous un message vocal présentant:\n\n- Votre parcours professionnel\n- Vos compétences clés\n- Le type de poste recherché\n\nNotre IA analysera votre CV vocal et vous mettra en relation avec les meilleures opportunités.\n\n- L'équipe BaaraMatch Africa`;
          
          await sendWhatsAppMessage(message.from, welcomeMessage);
          console.log(`[WhatsApp] Welcome message sent to ${message.from}`);
        }
      }
    } catch (error) {
      console.error("[WhatsApp] Webhook processing error:", error);
    }
  });

  // Manual voice CV upload endpoint (for web app)
  app.post("/api/voice-cv/upload", requireRole("candidate"), async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body;
      
      if (!audioBase64 || !mimeType) {
        return res.status(400).json({ message: "Audio data required" });
      }

      const audioBuffer = Buffer.from(audioBase64, "base64");

      const { transcribeAudio, extractProfileFromTranscription } = await import("./whatsapp");
      const { generateCandidateEmbedding } = await import("./embeddings");

      const transcription = await transcribeAudio(audioBuffer, mimeType);
      const extractedProfile = await extractProfileFromTranscription(transcription);

      const profileData = {
        skills: extractedProfile.skills,
        experienceYears: extractedProfile.experienceYears,
        voiceCvUrl: `data:${mimeType};base64,${audioBase64.substring(0, 100)}...`,
        voiceCvTranscript: transcription,
      };

      let profile = await storage.getCandidateProfile(req.session.userId!);
      
      if (profile) {
        await storage.updateCandidateProfile(req.session.userId!, profileData);
        profile = { ...profile, ...profileData };
      } else {
        profile = await storage.createCandidateProfile({
          userId: req.session.userId!,
          ...profileData,
        });
      }

      if (extractedProfile.skills.length > 0) {
        try {
          const embedding = await generateCandidateEmbedding(profile);
          await storage.updateCandidateProfile(req.session.userId!, { profileEmbedding: embedding });
        } catch (err) {
          console.error("Failed to generate candidate embedding:", err);
        }
      }

      const completenessScore = calculateProfileCompleteness(profile);

      res.json({
        success: true,
        transcription,
        extractedProfile,
        completenessScore,
      });
    } catch (error) {
      console.error("Error processing voice CV upload:", error);
      res.status(500).json({ message: "Erreur lors du traitement du CV vocal" });
    }
  });

  return httpServer;
}
