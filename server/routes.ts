import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { storage } from "./storage";
import { pool } from "./db";
import { insertUserSchema, loginSchema, insertJobPostingSchema, insertApplicationSchema, type UserType } from "@shared/schema";
import { z } from "zod";
import { createHash } from "crypto";

declare module "express-session" {
  interface SessionData {
    userId: string;
    userType: UserType;
  }
}

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
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

      const hashedPassword = hashPassword(validatedData.password);
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

      const hashedPassword = hashPassword(validatedData.password);
      if (user.password !== hashedPassword) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      req.session.userId = user.id;
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

  return httpServer;
}
