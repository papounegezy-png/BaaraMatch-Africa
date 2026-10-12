import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, real, index, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userTypes = ["candidate", "agency", "company", "admin"] as const;
export type UserType = typeof userTypes[number];

// Permission levels for userType "admin" accounts. moderateur only reviews
// the moderation queue; gestionnaire_comptes can additionally create prospect
// organizations and post jobs on their behalf; super_admin can also manage
// other admin accounts (create, change level, activate/deactivate).
export const adminLevels = ["super_admin", "gestionnaire_comptes", "moderateur"] as const;
export type AdminLevel = typeof adminLevels[number];

// Single source of truth for what each admin level can do — read by both
// the server (route guards) and the client (hiding UI a level can't use),
// so the two can't silently drift apart. "*" grants everything.
export const adminPermissions: Record<AdminLevel, readonly string[]> = {
  moderateur: ["offres:valider", "offres:rejeter"],
  gestionnaire_comptes: [
    "offres:valider",
    "offres:rejeter",
    "organisations:creer_prospect",
    "organisations:gerer",
    "offres:creer_pour_autrui",
    "candidats:consulter_profil_complet",
  ],
  super_admin: ["*"],
};

export function hasAdminPermission(level: AdminLevel | null | undefined, permission: string): boolean {
  if (!level) return false;
  const permissions = adminPermissions[level];
  return permissions.includes("*") || permissions.includes(permission);
}

export const jobManagementTypes = ["autonome", "geree_par_baaramatch"] as const;
export type JobManagementType = typeof jobManagementTypes[number];

export const companyModuleTypes = [
  "sites",           // Gestion des chantiers/sites
  "certifications",  // Habilitations & Certifications
  "epi",             // EPI & Équipements
  "hse",             // HSE (Hygiène, Sécurité, Environnement)
  "interim"          // Intérimaires/Sous-traitants
] as const;
export type CompanyModuleType = typeof companyModuleTypes[number];

export const operationalModuleKeys = [
  "employee",
  "leave",
  "payroll",
  "security",
  "certifications",
  "hse",
  "sites",
  "epi",
  "departments",
  "positions",
] as const;
export type OperationalModuleKey = typeof operationalModuleKeys[number];

// "interview_proposed" = the recruiter offered candidate-choice time slots
// but none has been picked yet; the status only becomes "interview" once
// the candidate actually claims one (see interviewSlots below) — otherwise
// "interview" would be a lie about a meeting that was never confirmed.
export const applicationStatuses = ["pending", "reviewing", "shortlisted", "interview_proposed", "interview", "offered", "hired", "rejected", "withdrawn"] as const;
export type ApplicationStatus = typeof applicationStatuses[number];

export const placementStatuses = ["active", "completed", "terminated", "on_leave"] as const;
export type PlacementStatus = typeof placementStatuses[number];

export type CandidateEducationEntry = {
  id: string;
  level: string;
  institution: string;
  degree: string;
  startYear: string;
  endYear: string;
};

export type CandidateCertificationEntry = {
  id: string;
  name: string;
  issuer: string;
  obtainedDate: string;
};

export type CandidateExperienceEntry = {
  id: string;
  position: string;
  company: string;
  contractType: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  missionDescription: string;
};

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
  isSuperAdmin: boolean("is_super_admin").default(false),
  // Prospect organizations: company/agency accounts an admin creates on
  // behalf of a third party that has no login yet, so a job can be posted
  // for them immediately. claimToken lets the real owner take the account
  // over later by setting their own password. The contact fields record who
  // the admin actually spoke to before creating the account, since that
  // person's name/phone rarely matches the eventual login email — they also
  // double as the self-service "is this your business?" match key at
  // registration time.
  isProspect: boolean("is_prospect").default(false),
  claimToken: text("claim_token"),
  claimedAt: timestamp("claimed_at"),
  prospectContactName: text("prospect_contact_name"),
  prospectContactPhone: text("prospect_contact_phone"),
  // Which admin created this prospect organization on behalf of a third
  // party (not used for admin-account traceability — see adminProfiles).
  // References adminProfiles.id (not users.id directly) so the FK itself
  // guarantees the creator is an actual admin account.
  createdByAdminId: varchar("created_by_admin_id").references((): any => adminProfiles.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Role-specific fields for userType === "admin" accounts, kept off the
// generic `users` table the same way candidateProfiles/agencyProfiles/
// companyProfiles keep role-specific fields off it for their own roles.
export const adminProfiles = pgTable("admin_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  adminLevel: text("admin_level").$type<AdminLevel>().notNull().default("moderateur"),
  // Lets a super_admin suspend another admin's access without deleting the
  // account.
  isActive: boolean("is_active").default(true),
  // Which super_admin created this admin account.
  createdByAdminId: varchar("created_by_admin_id").references((): any => users.id),
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
  resumeFileName: text("resume_file_name"),
  resumeMimeType: text("resume_mime_type"),
  voiceCvUrl: text("voice_cv_url"),
  voiceCvWhatsappId: text("voice_cv_whatsapp_id"),
  voiceCvDuration: integer("voice_cv_duration"),
  voiceCvTranscript: text("voice_cv_transcript"),
  educationEntries: jsonb("education_entries").$type<CandidateEducationEntry[]>().default(sql`'[]'::jsonb`),
  certifications: jsonb("certifications").$type<CandidateCertificationEntry[]>().default(sql`'[]'::jsonb`),
  experiences: jsonb("experiences").$type<CandidateExperienceEntry[]>().default(sql`'[]'::jsonb`),
  whatsappNumber: text("whatsapp_number"),
  preferredContact: text("preferred_contact").default("whatsapp"),
  profileEmbedding: real("profile_embedding").array(),
  matchingScore: real("matching_score"),
  experienceYears: integer("experience_years"),
  educationLevel: text("education_level"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agencySubscriptionPlans = ["standard", "partner"] as const;
export type AgencySubscriptionPlan = typeof agencySubscriptionPlans[number];

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
  subscriptionPlan: text("subscription_plan").$type<AgencySubscriptionPlan>().default("standard"),
  subscriptionUpdatedAt: timestamp("subscription_updated_at"),
  // Set when the plan came from a pilot invitation code redemption (see
  // invitationCodes below) rather than a manual Super Admin toggle. No
  // automatic downgrade job reads this yet — display-only for now.
  partnerTrialEndsAt: timestamp("partner_trial_ends_at"),
  rccmNumber: text("rccm_number"),
  rating: real("rating"),
  totalPlacements: integer("total_placements").default(0),
  activePlacements: integer("active_placements").default(0),
  foundedYear: integer("founded_year"),
  employeeCount: integer("employee_count"),
  averageAge: integer("average_age"),
  genderRatioMale: integer("gender_ratio_male"),
  // Incremented by POST /api/agencies/:id/view (agency-profile.tsx fires it
  // on mount), excluding the owner viewing their own page — feeds the admin
  // "Top organisations visitées" statistic.
  profileViewCount: integer("profile_view_count").default(0),
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
  rating: real("rating"),
  employeeCount: text("employee_count"),
  foundedYear: integer("founded_year"),
  logoUrl: text("logo_url"),
  coverImageUrl: text("cover_image_url"),
  siretNumber: text("siret_number"),
  vatNumber: text("vat_number"),
  billingAddress: text("billing_address"),
  companyEmbedding: real("company_embedding").array(),
  rccmNumber: text("rccm_number"),
  // Same as agencyProfiles.profileViewCount above.
  profileViewCount: integer("profile_view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companyModules = pgTable("company_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyProfileId: varchar("company_profile_id").notNull().references(() => companyProfiles.id),
  moduleType: text("module_type").$type<CompanyModuleType>().notNull(),
  isEnabled: boolean("is_enabled").default(true),
  enabledAt: timestamp("enabled_at").defaultNow(),
  enabledBy: varchar("enabled_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyModuleIdx: index("company_modules_company_idx").on(table.companyProfileId),
  moduleTypeIdx: index("company_modules_type_idx").on(table.moduleType),
}));

export const companyOperationalStates = pgTable("company_operational_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyUserId: varchar("company_user_id").notNull().references(() => users.id),
  moduleKey: text("module_key").$type<OperationalModuleKey>().notNull(),
  state: jsonb("state").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyModuleStateIdx: index("company_operational_states_company_module_idx").on(table.companyUserId, table.moduleKey),
}));

export const jobPostings = pgTable("job_postings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  agencyId: varchar("agency_id"),
  // For an agency-posted job, companyId is the agency itself — this is what
  // ties the mission to the actual client (agency CRM fiche). Nullable:
  // company-posted jobs and older agency jobs have no client fiche.
  agencyClientId: varchar("agency_client_id").references((): any => agencyClients.id, { onDelete: "set null" }),
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
  // How many people are being hired for this exact posting — most postings
  // want one, but a mining/BTP mission can genuinely need several
  // identical roles filled at once. Lets "postes pourvus" be a real,
  // computed fact (hired applications / positions) instead of a guess.
  positions: integer("positions").notNull().default(1),
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
  // Company-side opt-out from the unauthenticated agency browse list
  // (GET /api/jobs, rendered as "Offres & missions" in the agency
  // dashboard) — irrelevant for a job an agency posted itself.
  visibleToAgencies: boolean("visible_to_agencies").default(true),
  // Some postings (esp. admin-managed jobs for a third party that screens
  // applications itself) don't want candidates applying through BaaraMatch
  // at all — this hides the "Postuler maintenant" CTA on the job's detail
  // page rather than accepting applications the poster won't act on.
  acceptsPlatformApplications: boolean("accepts_platform_applications").default(true),
  viewCount: integer("view_count").default(0),
  applicationCount: integer("application_count").default(0),
  // Traceability for jobs an admin posts on behalf of a company/agency
  // (typically a prospect organization without its own login yet). Unlike a
  // self-service posting, an admin-managed job needs no separate review —
  // the admin creating it is the validator, so validatedByAdminId/
  // validatedAt are stamped at creation time, not left for a later
  // moderation pass. Both reference adminProfiles.id, not users.id.
  managementType: text("management_type").$type<JobManagementType>().default("autonome"),
  createdByAdminId: varchar("created_by_admin_id").references(() => adminProfiles.id),
  validatedByAdminId: varchar("validated_by_admin_id").references(() => adminProfiles.id),
  validatedAt: timestamp("validated_at"),
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
  // Set to now() every time (and only when) `status` actually changes — see
  // PATCH /api/applications/:id. Powers "days in stage" on the recruitment
  // Kanban board without having to parse statusHistory.
  statusChangedAt: timestamp("status_changed_at").defaultNow(),
  statusHistory: text("status_history").array(),
}, (table) => ({
  candidateIdx: index("applications_candidate_idx").on(table.candidateId),
  jobIdx: index("applications_job_idx").on(table.jobId),
  statusIdx: index("applications_status_idx").on(table.status),
}));

// Candidate-choice interview scheduling ("propose several slots, candidate
// picks one, first click wins" — like BambooHR self-scheduling). Slots are
// scoped to a single application, not shared across candidates.
export const interviewSlots = pgTable("interview_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id),
  startTime: timestamp("start_time").notNull(),
  // Only ever flips false -> true, and only once per application — enforced
  // at the DB layer by a conditional UPDATE (see storage.claimInterviewSlot),
  // not just checked in application code, so a double-click or two tabs
  // racing can't both "win".
  isSelected: boolean("is_selected").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  applicationIdx: index("interview_slots_application_idx").on(table.applicationId),
}));

// Backs the "Heart" save button on job-detail.tsx / jobs.tsx — was
// previously a decorative button with no onClick at all.
export const savedJobs = pgTable("saved_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => users.id),
  jobId: varchar("job_id").notNull().references(() => jobPostings.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueCandidateJob: unique().on(table.candidateId, table.jobId),
  candidateIdx: index("saved_jobs_candidate_idx").on(table.candidateId),
}));

export const agencyPlacements = pgTable("agency_placements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").notNull(),
  candidateId: varchar("candidate_id").notNull(),
  // Registered company account, when the client has one. Most agency
  // clients aren't on BaaraMatch: the client of record is agencyClientId.
  companyId: varchar("company_id"),
  // The agency CRM fiche this placement was made for — the canonical client
  // (name, address, RCCM on invoices). Always set for placements created
  // since migration 0033, which also backfilled older rows.
  agencyClientId: varchar("agency_client_id").references((): any => agencyClients.id, { onDelete: "set null" }),
  jobId: varchar("job_id").references(() => jobPostings.id),
  applicationId: varchar("application_id").references(() => applications.id),
  // The placed candidate's role/title on this contract. Independent of
  // jobId — an agency can record a placement without it tracing back to a
  // formal job posting on the platform (e.g. an off-platform deal), but the
  // contracts list always needs a role to display.
  position: text("position"),
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

// ---- Agency client CRM ("Entreprises" section of the agency space) --------
// An agency's own, private file on each client company. Most of an agency's
// clients are NOT registered on BaaraMatch, so this is deliberately not the
// `users` row of a company: `companyUserId` optionally links the fiche to a
// registered company so its placements show up in the client's history.
export const agencyClientStatuses = ["prospect", "active", "inactive"] as const;
export type AgencyClientStatus = typeof agencyClientStatuses[number];

export const agencyClients = pgTable("agency_clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").notNull().references(() => users.id),
  companyUserId: varchar("company_user_id").references(() => users.id),
  name: text("name").notNull(),
  sector: text("sector"),
  city: text("city"),
  country: text("country"),
  address: text("address"),
  website: text("website"),
  // RCCM / NIF — what West-African clients put on contracts and invoices.
  registrationNumber: text("registration_number"),
  status: text("status").$type<AgencyClientStatus>().notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  agencyIdx: index("agency_clients_agency_idx").on(table.agencyId),
  uniqueAgencyCompany: unique("agency_clients_agency_company_unique").on(table.agencyId, table.companyUserId),
}));

export const agencyClientContacts = pgTable("agency_client_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").notNull().references(() => users.id),
  clientId: varchar("client_id").notNull().references(() => agencyClients.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  jobTitle: text("job_title"),
  email: text("email"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  isPrimary: boolean("is_primary").notNull().default(false),
  notes: text("notes"),
  lastContactAt: timestamp("last_contact_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  agencyIdx: index("agency_client_contacts_agency_idx").on(table.agencyId),
  clientIdx: index("agency_client_contacts_client_idx").on(table.clientId),
}));

export const agencyClientNeedStatuses = ["new", "qualified", "in_progress", "filled", "cancelled"] as const;
export type AgencyClientNeedStatus = typeof agencyClientNeedStatuses[number];
export const agencyClientNeedPriorities = ["low", "normal", "high", "urgent"] as const;
export type AgencyClientNeedPriority = typeof agencyClientNeedPriorities[number];

// A client's hiring request as the agency received it (phone call, email,
// visit) — upstream of a published mission. Converting it creates a draft
// job posting linked back through `jobId`.
export const agencyClientNeeds = pgTable("agency_client_needs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").notNull().references(() => users.id),
  clientId: varchar("client_id").notNull().references(() => agencyClients.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id").references(() => agencyClientContacts.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  positions: integer("positions").notNull().default(1),
  contractType: text("contract_type"),
  location: text("location"),
  desiredStartDate: timestamp("desired_start_date"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  priority: text("priority").$type<AgencyClientNeedPriority>().notNull().default("normal"),
  status: text("status").$type<AgencyClientNeedStatus>().notNull().default("new"),
  description: text("description"),
  jobId: varchar("job_id").references(() => jobPostings.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  agencyIdx: index("agency_client_needs_agency_idx").on(table.agencyId),
  clientIdx: index("agency_client_needs_client_idx").on(table.clientId),
}));

export const agencyClientAgreementTypes = ["framework", "secondment", "nda", "pricing", "other"] as const;
export type AgencyClientAgreementType = typeof agencyClientAgreementTypes[number];
export const agencyClientAgreementStatuses = ["draft", "sent", "signed", "terminated"] as const;
export type AgencyClientAgreementStatus = typeof agencyClientAgreementStatuses[number];

// Commercial agreements with a client (contrat-cadre, convention de mise à
// disposition, NDA, grille tarifaire). "Expiré" is derived from endDate, not
// stored — same approach as placements. The signed file is optional and
// served only through an ownership-checked route.
export const agencyClientAgreements = pgTable("agency_client_agreements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").notNull().references(() => users.id),
  clientId: varchar("client_id").notNull().references(() => agencyClients.id, { onDelete: "cascade" }),
  type: text("type").$type<AgencyClientAgreementType>().notNull(),
  title: text("title").notNull(),
  reference: text("reference"),
  status: text("status").$type<AgencyClientAgreementStatus>().notNull().default("draft"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  commissionRate: real("commission_rate"),
  paymentTermsDays: integer("payment_terms_days"),
  notes: text("notes"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileMimeType: text("file_mime_type"),
  fileSizeBytes: integer("file_size_bytes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  agencyIdx: index("agency_client_agreements_agency_idx").on(table.agencyId),
  clientIdx: index("agency_client_agreements_client_idx").on(table.clientId),
}));

// ---- Agency client relations ("CRM" section) -------------------------------
// Every exchange with a client fiche — logged by hand (call, meeting…) or
// automatically (email sent from BaaraMatch, invoice sent, reminder…).
export const agencyInteractionTypes = ["call", "email", "meeting", "whatsapp", "visit", "note"] as const;
export type AgencyInteractionType = typeof agencyInteractionTypes[number];
export const agencyInteractionOutcomes = ["positive", "neutral", "negative"] as const;
export type AgencyInteractionOutcome = typeof agencyInteractionOutcomes[number];

export const agencyInteractions = pgTable("agency_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").notNull().references(() => users.id),
  clientId: varchar("client_id").notNull().references(() => agencyClients.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id").references(() => agencyClientContacts.id, { onDelete: "set null" }),
  type: text("type").$type<AgencyInteractionType>().notNull(),
  direction: text("direction").$type<"inbound" | "outbound">(),
  subject: text("subject").notNull(),
  body: text("body"),
  outcome: text("outcome").$type<AgencyInteractionOutcome>(),
  durationMinutes: integer("duration_minutes"),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  // "manual" = logged by the agency; "platform" = sent through BaaraMatch
  // (email composer, invoice, reminder, survey) — not editable.
  source: text("source").$type<"manual" | "platform">().notNull().default("manual"),
  emailTo: text("email_to"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  agencyIdx: index("agency_interactions_agency_idx").on(table.agencyId),
  clientIdx: index("agency_interactions_client_idx").on(table.clientId),
  occurredIdx: index("agency_interactions_occurred_idx").on(table.occurredAt),
}));

export const agencyReminderStatuses = ["open", "done", "cancelled"] as const;
export type AgencyReminderStatus = typeof agencyReminderStatuses[number];

// Follow-ups ("relances"): created by hand or by the agency's automatic rules.
// ruleKey makes rule-generated reminders idempotent (one per rule + object).
export const agencyReminders = pgTable("agency_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").notNull().references(() => users.id),
  clientId: varchar("client_id").references(() => agencyClients.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id").references(() => agencyClientContacts.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  notes: text("notes"),
  channel: text("channel").$type<AgencyInteractionType>(),
  dueAt: timestamp("due_at").notNull(),
  status: text("status").$type<AgencyReminderStatus>().notNull().default("open"),
  source: text("source").$type<"manual" | "rule">().notNull().default("manual"),
  ruleKey: text("rule_key"),
  relatedUrl: text("related_url"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  agencyIdx: index("agency_reminders_agency_idx").on(table.agencyId),
  uniqueRule: unique("agency_reminders_rule_unique").on(table.agencyId, table.ruleKey),
}));

// Per-agency automatic follow-up rules (on/off + threshold in days).
export type AgencyReminderRules = Record<
  "invoice_overdue" | "agreement_expiring" | "client_dormant" | "need_untreated" | "placement_ending" | "detractor",
  { enabled: boolean; days: number }
>;

export const agencyCrmSettings = pgTable("agency_crm_settings", {
  agencyId: varchar("agency_id").primaryKey().references(() => users.id),
  rules: jsonb("rules").$type<Partial<AgencyReminderRules>>().notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client satisfaction survey (NPS 0–10 + comment), answered through a
// one-time public link — the client needs no BaaraMatch account.
export const agencySatisfactionSurveys = pgTable("agency_satisfaction_surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").notNull().references(() => users.id),
  clientId: varchar("client_id").notNull().references(() => agencyClients.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id").references(() => agencyClientContacts.id, { onDelete: "set null" }),
  token: text("token").notNull().unique(),
  sentTo: text("sent_to").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  respondedAt: timestamp("responded_at"),
  score: integer("score"),
  comment: text("comment"),
}, (table) => ({
  agencyIdx: index("agency_satisfaction_agency_idx").on(table.agencyId),
}));

// Pièces du dossier candidat déposées par une agence (« CV & pièces jointes »).
// Scopées à l'agence qui les a déposées : une pièce d'identité ou un certificat
// médical transmis à l'agence A n'est jamais visible par l'agence B. Le CV que
// le candidat a lui-même déposé reste sur candidateProfiles.resumeUrl.
export const candidateDocumentTypes = ["cv", "id", "diploma", "certificate", "medical", "reference", "other"] as const;
export type CandidateDocumentType = typeof candidateDocumentTypes[number];

export const candidateDocuments = pgTable("candidate_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").notNull().references(() => users.id),
  candidateId: varchar("candidate_id").notNull().references(() => users.id),
  type: text("type").$type<CandidateDocumentType>().notNull(),
  name: text("name").notNull(),
  // Either an /api/files/... object-storage URL or an inline data: URL when
  // no bucket is provisioned (same fallback as resumes). Never sent to the
  // client — files are served through the ownership-checked download route.
  url: text("url").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  // Validity end for documents that lapse (pièce d'identité, visite médicale,
  // habilitations BTP/Mines) — drives the "expiré / expire bientôt" alerts.
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  agencyIdx: index("candidate_documents_agency_idx").on(table.agencyId),
  candidateIdx: index("candidate_documents_candidate_idx").on(table.candidateId),
}));

// Lightweight V0 field-mission tracking for partner agencies — deliberately
// separate from agencyPlacements above (that table is billing/commission-
// oriented and requires a real companyId; a field mission's client is free
// text for this version, no structured client portfolio yet). Named
// "field missions" internally to avoid colliding with the existing
// "Missions" terminology, which already means an agency's job postings
// throughout this app's UI (see /agency/missions, missions-management.tsx).
export const fieldMissionStatuses = ["planned", "in_progress", "completed", "cancelled", "disputed"] as const;
export type FieldMissionStatus = typeof fieldMissionStatuses[number];

export const fieldMissions = pgTable("field_missions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").notNull().references(() => users.id),
  candidateId: varchar("candidate_id").notNull().references(() => users.id),
  clientName: text("client_name").notNull(),
  jobTitle: text("job_title").notNull(),
  location: text("location").notNull(),
  startDate: timestamp("start_date").notNull(),
  plannedEndDate: timestamp("planned_end_date").notNull(),
  actualEndDate: timestamp("actual_end_date"),
  dailyRateFcfa: integer("daily_rate_fcfa").notNull(),
  status: text("status").$type<FieldMissionStatus>().default("planned"),
  disputeReason: text("dispute_reason"),
  clientRating: integer("client_rating"),
  clientFeedback: text("client_feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  agencyIdx: index("field_missions_agency_idx").on(table.agencyId),
  candidateIdx: index("field_missions_candidate_idx").on(table.candidateId),
  statusIdx: index("field_missions_status_idx").on(table.status),
}));

export const insertFieldMissionSchema = createInsertSchema(fieldMissions).omit({
  id: true, createdAt: true, updatedAt: true, status: true, actualEndDate: true,
  disputeReason: true, clientRating: true, clientFeedback: true,
});
export type InsertFieldMission = z.infer<typeof insertFieldMissionSchema>;
export type FieldMission = typeof fieldMissions.$inferSelect;

// Pilot-agency self-service upgrade codes — an admin generates one and hands
// it over off-platform (phone/WhatsApp); redeeming it at registration jumps
// straight to the "Agence Partenaire" plan with a free trial, no manual
// per-account toggle needed. Scoped to agencies: companies have no
// subscription-tier concept in this app to redeem a code into.
export const invitationCodes = pgTable("invitation_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  targetPlan: text("target_plan").$type<AgencySubscriptionPlan>().notNull(),
  trialDays: integer("trial_days").notNull().default(90),
  isUsed: boolean("is_used").default(false),
  organizationId: varchar("organization_id").unique().references(() => users.id),
  createdByAdminId: varchar("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvitationCodeSchema = createInsertSchema(invitationCodes).omit({
  id: true, createdAt: true, isUsed: true, organizationId: true,
});
export type InsertInvitationCode = z.infer<typeof insertInvitationCodeSchema>;
export type InvitationCode = typeof invitationCodes.$inferSelect;

// Conversational WhatsApp bot state — one row per phone number, tracking
// where that candidate is in the menu flow (search / apply / track). Keyed
// by phone rather than userId because the very first message from an
// unknown number needs a session before any User row exists yet.
export const whatsappBotSteps = [
  "main_menu",
  "awaiting_job_title",
  "awaiting_city",
  "awaiting_job_choice",
  "awaiting_voice_or_confirmation",
] as const;
export type WhatsAppBotStep = typeof whatsappBotSteps[number];

export const whatsappSessions = pgTable("whatsapp_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  step: text("step").$type<WhatsAppBotStep>().notNull().default("main_menu"),
  context: jsonb("context").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type WhatsAppSession = typeof whatsappSessions.$inferSelect;

// Delivery state of a business-initiated WhatsApp notification (see the
// header of server/whatsapp-bot.ts for the 24h service-window rule):
// - envoye: sent as a free-form message inside the 24h window
// - envoye_template: sent outside the window through an approved template
// - en_attente_fenetre: outside the window with no usable template — kept,
//   and delivered as soon as the candidate messages BaaraMatch again
// - echec: Meta refused it for another reason (logged in lastError)
export const whatsappNotificationStatuses = ["envoye", "envoye_template", "en_attente_fenetre", "echec"] as const;
export type WhatsAppNotificationStatus = typeof whatsappNotificationStatuses[number];

export const whatsappNotifications = pgTable("whatsapp_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  phone: text("phone").notNull(),
  applicationId: varchar("application_id"),
  // Exact text to send as a free-form message (now or when the window reopens).
  message: text("message").notNull(),
  status: text("status").$type<WhatsAppNotificationStatus>().notNull(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow(),
  sentAt: timestamp("sent_at"),
}, (table) => ({
  statusIdx: index("whatsapp_notifications_status_idx").on(table.status),
  phoneIdx: index("whatsapp_notifications_phone_idx").on(table.phone),
}));
export type WhatsAppNotification = typeof whatsappNotifications.$inferSelect;

export const invoiceStatuses = ["draft", "pending", "paid", "overdue", "cancelled"] as const;
export type InvoiceStatus = typeof invoiceStatuses[number];

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").notNull().references(() => users.id),
  invoiceNumber: text("invoice_number").notNull(),
  // Registered account billed, if any. The client of record is
  // agencyClientId (the agency's CRM fiche), which works whether or not the
  // client is on BaaraMatch.
  clientId: varchar("client_id").references(() => users.id),
  agencyClientId: varchar("agency_client_id").references((): any => agencyClients.id, { onDelete: "set null" }),
  clientType: text("client_type").$type<"company" | "agency">().notNull(),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  subtotal: integer("subtotal").notNull(),
  taxRate: real("tax_rate").notNull().default(18),
  taxAmount: integer("tax_amount").notNull(),
  totalAmount: integer("total_amount").notNull(),
  currency: text("currency").default("XOF"),
  status: text("status").$type<InvoiceStatus>().notNull().default("draft"),
  paymentMethod: text("payment_method"),
  paidDate: timestamp("paid_date"),
  notes: text("notes"),
  // Email delivery trail: when the invoice was sent, to whom, and payment
  // reminders — shown on the invoice and used by "États de paiement".
  sentAt: timestamp("sent_at"),
  sentTo: text("sent_to"),
  lastReminderAt: timestamp("last_reminder_at"),
  reminderCount: integer("reminder_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  agencyIdx: index("invoices_agency_idx").on(table.agencyId),
  statusIdx: index("invoices_status_idx").on(table.status),
}));

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id),
  placementId: varchar("placement_id").references(() => agencyPlacements.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
  total: integer("total").notNull(),
}, (table) => ({
  invoiceIdx: index("invoice_line_items_invoice_idx").on(table.invoiceId),
}));

export const commissionRateSettings = pgTable("commission_rate_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").notNull().references(() => users.id),
  contractType: text("contract_type").notNull(),
  rate: real("rate").notNull(),
  minAmount: integer("min_amount"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  agencyIdx: index("commission_rate_settings_agency_idx").on(table.agencyId),
}));

export const paymentMethodSettings = pgTable("payment_method_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: text("type").$type<"bank" | "mobile">().notNull(),
  accountInfo: text("account_info").notNull(),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  agencyIdx: index("payment_method_settings_agency_idx").on(table.agencyId),
}));

export const agencyFinancialSettings = pgTable("agency_financial_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").notNull().unique().references(() => users.id),
  currency: text("currency").default("XOF"),
  invoicePrefix: text("invoice_prefix").default("FAC"),
  invoiceNextNumber: integer("invoice_next_number").default(1),
  defaultPaymentTerms: integer("default_payment_terms").default(30),
  vatRate: real("vat_rate").default(18),
  autoInvoice: boolean("auto_invoice").default(false),
  reminderEnabled: boolean("reminder_enabled").default(true),
  reminderDays: integer("reminder_days").default(7),
  bankName: text("bank_name"),
  accountName: text("account_name"),
  iban: text("iban"),
  bic: text("bic"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const salaryPaymentStatuses = ["pending", "processing", "paid", "cancelled"] as const;
export type SalaryPaymentStatus = typeof salaryPaymentStatuses[number];

export const salaryPayments = pgTable("salary_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").notNull().references(() => users.id),
  placementId: varchar("placement_id").notNull().references(() => agencyPlacements.id),
  period: text("period").notNull(),
  baseSalary: integer("base_salary").notNull(),
  bonus: integer("bonus").default(0),
  deductions: integer("deductions").default(0),
  netSalary: integer("net_salary").notNull(),
  status: text("status").$type<SalaryPaymentStatus>().notNull().default("pending"),
  paymentDate: timestamp("payment_date"),
  paymentMethod: text("payment_method"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  agencyIdx: index("salary_payments_agency_idx").on(table.agencyId),
  placementIdx: index("salary_payments_placement_idx").on(table.placementId),
  uniquePlacementPeriod: unique("salary_payments_placement_period_unique").on(table.placementId, table.period),
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

export const moderationTargetTypes = ["profile", "job", "message", "document"] as const;
export type ModerationTargetType = typeof moderationTargetTypes[number];

export const moderationPriorities = ["low", "medium", "high"] as const;
export type ModerationPriority = typeof moderationPriorities[number];

export const moderationStatuses = ["pending", "approved", "rejected"] as const;
export type ModerationStatus = typeof moderationStatuses[number];

export const moderationItems = pgTable("moderation_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetType: text("target_type").$type<ModerationTargetType>().notNull(),
  // The specific record under review (e.g. a job_postings.id) — distinct
  // from targetUserId, which is who the item is attributed to (the poster).
  // Needed so approving/rejecting can act on the actual record, not just
  // relabel the queue row.
  targetEntityId: varchar("target_entity_id"),
  targetUserId: varchar("target_user_id").references(() => users.id),
  targetLabel: text("target_label").notNull(),
  targetUserType: text("target_user_type").$type<UserType>(),
  reason: text("reason").notNull(),
  reportedBy: text("reported_by").notNull(),
  priority: text("priority").$type<ModerationPriority>().default("medium"),
  status: text("status").$type<ModerationStatus>().default("pending"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  statusIdx: index("moderation_items_status_idx").on(table.status),
  priorityIdx: index("moderation_items_priority_idx").on(table.priority),
}));

export const activityLogStatuses = ["success", "warning", "error"] as const;
export type ActivityLogStatus = typeof activityLogStatuses[number];

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(),
  userId: varchar("user_id").references(() => users.id),
  userLabel: text("user_label").notNull(),
  ipAddress: text("ip_address"),
  status: text("status").$type<ActivityLogStatus>().default("success"),
  details: text("details"),
  // Set only for actions that target a specific record (e.g. an admin
  // viewing a candidate's full profile) — lets the audit journal be
  // filtered to "who accessed this exact record", not just free-text
  // search over details. Left null for generic events like login.
  targetType: text("target_type"),
  targetId: varchar("target_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  createdAtIdx: index("activity_logs_created_at_idx").on(table.createdAt),
  actionIdx: index("activity_logs_action_idx").on(table.action),
  targetIdx: index("activity_logs_target_idx").on(table.targetType, table.targetId),
}));

// One row per (day, metric key, organization). "Organization" here is a
// company/agency user (this schema has no separate organizations table —
// companyProfiles/agencyProfiles hang off users.id directly), so
// organizationId references users.id; null means the platform-wide total.
// Free-form `key` (not a column per metric) so a new metric only ever means
// touching the aggregation job, never a migration.
export const dailyMetrics = pgTable("daily_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  key: text("key").notNull(),
  value: real("value").notNull(),
  organizationId: varchar("organization_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueDayKeyOrg: unique().on(table.date, table.key, table.organizationId),
  keyDateIdx: index("daily_metrics_key_date_idx").on(table.key, table.date),
}));

export const reportExportStatuses = ["en_attente", "en_cours", "termine", "echec"] as const;
export type ReportExportStatus = typeof reportExportStatuses[number];

export const reportExports = pgTable("report_exports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  parameters: jsonb("parameters").notNull(),
  status: text("status").$type<ReportExportStatus>().notNull().default("en_attente"),
  // Same FK-through-adminProfiles convention as jobPostings.createdByAdminId
  // — an admin's attribution points at their profile, not the bare user row.
  requestedByAdminId: varchar("requested_by_admin_id").notNull().references(() => adminProfiles.id),
  fileUrl: text("file_url"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  requestedByStatusIdx: index("report_exports_requested_by_status_idx").on(table.requestedByAdminId, table.status),
}));

// One row per (anonymous visitor, calendar day) — upserted by every beacon
// the client sends (see client/src/hooks/use-visit-tracker.ts), never
// deleted or replaced wholesale. firstSeenAt is set once on insert;
// lastSeenAt/pageViews update on every later beacon that same day, which is
// what makes "temps de visite" (lastSeenAt - firstSeenAt) and "nombre de
// visiteurs" (row count) derivable straight from this table without a
// separate events log. Country comes from a local GeoIP lookup (geoip-lite)
// on the visitor's IP at first-seen time — no external API call, no
// third-party data sharing, but also no updates if they travel mid-session.
export const siteVisits = pgTable("site_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitorId: varchar("visitor_id").notNull(),
  date: timestamp("date").notNull(),
  country: text("country"),
  firstSeenAt: timestamp("first_seen_at").notNull(),
  lastSeenAt: timestamp("last_seen_at").notNull(),
  pageViews: integer("page_views").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueVisitorDay: unique().on(table.visitorId, table.date),
  dateIdx: index("site_visits_date_idx").on(table.date),
  countryIdx: index("site_visits_country_idx").on(table.country),
}));

export const notificationTypes = ["job_match", "application_update", "system"] as const;
export type NotificationType = typeof notificationTypes[number];

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").$type<NotificationType>().notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  actionUrl: text("action_url"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("notifications_user_idx").on(table.userId),
  readIdx: index("notifications_read_idx").on(table.isRead),
}));

export const demoRequests = pgTable("demo_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  emailIdx: index("demo_requests_email_idx").on(table.email),
  createdAtIdx: index("demo_requests_created_at_idx").on(table.createdAt),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true, isVerified: true, createdAt: true, updatedAt: true });
export const insertSkillSchema = createInsertSchema(skills).omit({ id: true, createdAt: true });
export const insertCandidateSkillSchema = createInsertSchema(candidateSkills).omit({ id: true });
export const insertCandidateProfileSchema = createInsertSchema(candidateProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAgencyProfileSchema = createInsertSchema(agencyProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAdminProfileSchema = createInsertSchema(adminProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCompanyProfileSchema = createInsertSchema(companyProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCompanyModuleSchema = createInsertSchema(companyModules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCompanyOperationalStateSchema = createInsertSchema(companyOperationalStates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertJobPostingSchema = createInsertSchema(jobPostings)
  .omit({ id: true, createdAt: true, updatedAt: true, viewCount: true, applicationCount: true, managementType: true, createdByAdminId: true, validatedByAdminId: true, validatedAt: true, agencyClientId: true })
  // drizzle-zod maps these timestamp columns to a bare z.date(), which
  // rejects the date strings any JSON request body actually carries —
  // coerce, same as the hand-written jobUpdateSchema already does for the
  // update path in server/routes.ts.
  .extend({
    applicationDeadline: z.coerce.date().nullable().optional(),
    startDate: z.coerce.date().nullable().optional(),
  });
export const insertJobRequiredSkillSchema = createInsertSchema(jobRequiredSkills).omit({ id: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSavedJobSchema = createInsertSchema(savedJobs).omit({ id: true, createdAt: true });
export const insertInterviewSlotSchema = createInsertSchema(interviewSlots).omit({ id: true, createdAt: true, isSelected: true });
export const insertModerationItemSchema = createInsertSchema(moderationItems).omit({ id: true, createdAt: true, status: true, resolvedBy: true, resolvedAt: true });
export const insertDailyMetricSchema = createInsertSchema(dailyMetrics).omit({ id: true, createdAt: true });
export const insertSiteVisitSchema = createInsertSchema(siteVisits).omit({ id: true, createdAt: true });
export const insertReportExportSchema = createInsertSchema(reportExports).omit({ id: true, createdAt: true, updatedAt: true, status: true, fileUrl: true, error: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, isRead: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).omit({ id: true });
export const insertCommissionRateSettingSchema = createInsertSchema(commissionRateSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentMethodSettingSchema = createInsertSchema(paymentMethodSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAgencyFinancialSettingsSchema = createInsertSchema(agencyFinancialSettings).omit({ id: true, updatedAt: true });
export const insertSalaryPaymentSchema = createInsertSchema(salaryPayments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAgencyPlacementSchema = createInsertSchema(agencyPlacements).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMatchingResultSchema = createInsertSchema(matchingResults).omit({ id: true, createdAt: true });
export const insertDemoRequestSchema = createInsertSchema(demoRequests)
  .omit({ id: true, createdAt: true })
  .extend({
    fullName: z.string().min(2, "Nom requis"),
    email: z.string().email("Email invalide"),
    company: z.string().min(2, "Entreprise requise"),
    message: z.string().min(10, "Message trop court"),
  });

// Super admin creating another admin account (levels: adminLevels above).
export const adminAccountCreateSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  fullName: z.string().min(2, "Nom requis"),
  adminLevel: z.enum(adminLevels),
}).strict();

export const adminLevelUpdateSchema = z.object({
  adminLevel: z.enum(adminLevels),
}).strict();

export const adminStatusUpdateSchema = z.object({
  isAdminActive: z.boolean(),
}).strict();

// Admin (super_admin/admin) creating a prospect organization — a
// company/agency account with no real login yet, so a job can be posted for
// it right away. The real owner later claims it via claimToken.
export const prospectOrganizationCreateSchema = z.object({
  userType: z.enum(["company", "agency"]),
  email: z.string().email("Email invalide"),
  organizationName: z.string().min(2, "Nom de l'organisation requis"),
  // Secteur d'activité — only meaningful for userType "company" (mirrors
  // companyProfiles.industry); ignored for agencies.
  industry: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  // Who the admin actually spoke to before creating this account.
  contactName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
}).strict();

export const claimOrganizationSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
}).strict().refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// Self-service "is this your business?" discovery, offered during normal
// registration — matches by the contact phone an admin already recorded
// when creating the prospect account.
export const prospectMatchCheckSchema = z.object({
  userType: z.enum(["company", "agency"]),
  phone: z.string().min(4),
}).strict();

export const claimByContactSchema = z.object({
  userType: z.enum(["company", "agency"]),
  phone: z.string().min(4),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
}).strict().refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// A job an admin posts on behalf of an organization (prospect or not) —
// same shape as insertJobPostingSchema minus the fields the server derives
// from the target organization (companyId/agencyId) and admin context.
export const adminManagedJobCreateSchema = insertJobPostingSchema.omit({ companyId: true, agencyId: true });

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
export type AdminProfile = typeof adminProfiles.$inferSelect;
export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type CompanyModule = typeof companyModules.$inferSelect;
export type CompanyOperationalState = typeof companyOperationalStates.$inferSelect;
export type JobPosting = typeof jobPostings.$inferSelect;
export type JobRequiredSkill = typeof jobRequiredSkills.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type SavedJob = typeof savedJobs.$inferSelect;
export type InsertSavedJob = z.infer<typeof insertSavedJobSchema>;
export type InterviewSlot = typeof interviewSlots.$inferSelect;
export type InsertInterviewSlot = z.infer<typeof insertInterviewSlotSchema>;
export type AgencyPlacement = typeof agencyPlacements.$inferSelect;
export type AgencyClient = typeof agencyClients.$inferSelect;
export type AgencyClientContact = typeof agencyClientContacts.$inferSelect;
export type AgencyClientNeed = typeof agencyClientNeeds.$inferSelect;
export type AgencyClientAgreement = typeof agencyClientAgreements.$inferSelect;
export type CandidateDocument = typeof candidateDocuments.$inferSelect;
export type InsertCandidateDocument = typeof candidateDocuments.$inferInsert;
export type MatchingResult = typeof matchingResults.$inferSelect;
export type DemoRequest = typeof demoRequests.$inferSelect;
export type ModerationItem = typeof moderationItems.$inferSelect;
export type InsertModerationItem = z.infer<typeof insertModerationItemSchema>;
export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type InsertDailyMetric = z.infer<typeof insertDailyMetricSchema>;
export type SiteVisit = typeof siteVisits.$inferSelect;
export type InsertSiteVisit = z.infer<typeof insertSiteVisitSchema>;
export type ReportExport = typeof reportExports.$inferSelect;
export type InsertReportExport = z.infer<typeof insertReportExportSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;
export type CommissionRateSetting = typeof commissionRateSettings.$inferSelect;
export type InsertCommissionRateSetting = z.infer<typeof insertCommissionRateSettingSchema>;
export type PaymentMethodSetting = typeof paymentMethodSettings.$inferSelect;
export type InsertPaymentMethodSetting = z.infer<typeof insertPaymentMethodSettingSchema>;
export type AgencyFinancialSettings = typeof agencyFinancialSettings.$inferSelect;
export type InsertAgencyFinancialSettings = z.infer<typeof insertAgencyFinancialSettingsSchema>;
export type SalaryPayment = typeof salaryPayments.$inferSelect;
export type InsertSalaryPayment = z.infer<typeof insertSalaryPaymentSchema>;
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type InsertCandidateSkill = z.infer<typeof insertCandidateSkillSchema>;
export type InsertCandidateProfile = z.infer<typeof insertCandidateProfileSchema>;
export type InsertAgencyProfile = z.infer<typeof insertAgencyProfileSchema>;
export type InsertAdminProfile = z.infer<typeof insertAdminProfileSchema>;
export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;
export type InsertCompanyModule = z.infer<typeof insertCompanyModuleSchema>;
export type InsertCompanyOperationalState = z.infer<typeof insertCompanyOperationalStateSchema>;
export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;
export type InsertJobRequiredSkill = z.infer<typeof insertJobRequiredSkillSchema>;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type InsertAgencyPlacement = z.infer<typeof insertAgencyPlacementSchema>;
export type InsertMatchingResult = z.infer<typeof insertMatchingResultSchema>;
export type InsertDemoRequest = z.infer<typeof insertDemoRequestSchema>;
