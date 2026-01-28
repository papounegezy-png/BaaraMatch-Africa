import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userTypes = ["candidate", "agency", "company"] as const;
export type UserType = typeof userTypes[number];

export const applicationStatuses = ["pending", "reviewing", "shortlisted", "interview", "offered", "hired", "rejected", "withdrawn"] as const;
export type ApplicationStatus = typeof applicationStatuses[number];

export const placementStatuses = ["active", "completed", "terminated", "on_leave"] as const;
export type PlacementStatus = typeof placementStatuses[number];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  userType: text("user_type").$type<UserType>().notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  city: text("city"),
  country: text("country").default("Sénégal"),
  avatarUrl: text("avatar_url"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const skills = pgTable("skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  nameFr: text("name_fr"),
  category: text("category"),
  embedding: real("embedding").array(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  nameIdx: index("skills_name_idx").on(table.name),
  categoryIdx: index("skills_category_idx").on(table.category),
}));

export const candidateSkills = pgTable("candidate_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateProfileId: varchar("candidate_profile_id").notNull(),
  skillId: varchar("skill_id").notNull().references(() => skills.id),
  proficiencyLevel: integer("proficiency_level").default(3),
  yearsExperience: integer("years_experience"),
  isVerified: boolean("is_verified").default(false),
}, (table) => ({
  candidateIdx: index("candidate_skills_candidate_idx").on(table.candidateProfileId),
  skillIdx: index("candidate_skills_skill_idx").on(table.skillId),
}));

export const candidateProfiles = pgTable("candidate_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title"),
  bio: text("bio"),
  skills: text("skills").array(),
  experience: text("experience"),
  education: text("education"),
  languages: text("languages").array(),
  availableFrom: text("available_from"),
  salaryExpectation: text("salary_expectation"),
  resumeUrl: text("resume_url"),
  voiceCvUrl: text("voice_cv_url"),
  voiceCvWhatsappId: text("voice_cv_whatsapp_id"),
  voiceCvDuration: integer("voice_cv_duration"),
  voiceCvTranscript: text("voice_cv_transcript"),
  whatsappNumber: text("whatsapp_number"),
  preferredContact: text("preferred_contact").default("whatsapp"),
  profileEmbedding: real("profile_embedding").array(),
  matchingScore: real("matching_score"),
  experienceYears: integer("experience_years"),
  educationLevel: text("education_level"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agencyProfiles = pgTable("agency_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  agencyName: text("agency_name").notNull(),
  description: text("description"),
  specializations: text("specializations").array(),
  website: text("website"),
  licenseNumber: text("license_number"),
  candidatesPlaced: integer("candidates_placed").default(0),
  apdpCertificateUrl: text("apdp_certificate_url"),
  businessRegistrationUrl: text("business_registration_url"),
  verificationStatus: text("verification_status").default("pending"),
  rating: real("rating"),
  totalPlacements: integer("total_placements").default(0),
  activePlacements: integer("active_placements").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companyProfiles = pgTable("company_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyName: text("company_name").notNull(),
  industry: text("industry"),
  description: text("description"),
  website: text("website"),
  employeeCount: text("employee_count"),
  foundedYear: integer("founded_year"),
  logoUrl: text("logo_url"),
  siretNumber: text("siret_number"),
  vatNumber: text("vat_number"),
  billingAddress: text("billing_address"),
  companyEmbedding: real("company_embedding").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobPostings = pgTable("job_postings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  agencyId: varchar("agency_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements").array(),
  location: text("location").notNull(),
  salaryRange: text("salary_range"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: text("salary_currency").default("XOF"),
  jobType: text("job_type").notNull(),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  requiredSkills: text("required_skills").array(),
  preferredSkills: text("preferred_skills").array(),
  experienceMin: integer("experience_min"),
  experienceMax: integer("experience_max"),
  educationLevel: text("education_level"),
  languages: text("languages").array(),
  benefits: text("benefits").array(),
  applicationDeadline: timestamp("application_deadline"),
  startDate: timestamp("start_date"),
  isRemote: boolean("is_remote").default(false),
  isUrgent: boolean("is_urgent").default(false),
  viewCount: integer("view_count").default(0),
  applicationCount: integer("application_count").default(0),
  jobEmbedding: real("job_embedding").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyIdx: index("job_postings_company_idx").on(table.companyId),
  categoryIdx: index("job_postings_category_idx").on(table.category),
  activeIdx: index("job_postings_active_idx").on(table.isActive),
  locationIdx: index("job_postings_location_idx").on(table.location),
}));

export const jobRequiredSkills = pgTable("job_required_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobPostings.id),
  skillId: varchar("skill_id").notNull().references(() => skills.id),
  minProficiency: integer("min_proficiency").default(1),
  isRequired: boolean("is_required").default(true),
  weight: real("weight").default(1.0),
}, (table) => ({
  jobIdx: index("job_required_skills_job_idx").on(table.jobId),
  skillIdx: index("job_required_skills_skill_idx").on(table.skillId),
}));

export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull(),
  jobId: varchar("job_id").notNull().references(() => jobPostings.id),
  agencyId: varchar("agency_id"),
  status: text("status").$type<ApplicationStatus>().default("pending"),
  coverLetter: text("cover_letter"),
  voiceIntroUrl: text("voice_intro_url"),
  matchScore: real("match_score"),
  reviewerNotes: text("reviewer_notes"),
  interviewDate: timestamp("interview_date"),
  offeredSalary: integer("offered_salary"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  statusHistory: text("status_history").array(),
}, (table) => ({
  candidateIdx: index("applications_candidate_idx").on(table.candidateId),
  jobIdx: index("applications_job_idx").on(table.jobId),
  statusIdx: index("applications_status_idx").on(table.status),
}));

export const agencyPlacements = pgTable("agency_placements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").notNull(),
  candidateId: varchar("candidate_id").notNull(),
  companyId: varchar("company_id").notNull(),
  jobId: varchar("job_id").references(() => jobPostings.id),
  applicationId: varchar("application_id").references(() => applications.id),
  status: text("status").$type<PlacementStatus>().default("active"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  contractType: text("contract_type"),
  salary: integer("salary"),
  salaryCurrency: text("salary_currency").default("XOF"),
  commissionRate: real("commission_rate"),
  commissionAmount: integer("commission_amount"),
  notes: text("notes"),
  performanceRating: real("performance_rating"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  agencyIdx: index("agency_placements_agency_idx").on(table.agencyId),
  candidateIdx: index("agency_placements_candidate_idx").on(table.candidateId),
  companyIdx: index("agency_placements_company_idx").on(table.companyId),
  statusIdx: index("agency_placements_status_idx").on(table.status),
}));

export const matchingResults = pgTable("matching_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull(),
  jobId: varchar("job_id").notNull().references(() => jobPostings.id),
  overallScore: real("overall_score").notNull(),
  skillScore: real("skill_score"),
  experienceScore: real("experience_score"),
  educationScore: real("education_score"),
  locationScore: real("location_score"),
  salaryScore: real("salary_score"),
  semanticScore: real("semantic_score"),
  matchDetails: text("match_details"),
  isRecommended: boolean("is_recommended").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  candidateIdx: index("matching_results_candidate_idx").on(table.candidateId),
  jobIdx: index("matching_results_job_idx").on(table.jobId),
  scoreIdx: index("matching_results_score_idx").on(table.overallScore),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true, isVerified: true, createdAt: true, updatedAt: true });
export const insertSkillSchema = createInsertSchema(skills).omit({ id: true, createdAt: true });
export const insertCandidateSkillSchema = createInsertSchema(candidateSkills).omit({ id: true });
export const insertCandidateProfileSchema = createInsertSchema(candidateProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAgencyProfileSchema = createInsertSchema(agencyProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCompanyProfileSchema = createInsertSchema(companyProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertJobPostingSchema = createInsertSchema(jobPostings).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true, applicationCount: true });
export const insertJobRequiredSkillSchema = createInsertSchema(jobRequiredSkills).omit({ id: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAgencyPlacementSchema = createInsertSchema(agencyPlacements).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMatchingResultSchema = createInsertSchema(matchingResults).omit({ id: true, createdAt: true });

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type CandidateSkill = typeof candidateSkills.$inferSelect;
export type CandidateProfile = typeof candidateProfiles.$inferSelect;
export type AgencyProfile = typeof agencyProfiles.$inferSelect;
export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type JobPosting = typeof jobPostings.$inferSelect;
export type JobRequiredSkill = typeof jobRequiredSkills.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type AgencyPlacement = typeof agencyPlacements.$inferSelect;
export type MatchingResult = typeof matchingResults.$inferSelect;
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type InsertCandidateSkill = z.infer<typeof insertCandidateSkillSchema>;
export type InsertCandidateProfile = z.infer<typeof insertCandidateProfileSchema>;
export type InsertAgencyProfile = z.infer<typeof insertAgencyProfileSchema>;
export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;
export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;
export type InsertJobRequiredSkill = z.infer<typeof insertJobRequiredSkillSchema>;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type InsertAgencyPlacement = z.infer<typeof insertAgencyPlacementSchema>;
export type InsertMatchingResult = z.infer<typeof insertMatchingResultSchema>;
