import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userTypes = ["candidate", "agency", "company"] as const;
export type UserType = typeof userTypes[number];

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
});

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
  jobType: text("job_type").notNull(),
  category: text("category"),
  isActive: boolean("is_active").default(true),
});

export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull(),
  jobId: varchar("job_id").notNull(),
  status: text("status").default("pending"),
  coverLetter: text("cover_letter"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, isVerified: true });
export const insertCandidateProfileSchema = createInsertSchema(candidateProfiles).omit({ id: true });
export const insertAgencyProfileSchema = createInsertSchema(agencyProfiles).omit({ id: true });
export const insertCompanyProfileSchema = createInsertSchema(companyProfiles).omit({ id: true });
export const insertJobPostingSchema = createInsertSchema(jobPostings).omit({ id: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true });

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
export type CandidateProfile = typeof candidateProfiles.$inferSelect;
export type AgencyProfile = typeof agencyProfiles.$inferSelect;
export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type JobPosting = typeof jobPostings.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type InsertCandidateProfile = z.infer<typeof insertCandidateProfileSchema>;
export type InsertAgencyProfile = z.infer<typeof insertAgencyProfileSchema>;
export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;
export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
