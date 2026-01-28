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
  type Skill,
  type InsertSkill,
  type CandidateSkill,
  type InsertCandidateSkill,
  type AgencyPlacement,
  type InsertAgencyPlacement,
  type MatchingResult,
  type InsertMatchingResult,
  type JobRequiredSkill,
  type InsertJobRequiredSkill,
  users,
  candidateProfiles,
  agencyProfiles,
  companyProfiles,
  jobPostings,
  applications,
  skills,
  candidateSkills,
  agencyPlacements,
  matchingResults,
  jobRequiredSkills,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, sql } from "drizzle-orm";

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

  getSkill(id: string): Promise<Skill | undefined>;
  getSkillByName(name: string): Promise<Skill | undefined>;
  getAllSkills(): Promise<Skill[]>;
  createSkill(skill: InsertSkill): Promise<Skill>;
  
  getCandidateSkills(candidateProfileId: string): Promise<CandidateSkill[]>;
  addCandidateSkill(skill: InsertCandidateSkill): Promise<CandidateSkill>;
  removeCandidateSkill(id: string): Promise<boolean>;

  getAgencyPlacements(agencyId: string): Promise<AgencyPlacement[]>;
  getPlacementsByCandidate(candidateId: string): Promise<AgencyPlacement[]>;
  createAgencyPlacement(placement: InsertAgencyPlacement): Promise<AgencyPlacement>;
  updateAgencyPlacement(id: string, updates: Partial<AgencyPlacement>): Promise<AgencyPlacement | undefined>;

  getMatchingResults(candidateId: string): Promise<MatchingResult[]>;
  getMatchingResultsForJob(jobId: string): Promise<MatchingResult[]>;
  createMatchingResult(result: InsertMatchingResult): Promise<MatchingResult>;

  getJobRequiredSkills(jobId: string): Promise<JobRequiredSkill[]>;
  addJobRequiredSkill(skill: InsertJobRequiredSkill): Promise<JobRequiredSkill>;
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
    const [user] = await db.insert(users).values(insertUser as any).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
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
      .values(profile as any)
      .returning();
    return newProfile;
  }

  async updateCandidateProfile(userId: string, updates: Partial<CandidateProfile>): Promise<CandidateProfile | undefined> {
    const [profile] = await db
      .update(candidateProfiles)
      .set({ ...updates, updatedAt: new Date() })
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
      .values(profile as any)
      .returning();
    return newProfile;
  }

  async updateAgencyProfile(userId: string, updates: Partial<AgencyProfile>): Promise<AgencyProfile | undefined> {
    const [profile] = await db
      .update(agencyProfiles)
      .set({ ...updates, updatedAt: new Date() })
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
      .values(profile as any)
      .returning();
    return newProfile;
  }

  async updateCompanyProfile(userId: string, updates: Partial<CompanyProfile>): Promise<CompanyProfile | undefined> {
    const [profile] = await db
      .update(companyProfiles)
      .set({ ...updates, updatedAt: new Date() })
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
    const [newJob] = await db.insert(jobPostings).values(job as any).returning();
    return newJob;
  }

  async updateJobPosting(id: string, updates: Partial<JobPosting>): Promise<JobPosting | undefined> {
    const [job] = await db
      .update(jobPostings)
      .set({ ...updates, updatedAt: new Date() })
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
      .values(application as any)
      .returning();
    return newApp;
  }

  async updateApplication(id: string, updates: Partial<Application>): Promise<Application | undefined> {
    const [app] = await db
      .update(applications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return app || undefined;
  }

  async getSkill(id: string): Promise<Skill | undefined> {
    const [skill] = await db.select().from(skills).where(eq(skills.id, id));
    return skill || undefined;
  }

  async getSkillByName(name: string): Promise<Skill | undefined> {
    const [skill] = await db.select().from(skills).where(eq(skills.name, name));
    return skill || undefined;
  }

  async getAllSkills(): Promise<Skill[]> {
    return db.select().from(skills);
  }

  async createSkill(skill: InsertSkill): Promise<Skill> {
    const [newSkill] = await db.insert(skills).values(skill as any).returning();
    return newSkill;
  }

  async getCandidateSkills(candidateProfileId: string): Promise<CandidateSkill[]> {
    return db
      .select()
      .from(candidateSkills)
      .where(eq(candidateSkills.candidateProfileId, candidateProfileId));
  }

  async addCandidateSkill(skill: InsertCandidateSkill): Promise<CandidateSkill> {
    const [newSkill] = await db.insert(candidateSkills).values(skill as any).returning();
    return newSkill;
  }

  async removeCandidateSkill(id: string): Promise<boolean> {
    const result = await db.delete(candidateSkills).where(eq(candidateSkills.id, id)).returning();
    return result.length > 0;
  }

  async getAgencyPlacements(agencyId: string): Promise<AgencyPlacement[]> {
    return db
      .select()
      .from(agencyPlacements)
      .where(eq(agencyPlacements.agencyId, agencyId));
  }

  async getPlacementsByCandidate(candidateId: string): Promise<AgencyPlacement[]> {
    return db
      .select()
      .from(agencyPlacements)
      .where(eq(agencyPlacements.candidateId, candidateId));
  }

  async createAgencyPlacement(placement: InsertAgencyPlacement): Promise<AgencyPlacement> {
    const [newPlacement] = await db.insert(agencyPlacements).values(placement as any).returning();
    return newPlacement;
  }

  async updateAgencyPlacement(id: string, updates: Partial<AgencyPlacement>): Promise<AgencyPlacement | undefined> {
    const [placement] = await db
      .update(agencyPlacements)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(agencyPlacements.id, id))
      .returning();
    return placement || undefined;
  }

  async getMatchingResults(candidateId: string): Promise<MatchingResult[]> {
    return db
      .select()
      .from(matchingResults)
      .where(eq(matchingResults.candidateId, candidateId))
      .orderBy(desc(matchingResults.overallScore));
  }

  async getMatchingResultsForJob(jobId: string): Promise<MatchingResult[]> {
    return db
      .select()
      .from(matchingResults)
      .where(eq(matchingResults.jobId, jobId))
      .orderBy(desc(matchingResults.overallScore));
  }

  async createMatchingResult(result: InsertMatchingResult): Promise<MatchingResult> {
    const [newResult] = await db.insert(matchingResults).values(result as any).returning();
    return newResult;
  }

  async getJobRequiredSkills(jobId: string): Promise<JobRequiredSkill[]> {
    return db
      .select()
      .from(jobRequiredSkills)
      .where(eq(jobRequiredSkills.jobId, jobId));
  }

  async addJobRequiredSkill(skill: InsertJobRequiredSkill): Promise<JobRequiredSkill> {
    const [newSkill] = await db.insert(jobRequiredSkills).values(skill as any).returning();
    return newSkill;
  }
}

export const storage = new DatabaseStorage();
