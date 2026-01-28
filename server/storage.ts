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
  users,
  candidateProfiles,
  agencyProfiles,
  companyProfiles,
  jobPostings,
  applications,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getCandidateProfile(userId: string): Promise<CandidateProfile | undefined> {
    const [profile] = await db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, userId));
    return profile || undefined;
  }

  async createCandidateProfile(profile: InsertCandidateProfile): Promise<CandidateProfile> {
    const [newProfile] = await db
      .insert(candidateProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async updateCandidateProfile(userId: string, updates: Partial<CandidateProfile>): Promise<CandidateProfile | undefined> {
    const [profile] = await db
      .update(candidateProfiles)
      .set(updates)
      .where(eq(candidateProfiles.userId, userId))
      .returning();
    return profile || undefined;
  }

  async getAllCandidates(): Promise<(User & { profile?: CandidateProfile })[]> {
    const candidateUsers = await db
      .select()
      .from(users)
      .where(eq(users.userType, "candidate"));
    
    const result = await Promise.all(
      candidateUsers.map(async (user) => {
        const profile = await this.getCandidateProfile(user.id);
        return { ...user, profile };
      })
    );
    return result;
  }

  async getAgencyProfile(userId: string): Promise<AgencyProfile | undefined> {
    const [profile] = await db
      .select()
      .from(agencyProfiles)
      .where(eq(agencyProfiles.userId, userId));
    return profile || undefined;
  }

  async createAgencyProfile(profile: InsertAgencyProfile): Promise<AgencyProfile> {
    const [newProfile] = await db
      .insert(agencyProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async updateAgencyProfile(userId: string, updates: Partial<AgencyProfile>): Promise<AgencyProfile | undefined> {
    const [profile] = await db
      .update(agencyProfiles)
      .set(updates)
      .where(eq(agencyProfiles.userId, userId))
      .returning();
    return profile || undefined;
  }

  async getAllAgencies(): Promise<(User & { profile?: AgencyProfile })[]> {
    const agencyUsers = await db
      .select()
      .from(users)
      .where(eq(users.userType, "agency"));
    
    const result = await Promise.all(
      agencyUsers.map(async (user) => {
        const profile = await this.getAgencyProfile(user.id);
        return { ...user, profile };
      })
    );
    return result;
  }

  async getCompanyProfile(userId: string): Promise<CompanyProfile | undefined> {
    const [profile] = await db
      .select()
      .from(companyProfiles)
      .where(eq(companyProfiles.userId, userId));
    return profile || undefined;
  }

  async createCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile> {
    const [newProfile] = await db
      .insert(companyProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async updateCompanyProfile(userId: string, updates: Partial<CompanyProfile>): Promise<CompanyProfile | undefined> {
    const [profile] = await db
      .update(companyProfiles)
      .set(updates)
      .where(eq(companyProfiles.userId, userId))
      .returning();
    return profile || undefined;
  }

  async getJobPosting(id: string): Promise<JobPosting | undefined> {
    const [job] = await db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.id, id));
    return job || undefined;
  }

  async getAllJobPostings(): Promise<JobPosting[]> {
    return db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.isActive, true));
  }

  async getJobPostingsByCompany(companyId: string): Promise<JobPosting[]> {
    return db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.companyId, companyId));
  }

  async getJobPostingsByAgency(agencyId: string): Promise<JobPosting[]> {
    return db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.agencyId, agencyId));
  }

  async createJobPosting(job: InsertJobPosting): Promise<JobPosting> {
    const [newJob] = await db.insert(jobPostings).values(job).returning();
    return newJob;
  }

  async updateJobPosting(id: string, updates: Partial<JobPosting>): Promise<JobPosting | undefined> {
    const [job] = await db
      .update(jobPostings)
      .set(updates)
      .where(eq(jobPostings.id, id))
      .returning();
    return job || undefined;
  }

  async deleteJobPosting(id: string): Promise<boolean> {
    const result = await db
      .delete(jobPostings)
      .where(eq(jobPostings.id, id))
      .returning();
    return result.length > 0;
  }

  async getApplication(id: string): Promise<Application | undefined> {
    const [app] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id));
    return app || undefined;
  }

  async getApplicationsByCandidate(candidateId: string): Promise<Application[]> {
    return db
      .select()
      .from(applications)
      .where(eq(applications.candidateId, candidateId));
  }

  async getApplicationsByJob(jobId: string): Promise<Application[]> {
    return db
      .select()
      .from(applications)
      .where(eq(applications.jobId, jobId));
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const [newApp] = await db
      .insert(applications)
      .values(application)
      .returning();
    return newApp;
  }

  async updateApplication(id: string, updates: Partial<Application>): Promise<Application | undefined> {
    const [app] = await db
      .update(applications)
      .set(updates)
      .where(eq(applications.id, id))
      .returning();
    return app || undefined;
  }
}

export const storage = new DatabaseStorage();
