import {
  type User,
  type InsertUser,
  type CandidateProfile,
  type InsertCandidateProfile,
  type AgencyProfile,
  type InsertAgencyProfile,
  type CompanyProfile,
  type InsertCompanyProfile,
  type JobPosting,
  type InsertJobPosting,
  type Application,
  type InsertApplication,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  getCandidateProfile(userId: string): Promise<CandidateProfile | undefined>;
  createCandidateProfile(profile: InsertCandidateProfile): Promise<CandidateProfile>;
  updateCandidateProfile(userId: string, updates: Partial<CandidateProfile>): Promise<CandidateProfile | undefined>;
  getAllCandidates(): Promise<(User & { profile?: CandidateProfile })[]>;
  
  getAgencyProfile(userId: string): Promise<AgencyProfile | undefined>;
  createAgencyProfile(profile: InsertAgencyProfile): Promise<AgencyProfile>;
  updateAgencyProfile(userId: string, updates: Partial<AgencyProfile>): Promise<AgencyProfile | undefined>;
  getAllAgencies(): Promise<(User & { profile?: AgencyProfile })[]>;
  
  getCompanyProfile(userId: string): Promise<CompanyProfile | undefined>;
  createCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile>;
  updateCompanyProfile(userId: string, updates: Partial<CompanyProfile>): Promise<CompanyProfile | undefined>;
  
  getJobPosting(id: string): Promise<JobPosting | undefined>;
  getAllJobPostings(): Promise<JobPosting[]>;
  getJobPostingsByCompany(companyId: string): Promise<JobPosting[]>;
  getJobPostingsByAgency(agencyId: string): Promise<JobPosting[]>;
  createJobPosting(job: InsertJobPosting): Promise<JobPosting>;
  updateJobPosting(id: string, updates: Partial<JobPosting>): Promise<JobPosting | undefined>;
  deleteJobPosting(id: string): Promise<boolean>;
  
  getApplication(id: string): Promise<Application | undefined>;
  getApplicationsByCandidate(candidateId: string): Promise<Application[]>;
  getApplicationsByJob(jobId: string): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: string, updates: Partial<Application>): Promise<Application | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private candidateProfiles: Map<string, CandidateProfile>;
  private agencyProfiles: Map<string, AgencyProfile>;
  private companyProfiles: Map<string, CompanyProfile>;
  private jobPostings: Map<string, JobPosting>;
  private applications: Map<string, Application>;

  constructor() {
    this.users = new Map();
    this.candidateProfiles = new Map();
    this.agencyProfiles = new Map();
    this.companyProfiles = new Map();
    this.jobPostings = new Map();
    this.applications = new Map();
    
    this.seedData();
  }

  private seedData() {
    const sampleJobs: JobPosting[] = [
      {
        id: "job-1",
        companyId: "company-1",
        agencyId: null,
        title: "Développeur Full Stack Senior",
        description: "Nous recherchons un développeur Full Stack expérimenté pour rejoindre notre équipe dynamique et contribuer à des projets innovants.",
        requirements: ["5+ ans d'expérience", "React, Node.js", "PostgreSQL", "AWS"],
        location: "Dakar, Sénégal",
        salaryRange: "800,000 - 1,200,000 FCFA",
        jobType: "CDI",
        category: "Technologie",
        isActive: true,
      },
      {
        id: "job-2",
        companyId: "company-2",
        agencyId: null,
        title: "Responsable Marketing Digital",
        description: "Pilotez notre stratégie marketing digitale et développez notre présence en ligne sur le marché africain.",
        requirements: ["3+ ans d'expérience", "SEO/SEA", "Réseaux sociaux", "Analytics"],
        location: "Dakar, Sénégal",
        salaryRange: "600,000 - 900,000 FCFA",
        jobType: "CDI",
        category: "Marketing",
        isActive: true,
      },
      {
        id: "job-3",
        companyId: "company-3",
        agencyId: null,
        title: "Comptable Senior",
        description: "Gérez les opérations comptables et financières de notre filiale en Côte d'Ivoire.",
        requirements: ["DESCF/DCG", "5+ ans d'expérience", "Sage", "Excel avancé"],
        location: "Abidjan, Côte d'Ivoire",
        salaryRange: "700,000 - 1,000,000 FCFA",
        jobType: "CDI",
        category: "Finance",
        isActive: true,
      },
      {
        id: "job-4",
        companyId: "company-4",
        agencyId: null,
        title: "Chef de Projet BTP",
        description: "Supervisez les projets de construction résidentielle et commerciale dans la région.",
        requirements: ["Ingénieur BTP", "8+ ans d'expérience", "AutoCAD", "MS Project"],
        location: "Bamako, Mali",
        salaryRange: "900,000 - 1,500,000 FCFA",
        jobType: "CDD",
        category: "Construction",
        isActive: true,
      },
      {
        id: "job-5",
        companyId: "company-5",
        agencyId: null,
        title: "Data Analyst",
        description: "Analysez les données pour améliorer nos produits et services financiers mobiles.",
        requirements: ["Python/R", "SQL", "Tableau/Power BI", "Machine Learning"],
        location: "Dakar, Sénégal",
        salaryRange: "500,000 - 800,000 FCFA",
        jobType: "CDI",
        category: "Technologie",
        isActive: true,
      },
    ];

    sampleJobs.forEach((job) => this.jobPostings.set(job.id, job));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      isVerified: false,
      avatarUrl: null,
      phone: insertUser.phone || null,
      city: insertUser.city || null,
      country: insertUser.country || "Sénégal",
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async getCandidateProfile(userId: string): Promise<CandidateProfile | undefined> {
    return Array.from(this.candidateProfiles.values()).find(
      (profile) => profile.userId === userId
    );
  }

  async createCandidateProfile(profile: InsertCandidateProfile): Promise<CandidateProfile> {
    const id = randomUUID();
    const newProfile: CandidateProfile = {
      id,
      userId: profile.userId,
      title: profile.title || null,
      bio: profile.bio || null,
      skills: profile.skills || null,
      experience: profile.experience || null,
      education: profile.education || null,
      languages: profile.languages || null,
      availableFrom: profile.availableFrom || null,
      salaryExpectation: profile.salaryExpectation || null,
      resumeUrl: profile.resumeUrl || null,
    };
    this.candidateProfiles.set(id, newProfile);
    return newProfile;
  }

  async updateCandidateProfile(userId: string, updates: Partial<CandidateProfile>): Promise<CandidateProfile | undefined> {
    const profile = await this.getCandidateProfile(userId);
    if (!profile) return undefined;
    const updated = { ...profile, ...updates };
    this.candidateProfiles.set(profile.id, updated);
    return updated;
  }

  async getAllCandidates(): Promise<(User & { profile?: CandidateProfile })[]> {
    return Array.from(this.users.values())
      .filter((user) => user.userType === "candidate")
      .map((user) => {
        const profile = Array.from(this.candidateProfiles.values()).find(
          (p) => p.userId === user.id
        );
        return { ...user, profile };
      });
  }

  async getAgencyProfile(userId: string): Promise<AgencyProfile | undefined> {
    return Array.from(this.agencyProfiles.values()).find(
      (profile) => profile.userId === userId
    );
  }

  async createAgencyProfile(profile: InsertAgencyProfile): Promise<AgencyProfile> {
    const id = randomUUID();
    const newProfile: AgencyProfile = {
      id,
      userId: profile.userId,
      agencyName: profile.agencyName,
      description: profile.description || null,
      specializations: profile.specializations || null,
      website: profile.website || null,
      licenseNumber: profile.licenseNumber || null,
      candidatesPlaced: profile.candidatesPlaced || 0,
    };
    this.agencyProfiles.set(id, newProfile);
    return newProfile;
  }

  async updateAgencyProfile(userId: string, updates: Partial<AgencyProfile>): Promise<AgencyProfile | undefined> {
    const profile = await this.getAgencyProfile(userId);
    if (!profile) return undefined;
    const updated = { ...profile, ...updates };
    this.agencyProfiles.set(profile.id, updated);
    return updated;
  }

  async getAllAgencies(): Promise<(User & { profile?: AgencyProfile })[]> {
    return Array.from(this.users.values())
      .filter((user) => user.userType === "agency")
      .map((user) => {
        const profile = Array.from(this.agencyProfiles.values()).find(
          (p) => p.userId === user.id
        );
        return { ...user, profile };
      });
  }

  async getCompanyProfile(userId: string): Promise<CompanyProfile | undefined> {
    return Array.from(this.companyProfiles.values()).find(
      (profile) => profile.userId === userId
    );
  }

  async createCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile> {
    const id = randomUUID();
    const newProfile: CompanyProfile = {
      id,
      userId: profile.userId,
      companyName: profile.companyName,
      industry: profile.industry || null,
      description: profile.description || null,
      website: profile.website || null,
      employeeCount: profile.employeeCount || null,
      foundedYear: profile.foundedYear || null,
      logoUrl: profile.logoUrl || null,
    };
    this.companyProfiles.set(id, newProfile);
    return newProfile;
  }

  async updateCompanyProfile(userId: string, updates: Partial<CompanyProfile>): Promise<CompanyProfile | undefined> {
    const profile = await this.getCompanyProfile(userId);
    if (!profile) return undefined;
    const updated = { ...profile, ...updates };
    this.companyProfiles.set(profile.id, updated);
    return updated;
  }

  async getJobPosting(id: string): Promise<JobPosting | undefined> {
    return this.jobPostings.get(id);
  }

  async getAllJobPostings(): Promise<JobPosting[]> {
    return Array.from(this.jobPostings.values()).filter((job) => job.isActive);
  }

  async getJobPostingsByCompany(companyId: string): Promise<JobPosting[]> {
    return Array.from(this.jobPostings.values()).filter(
      (job) => job.companyId === companyId
    );
  }

  async getJobPostingsByAgency(agencyId: string): Promise<JobPosting[]> {
    return Array.from(this.jobPostings.values()).filter(
      (job) => job.agencyId === agencyId
    );
  }

  async createJobPosting(job: InsertJobPosting): Promise<JobPosting> {
    const id = randomUUID();
    const newJob: JobPosting = {
      id,
      companyId: job.companyId,
      agencyId: job.agencyId || null,
      title: job.title,
      description: job.description,
      requirements: job.requirements || null,
      location: job.location,
      salaryRange: job.salaryRange || null,
      jobType: job.jobType,
      category: job.category || null,
      isActive: job.isActive ?? true,
    };
    this.jobPostings.set(id, newJob);
    return newJob;
  }

  async updateJobPosting(id: string, updates: Partial<JobPosting>): Promise<JobPosting | undefined> {
    const job = this.jobPostings.get(id);
    if (!job) return undefined;
    const updated = { ...job, ...updates };
    this.jobPostings.set(id, updated);
    return updated;
  }

  async deleteJobPosting(id: string): Promise<boolean> {
    return this.jobPostings.delete(id);
  }

  async getApplication(id: string): Promise<Application | undefined> {
    return this.applications.get(id);
  }

  async getApplicationsByCandidate(candidateId: string): Promise<Application[]> {
    return Array.from(this.applications.values()).filter(
      (app) => app.candidateId === candidateId
    );
  }

  async getApplicationsByJob(jobId: string): Promise<Application[]> {
    return Array.from(this.applications.values()).filter(
      (app) => app.jobId === jobId
    );
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const id = randomUUID();
    const newApplication: Application = {
      id,
      candidateId: application.candidateId,
      jobId: application.jobId,
      status: application.status || "pending",
      coverLetter: application.coverLetter || null,
    };
    this.applications.set(id, newApplication);
    return newApplication;
  }

  async updateApplication(id: string, updates: Partial<Application>): Promise<Application | undefined> {
    const application = this.applications.get(id);
    if (!application) return undefined;
    const updated = { ...application, ...updates };
    this.applications.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
