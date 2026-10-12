import {
  type User,
  type InsertUser,
  type CandidateProfile,
  type InsertCandidateProfile,
  type AgencyProfile,
  type InsertAgencyProfile,
  type AdminProfile,
  type InsertAdminProfile,
  type CompanyProfile,
  type InsertCompanyProfile,
  type CompanyModule,
  type CompanyModuleType,
  type OperationalModuleKey,
  type CompanyOperationalState,
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
  type FieldMission,
  type InsertFieldMission,
  type FieldMissionStatus,
  type InvitationCode,
  type InsertInvitationCode,
  type WhatsAppSession,
  type WhatsAppBotStep,
  whatsappNotifications,
  type WhatsAppNotification,
  type WhatsAppNotificationStatus,
  type MatchingResult,
  type InsertMatchingResult,
  type DemoRequest,
  type InsertDemoRequest,
  type JobRequiredSkill,
  type InsertJobRequiredSkill,
  type ModerationItem,
  type InsertModerationItem,
  type ModerationStatus,
  type ActivityLog,
  type InsertActivityLog,
  type Notification,
  type InsertNotification,
  type Invoice,
  type InsertInvoice,
  type InvoiceLineItem,
  type InsertInvoiceLineItem,
  type CommissionRateSetting,
  type InsertCommissionRateSetting,
  type PaymentMethodSetting,
  type InsertPaymentMethodSetting,
  type AgencyFinancialSettings,
  type SalaryPayment,
  type InsertSalaryPayment,
  type SavedJob,
  savedJobs,
  type InterviewSlot,
  interviewSlots,
  type DailyMetric,
  type InsertDailyMetric,
  type SiteVisit,
  type ReportExport,
  type InsertReportExport,
  type ApplicationStatus,
  dailyMetrics,
  siteVisits,
  reportExports,
  users,
  candidateProfiles,
  agencyProfiles,
  adminProfiles,
  companyProfiles,
  companyModules,
  companyOperationalStates,
  jobPostings,
  applications,
  skills,
  candidateSkills,
  agencyPlacements,
  candidateDocuments,
  type CandidateDocument,
  type InsertCandidateDocument,
  fieldMissions,
  invitationCodes,
  whatsappSessions,
  matchingResults,
  demoRequests,
  jobRequiredSkills,
  moderationItems,
  activityLogs,
  notifications,
  invoices,
  invoiceLineItems,
  commissionRateSettings,
  paymentMethodSettings,
  agencyFinancialSettings,
  salaryPayments,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, isNotNull, isNull, desc, gte, lte, lt, sql, getTableColumns, inArray } from "drizzle-orm";

export type DashboardKpis = {
  activeOrganizations: number;
  jobsPublishedThisMonth: number;
  jobsPublishedActive: number;
  applicationsReceivedThisMonth: number;
  missionsInProgress: number;
  jobsPendingValidation: number;
  jobsPendingValidationOverdue: number;
  mrrEstimatedFcfa: number;
};

export type ActivityLogFilters = {
  limit?: number;
  action?: string;
  targetType?: string;
  targetId?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByClaimToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllAdmins(): Promise<(User & { profile?: AdminProfile })[]>;
  getProspectOrganizations(): Promise<(User & { profile?: CompanyProfile | AgencyProfile })[]>;
  getProspectByContactPhone(userType: "company" | "agency", phone: string): Promise<User | undefined>;
  getAdminManagedJobPostings(): Promise<JobPosting[]>;

  getAdminProfile(userId: string): Promise<AdminProfile | undefined>;
  getAdminProfileById(id: string): Promise<AdminProfile | undefined>;
  createAdminProfile(profile: InsertAdminProfile): Promise<AdminProfile>;
  updateAdminProfile(userId: string, updates: Partial<AdminProfile>): Promise<AdminProfile | undefined>;

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
  getAllCompanies(): Promise<(User & { profile?: CompanyProfile })[]>;
  getCompanyModules(companyProfileId: string): Promise<CompanyModule[]>;
  replaceCompanyModules(companyProfileId: string, moduleTypes: CompanyModuleType[], enabledBy?: string): Promise<CompanyModule[]>;
  getCompanyOperationalState(companyUserId: string, moduleKey: OperationalModuleKey): Promise<CompanyOperationalState | undefined>;
  setCompanyOperationalState(companyUserId: string, moduleKey: OperationalModuleKey, state: Record<string, unknown>): Promise<CompanyOperationalState>;
  
  getJobPosting(id: string): Promise<(JobPosting & { organizationName: string | null }) | undefined>;
  getAllJobPostings(): Promise<(JobPosting & { organizationName: string | null })[]>;
  getJobPostingsByCompany(companyId: string): Promise<JobPosting[]>;
  getJobPostingsByAgency(agencyId: string): Promise<JobPosting[]>;
  createJobPosting(job: InsertJobPosting): Promise<JobPosting>;
  updateJobPosting(id: string, updates: Partial<JobPosting>): Promise<JobPosting | undefined>;
  deleteJobPosting(id: string): Promise<boolean>;
  incrementJobViewCount(id: string): Promise<void>;
  incrementCompanyProfileView(userId: string): Promise<void>;
  incrementAgencyProfileView(userId: string): Promise<void>;
  getTopVisitedOrganizations(limit: number): Promise<{ id: string; name: string; userType: "company" | "agency"; viewCount: number }[]>;
  getTopEmployersByJobCount(limit: number): Promise<{ id: string; name: string; jobCount: number }[]>;
  getTopJobCategories(limit: number): Promise<{ category: string; count: number }[]>;
  
  getApplication(id: string): Promise<Application | undefined>;
  getApplicationsByCandidate(candidateId: string): Promise<Application[]>;
  getApplicationsByCandidateWithJobs(candidateId: string): Promise<(Application & {
    jobTitle: string;
    organizationName: string | null;
    location: string;
    jobType: string;
  })[]>;
  hasApplicationToOrganization(candidateId: string, organizationId: string): Promise<boolean>;
  createInterviewSlots(applicationId: string, startTimes: Date[]): Promise<InterviewSlot[]>;
  getInterviewSlotsByApplication(applicationId: string): Promise<InterviewSlot[]>;
  claimInterviewSlot(slotId: string, applicationId: string): Promise<InterviewSlot | undefined>;
  getUpcomingInterviewsForOrganization(organizationId: string): Promise<{
    applicationId: string;
    candidateName: string;
    jobTitle: string;
    interviewDate: Date;
  }[]>;
  getApplicationsByJob(jobId: string): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  saveJob(candidateId: string, jobId: string): Promise<SavedJob>;
  unsaveJob(candidateId: string, jobId: string): Promise<void>;
  getSavedJobsByCandidate(candidateId: string): Promise<(SavedJob & { job: (JobPosting & { organizationName: string | null }) | undefined })[]>;
  updateApplication(id: string, updates: Partial<Application>): Promise<Application | undefined>;

  getSkill(id: string): Promise<Skill | undefined>;
  getSkillByName(name: string): Promise<Skill | undefined>;
  getAllSkills(): Promise<Skill[]>;
  createSkill(skill: InsertSkill): Promise<Skill>;
  
  getCandidateSkills(candidateProfileId: string): Promise<CandidateSkill[]>;
  addCandidateSkill(skill: InsertCandidateSkill): Promise<CandidateSkill>;
  removeCandidateSkill(id: string): Promise<boolean>;

  getAgencyPlacements(agencyId: string): Promise<AgencyPlacement[]>;

  getCandidateDocumentsByAgency(agencyId: string): Promise<Omit<CandidateDocument, "url">[]>;
  getCandidateDocument(id: string): Promise<CandidateDocument | undefined>;
  createCandidateDocument(document: InsertCandidateDocument): Promise<CandidateDocument>;
  deleteCandidateDocument(id: string): Promise<boolean>;
  getAgencyPlacement(id: string): Promise<AgencyPlacement | undefined>;
  getPlacementsByCandidate(candidateId: string): Promise<AgencyPlacement[]>;
  createAgencyPlacement(placement: InsertAgencyPlacement): Promise<AgencyPlacement>;
  updateAgencyPlacement(id: string, updates: Partial<AgencyPlacement>): Promise<AgencyPlacement | undefined>;

  getFieldMissionsByAgency(agencyId: string, status?: FieldMissionStatus): Promise<(FieldMission & { candidateName: string })[]>;
  getFieldMission(id: string): Promise<(FieldMission & { candidateName: string }) | undefined>;
  createFieldMission(mission: InsertFieldMission): Promise<FieldMission>;
  updateFieldMission(id: string, updates: Partial<FieldMission>): Promise<FieldMission | undefined>;
  getFieldMissionClientsByAgency(agencyId: string): Promise<{ clientName: string; relationshipStartDate: Date; activeMissionsCount: number }[]>;
  getHiredCandidatesByAgency(agencyId: string): Promise<{ candidateId: string; candidateName: string; jobTitle: string }[]>;

  createInvitationCode(code: InsertInvitationCode): Promise<InvitationCode>;
  getInvitationCodeByCode(code: string): Promise<InvitationCode | undefined>;
  listInvitationCodes(): Promise<(InvitationCode & { organizationName: string | null })[]>;
  markInvitationCodeUsed(id: string, organizationId: string): Promise<InvitationCode | undefined>;

  getWhatsAppSession(phone: string): Promise<WhatsAppSession | undefined>;
  upsertWhatsAppSession(phone: string, step: WhatsAppBotStep, context: Record<string, unknown>): Promise<WhatsAppSession>;
  touchWhatsAppSession(phone: string): Promise<void>;

  createWhatsAppNotification(row: { candidateId: string; phone: string; applicationId: string | null; message: string; status: WhatsAppNotificationStatus; lastError?: string | null }): Promise<WhatsAppNotification>;
  claimPendingWhatsAppNotifications(phone: string): Promise<WhatsAppNotification[]>;
  releaseWhatsAppNotification(id: string, error: string): Promise<void>;
  listPendingWindowWhatsAppNotifications(): Promise<(WhatsAppNotification & { candidateName: string | null; jobTitle: string | null })[]>;

  getMatchingResults(candidateId: string): Promise<MatchingResult[]>;
  getMatchingResultsForJob(jobId: string): Promise<MatchingResult[]>;
  getMatchingResultsByJob(jobId: string): Promise<MatchingResult[]>;
  createMatchingResult(result: InsertMatchingResult): Promise<MatchingResult>;

  createDemoRequest(request: InsertDemoRequest): Promise<DemoRequest>;

  getJobRequiredSkills(jobId: string): Promise<JobRequiredSkill[]>;
  addJobRequiredSkill(skill: InsertJobRequiredSkill): Promise<JobRequiredSkill>;

  listModerationItems(): Promise<(ModerationItem & { targetOrgName: string | null })[]>;
  createModerationItem(item: InsertModerationItem): Promise<ModerationItem>;
  updateModerationItemStatus(id: string, status: ModerationStatus, resolvedBy: string): Promise<ModerationItem | undefined>;

  listActivityLogs(filters?: ActivityLogFilters): Promise<(ActivityLog & { targetLabel: string | null })[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  getDashboardKpis(): Promise<DashboardKpis>;
  getMetricsSeries(key: string, from: Date, to: Date, organizationId?: string | null): Promise<DailyMetric[]>;
  getApplicationFunnel(jobId?: string): Promise<Record<ApplicationStatus, number>>;

  recordSiteVisit(visitorId: string, country: string | null, at: Date): Promise<SiteVisit>;
  getVisitorsPerDay(from: Date, to: Date): Promise<{ date: string; value: number }[]>;
  getAverageVisitDurationSeconds(from: Date, to: Date): Promise<number>;
  getVisitorCountryBreakdown(from: Date, to: Date): Promise<{ country: string; count: number }[]>;

  createReportExport(data: InsertReportExport): Promise<ReportExport>;
  getReportExport(id: string): Promise<ReportExport | undefined>;
  updateReportExport(id: string, updates: Partial<ReportExport>): Promise<ReportExport | undefined>;
  listReportExports(requestedByAdminId?: string): Promise<ReportExport[]>;

  listNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string, userId: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: string, userId: string): Promise<boolean>;

  getAgencyFinancialSettings(agencyId: string): Promise<AgencyFinancialSettings>;
  updateAgencyFinancialSettings(agencyId: string, updates: Partial<AgencyFinancialSettings>): Promise<AgencyFinancialSettings>;

  listCommissionRateSettings(agencyId: string): Promise<CommissionRateSetting[]>;
  createCommissionRateSetting(data: InsertCommissionRateSetting): Promise<CommissionRateSetting>;
  updateCommissionRateSetting(id: string, agencyId: string, updates: Partial<CommissionRateSetting>): Promise<CommissionRateSetting | undefined>;
  deleteCommissionRateSetting(id: string, agencyId: string): Promise<boolean>;

  listPaymentMethodSettings(agencyId: string): Promise<PaymentMethodSetting[]>;
  createPaymentMethodSetting(data: InsertPaymentMethodSetting): Promise<PaymentMethodSetting>;
  updatePaymentMethodSetting(id: string, agencyId: string, updates: Partial<PaymentMethodSetting>): Promise<PaymentMethodSetting | undefined>;
  deletePaymentMethodSetting(id: string, agencyId: string): Promise<boolean>;

  listInvoices(agencyId: string): Promise<Invoice[]>;
  getInvoice(id: string, agencyId: string): Promise<Invoice | undefined>;
  getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]>;
  createInvoice(agencyId: string, data: Omit<InsertInvoice, "agencyId" | "invoiceNumber">, lineItems: Omit<InsertInvoiceLineItem, "invoiceId">[]): Promise<Invoice>;
  updateInvoice(id: string, agencyId: string, updates: Partial<Invoice>): Promise<Invoice | undefined>;

  listSalaryPayments(agencyId: string): Promise<SalaryPayment[]>;
  createSalaryPayment(data: InsertSalaryPayment): Promise<SalaryPayment>;
  updateSalaryPayment(id: string, agencyId: string, updates: Partial<SalaryPayment>): Promise<SalaryPayment | undefined>;
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

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
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

  async getUserByClaimToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.claimToken, token));
    return user || undefined;
  }

  async getAllAdmins(): Promise<(User & { profile?: AdminProfile })[]> {
    const admins = await db.select().from(users).where(eq(users.userType, "admin"));
    return Promise.all(
      admins.map(async (user) => ({ ...user, profile: await this.getAdminProfile(user.id) })),
    );
  }

  // All organizations an admin is tracking: still-unclaimed prospects AND
  // ones that started as a prospect but have since been claimed (so an
  // admin doesn't lose visibility into an org the moment its owner takes it
  // over). Restricted to company/agency since createdByAdminId is a users-
  // wide column (also used for prospect traceability only, never admin
  // accounts — those track their creator on adminProfiles instead).
  async getProspectOrganizations(): Promise<(User & { profile?: CompanyProfile | AgencyProfile })[]> {
    const orgs = await db
      .select()
      .from(users)
      .where(and(
        or(eq(users.userType, "company"), eq(users.userType, "agency")),
        or(eq(users.isProspect, true), isNotNull(users.createdByAdminId)),
      ));
    return Promise.all(
      orgs.map(async (user) => {
        const profile = user.userType === "agency"
          ? await this.getAgencyProfile(user.id)
          : await this.getCompanyProfile(user.id);
        return { ...user, profile };
      }),
    );
  }

  // Self-service "is this your business?" match at registration time — an
  // exact match on the contact phone the admin recorded when creating the
  // still-unclaimed prospect account.
  async getProspectByContactPhone(userType: "company" | "agency", phone: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.userType, userType),
        eq(users.isProspect, true),
        eq(users.prospectContactPhone, phone),
      ));
    return user || undefined;
  }

  async getAdminManagedJobPostings(): Promise<JobPosting[]> {
    return db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.managementType, "geree_par_baaramatch"))
      .orderBy(desc(jobPostings.createdAt));
  }

  async getAdminProfile(userId: string): Promise<AdminProfile | undefined> {
    const [profile] = await db.select().from(adminProfiles).where(eq(adminProfiles.userId, userId));
    return profile || undefined;
  }

  // For resolving a stored createdByAdminId/validatedByAdminId (which point
  // at adminProfiles.id, not users.id) back to the admin who did it.
  async getAdminProfileById(id: string): Promise<AdminProfile | undefined> {
    const [profile] = await db.select().from(adminProfiles).where(eq(adminProfiles.id, id));
    return profile || undefined;
  }

  async createAdminProfile(profile: InsertAdminProfile): Promise<AdminProfile> {
    const [newProfile] = await db.insert(adminProfiles).values(profile as any).returning();
    return newProfile;
  }

  async updateAdminProfile(userId: string, updates: Partial<AdminProfile>): Promise<AdminProfile | undefined> {
    const [profile] = await db
      .update(adminProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(adminProfiles.userId, userId))
      .returning();
    return profile || undefined;
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

    if (profile) {
      return profile;
    }

    await this.createCandidateProfile({ userId });

    const [createdAndUpdatedProfile] = await db
      .update(candidateProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(candidateProfiles.userId, userId))
      .returning();

    return createdAndUpdatedProfile || undefined;
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

  async getAllCompanies(): Promise<(User & { profile?: CompanyProfile })[]> {
    const companyUsers = await db
      .select()
      .from(users)
      .where(eq(users.userType, "company"));
    
    const result = await Promise.all(
      companyUsers.map(async (user) => {
        const profile = await this.getCompanyProfile(user.id);
        return { ...user, profile };
      })
    );
    return result;
  }

  async getCompanyModules(companyProfileId: string): Promise<CompanyModule[]> {
    return db
      .select()
      .from(companyModules)
      .where(eq(companyModules.companyProfileId, companyProfileId));
  }

  async replaceCompanyModules(
    companyProfileId: string,
    moduleTypes: CompanyModuleType[],
    enabledBy?: string,
  ): Promise<CompanyModule[]> {
    await db.delete(companyModules).where(eq(companyModules.companyProfileId, companyProfileId));

    if (moduleTypes.length === 0) {
      return [];
    }

    return db
      .insert(companyModules)
      .values(
        moduleTypes.map((moduleType) => ({
          companyProfileId,
          moduleType,
          isEnabled: true,
          enabledBy: enabledBy ?? null,
        })) as any,
      )
      .returning();
  }

  async getCompanyOperationalState(
    companyUserId: string,
    moduleKey: OperationalModuleKey,
  ): Promise<CompanyOperationalState | undefined> {
    const [state] = await db
      .select()
      .from(companyOperationalStates)
      .where(and(
        eq(companyOperationalStates.companyUserId, companyUserId),
        eq(companyOperationalStates.moduleKey, moduleKey),
      ))
      .orderBy(desc(companyOperationalStates.updatedAt));

    return state || undefined;
  }

  async setCompanyOperationalState(
    companyUserId: string,
    moduleKey: OperationalModuleKey,
    state: Record<string, unknown>,
  ): Promise<CompanyOperationalState> {
    await db
      .delete(companyOperationalStates)
      .where(and(
        eq(companyOperationalStates.companyUserId, companyUserId),
        eq(companyOperationalStates.moduleKey, moduleKey),
      ));

    const [row] = await db
      .insert(companyOperationalStates)
      .values({
        companyUserId,
        moduleKey,
        state,
      } as any)
      .returning();

    return row;
  }

  async getJobPosting(id: string): Promise<(JobPosting & { organizationName: string | null }) | undefined> {
    const [job] = await db
      .select({
        ...getTableColumns(jobPostings),
        // Resolves the poster's real display name — agency_name for
        // agency-posted jobs (companyId is set to the agency's own id in
        // that flow), company_name otherwise. Without this, every job card
        // fell back to a hardcoded "Entreprise inconnue".
        organizationName: sql<string | null>`coalesce(${agencyProfiles.agencyName}, ${companyProfiles.companyName})`,
      })
      .from(jobPostings)
      .leftJoin(agencyProfiles, eq(jobPostings.agencyId, agencyProfiles.userId))
      .leftJoin(companyProfiles, eq(jobPostings.companyId, companyProfiles.userId))
      .where(eq(jobPostings.id, id));
    return job || undefined;
  }

  async getAllJobPostings(): Promise<(JobPosting & { organizationName: string | null })[]> {
    return db
      .select({
        ...getTableColumns(jobPostings),
        organizationName: sql<string | null>`coalesce(${agencyProfiles.agencyName}, ${companyProfiles.companyName})`,
      })
      .from(jobPostings)
      .leftJoin(agencyProfiles, eq(jobPostings.agencyId, agencyProfiles.userId))
      .leftJoin(companyProfiles, eq(jobPostings.companyId, companyProfiles.userId))
      .where(eq(jobPostings.isActive, true))
      .orderBy(desc(jobPostings.createdAt));
  }

  async getJobPostingsByCompany(companyId: string): Promise<JobPosting[]> {
    return db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.companyId, companyId))
      .orderBy(desc(jobPostings.createdAt));
  }

  async getJobPostingsByAgency(agencyId: string): Promise<JobPosting[]> {
    return db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.agencyId, agencyId))
      .orderBy(desc(jobPostings.createdAt));
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

  async incrementJobViewCount(id: string): Promise<void> {
    // Atomic increment (not read-then-write) so concurrent views can't
    // clobber each other into losing a count.
    await db
      .update(jobPostings)
      .set({ viewCount: sql`coalesce(${jobPostings.viewCount}, 0) + 1` })
      .where(eq(jobPostings.id, id));
  }

  async incrementCompanyProfileView(userId: string): Promise<void> {
    await db
      .update(companyProfiles)
      .set({ profileViewCount: sql`coalesce(${companyProfiles.profileViewCount}, 0) + 1` })
      .where(eq(companyProfiles.userId, userId));
  }

  async incrementAgencyProfileView(userId: string): Promise<void> {
    await db
      .update(agencyProfiles)
      .set({ profileViewCount: sql`coalesce(${agencyProfiles.profileViewCount}, 0) + 1` })
      .where(eq(agencyProfiles.userId, userId));
  }

  async getTopVisitedOrganizations(limit: number): Promise<{ id: string; name: string; userType: "company" | "agency"; viewCount: number }[]> {
    const [companies, agencies] = await Promise.all([this.getAllCompanies(), this.getAllAgencies()]);
    const combined = [
      ...companies.map((user) => ({
        id: user.id,
        name: user.profile?.companyName ?? user.fullName,
        userType: "company" as const,
        viewCount: user.profile?.profileViewCount ?? 0,
      })),
      ...agencies.map((user) => ({
        id: user.id,
        name: user.profile?.agencyName ?? user.fullName,
        userType: "agency" as const,
        viewCount: user.profile?.profileViewCount ?? 0,
      })),
    ];
    return combined.sort((a, b) => b.viewCount - a.viewCount).slice(0, limit);
  }

  async getTopEmployersByJobCount(limit: number): Promise<{ id: string; name: string; jobCount: number }[]> {
    const rows = await db
      .select({
        companyId: jobPostings.companyId,
        jobCount: sql<number>`count(*)::int`,
        organizationName: sql<string | null>`coalesce(${agencyProfiles.agencyName}, ${companyProfiles.companyName})`,
      })
      .from(jobPostings)
      .leftJoin(agencyProfiles, eq(jobPostings.agencyId, agencyProfiles.userId))
      .leftJoin(companyProfiles, eq(jobPostings.companyId, companyProfiles.userId))
      .groupBy(jobPostings.companyId, agencyProfiles.agencyName, companyProfiles.companyName)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return rows.map((row) => ({
      id: row.companyId,
      name: row.organizationName ?? "Organisation inconnue",
      jobCount: row.jobCount,
    }));
  }

  async getTopJobCategories(limit: number): Promise<{ category: string; count: number }[]> {
    const rows = await db
      .select({ category: jobPostings.category, count: sql<number>`count(*)::int` })
      .from(jobPostings)
      .where(isNotNull(jobPostings.category))
      .groupBy(jobPostings.category)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);
    return rows.map((row) => ({ category: row.category ?? "Autre", count: row.count }));
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

  // Same rows as getApplicationsByCandidate, enriched with the offer's own
  // details (title/organization/location/type) via a single join instead of
  // making the caller fetch every job separately — powers "Mes candidatures".
  async getApplicationsByCandidateWithJobs(candidateId: string): Promise<(Application & {
    jobTitle: string;
    organizationName: string | null;
    location: string;
    jobType: string;
  })[]> {
    return db
      .select({
        ...getTableColumns(applications),
        jobTitle: jobPostings.title,
        organizationName: sql<string | null>`coalesce(${agencyProfiles.agencyName}, ${companyProfiles.companyName})`,
        location: jobPostings.location,
        jobType: jobPostings.jobType,
      })
      .from(applications)
      .innerJoin(jobPostings, eq(applications.jobId, jobPostings.id))
      .leftJoin(agencyProfiles, eq(jobPostings.agencyId, agencyProfiles.userId))
      .leftJoin(companyProfiles, eq(jobPostings.companyId, companyProfiles.userId))
      .where(eq(applications.candidateId, candidateId))
      .orderBy(desc(applications.createdAt));
  }

  // Companies (unlike agencies, whose candidate search is unrestricted)
  // only ever get profile/CV access to candidates who actually applied to
  // one of their own jobs — this is the check that scopes that.
  async hasApplicationToOrganization(candidateId: string, organizationId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: applications.id })
      .from(applications)
      .innerJoin(jobPostings, eq(applications.jobId, jobPostings.id))
      .where(and(
        eq(applications.candidateId, candidateId),
        or(eq(jobPostings.companyId, organizationId), eq(jobPostings.agencyId, organizationId)),
      ))
      .limit(1);
    return !!row;
  }

  async createInterviewSlots(applicationId: string, startTimes: Date[]): Promise<InterviewSlot[]> {
    if (startTimes.length === 0) return [];
    return db
      .insert(interviewSlots)
      .values(startTimes.map((startTime) => ({ applicationId, startTime })))
      .returning();
  }

  async getInterviewSlotsByApplication(applicationId: string): Promise<InterviewSlot[]> {
    return db
      .select()
      .from(interviewSlots)
      .where(eq(interviewSlots.applicationId, applicationId))
      .orderBy(interviewSlots.startTime);
  }

  // Atomic: the UPDATE itself only succeeds when no slot for this
  // application is selected yet, so two concurrent claims (double-click,
  // two tabs) can't both win — the DB, not application code, decides who's
  // first. Returns the claimed slot, or undefined if someone already beat
  // this request to it (or the slot doesn't belong to this application).
  async claimInterviewSlot(slotId: string, applicationId: string): Promise<InterviewSlot | undefined> {
    const [claimed] = await db
      .update(interviewSlots)
      .set({ isSelected: true })
      .where(and(
        eq(interviewSlots.id, slotId),
        eq(interviewSlots.applicationId, applicationId),
        sql`not exists (select 1 from ${interviewSlots} s2 where s2.application_id = ${applicationId} and s2.is_selected = true)`,
      ))
      .returning();
    return claimed || undefined;
  }

  async getUpcomingInterviewsForOrganization(organizationId: string): Promise<{
    applicationId: string;
    candidateName: string;
    jobTitle: string;
    interviewDate: Date;
  }[]> {
    const rows = await db
      .select({
        applicationId: applications.id,
        candidateName: users.fullName,
        jobTitle: jobPostings.title,
        interviewDate: applications.interviewDate,
      })
      .from(applications)
      .innerJoin(jobPostings, eq(applications.jobId, jobPostings.id))
      .innerJoin(users, eq(applications.candidateId, users.id))
      .where(and(
        isNotNull(applications.interviewDate),
        or(eq(jobPostings.companyId, organizationId), eq(jobPostings.agencyId, organizationId)),
      ));
    return rows.filter((row): row is typeof row & { interviewDate: Date } => row.interviewDate !== null);
  }

  async getApplicationsByJob(jobId: string): Promise<Application[]> {
    return db
      .select()
      .from(applications)
      .where(eq(applications.jobId, jobId));
  }

  async saveJob(candidateId: string, jobId: string): Promise<SavedJob> {
    const [existing] = await db
      .select()
      .from(savedJobs)
      .where(and(eq(savedJobs.candidateId, candidateId), eq(savedJobs.jobId, jobId)));
    if (existing) return existing;
    const [saved] = await db.insert(savedJobs).values({ candidateId, jobId }).returning();
    return saved;
  }

  async unsaveJob(candidateId: string, jobId: string): Promise<void> {
    await db
      .delete(savedJobs)
      .where(and(eq(savedJobs.candidateId, candidateId), eq(savedJobs.jobId, jobId)));
  }

  async getSavedJobsByCandidate(candidateId: string): Promise<(SavedJob & { job: (JobPosting & { organizationName: string | null }) | undefined })[]> {
    const rows = await db
      .select()
      .from(savedJobs)
      .where(eq(savedJobs.candidateId, candidateId))
      .orderBy(desc(savedJobs.createdAt));
    return Promise.all(rows.map(async (row) => ({ ...row, job: await this.getJobPosting(row.jobId) })));
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

  // `url` is excluded from the listing: inline data: URLs (no object
  // storage) can be megabytes each, and the client only ever needs metadata.
  async getCandidateDocumentsByAgency(agencyId: string): Promise<Omit<CandidateDocument, "url">[]> {
    const { url: _url, ...columns } = getTableColumns(candidateDocuments);
    return db
      .select(columns)
      .from(candidateDocuments)
      .where(eq(candidateDocuments.agencyId, agencyId))
      .orderBy(desc(candidateDocuments.createdAt));
  }

  async getCandidateDocument(id: string): Promise<CandidateDocument | undefined> {
    const [document] = await db.select().from(candidateDocuments).where(eq(candidateDocuments.id, id));
    return document || undefined;
  }

  async createCandidateDocument(document: InsertCandidateDocument): Promise<CandidateDocument> {
    const [created] = await db.insert(candidateDocuments).values(document).returning();
    return created;
  }

  async deleteCandidateDocument(id: string): Promise<boolean> {
    const result = await db.delete(candidateDocuments).where(eq(candidateDocuments.id, id)).returning({ id: candidateDocuments.id });
    return result.length > 0;
  }

  async getAgencyPlacements(agencyId: string): Promise<AgencyPlacement[]> {
    return db
      .select()
      .from(agencyPlacements)
      .where(eq(agencyPlacements.agencyId, agencyId));
  }

  async getAgencyPlacement(id: string): Promise<AgencyPlacement | undefined> {
    const [placement] = await db.select().from(agencyPlacements).where(eq(agencyPlacements.id, id));
    return placement || undefined;
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

  // V0 field-mission tracking (see shared/schema.ts's fieldMissions comment
  // for why this is separate from agencyPlacements above).
  async getFieldMissionsByAgency(agencyId: string, status?: FieldMissionStatus): Promise<(FieldMission & { candidateName: string })[]> {
    const conditions = status
      ? and(eq(fieldMissions.agencyId, agencyId), eq(fieldMissions.status, status))
      : eq(fieldMissions.agencyId, agencyId);
    return db
      .select({
        ...getTableColumns(fieldMissions),
        candidateName: users.fullName,
      })
      .from(fieldMissions)
      .innerJoin(users, eq(fieldMissions.candidateId, users.id))
      .where(conditions)
      .orderBy(desc(fieldMissions.createdAt));
  }

  async getFieldMission(id: string): Promise<(FieldMission & { candidateName: string }) | undefined> {
    const [row] = await db
      .select({
        ...getTableColumns(fieldMissions),
        candidateName: users.fullName,
      })
      .from(fieldMissions)
      .innerJoin(users, eq(fieldMissions.candidateId, users.id))
      .where(eq(fieldMissions.id, id));
    return row || undefined;
  }

  async createFieldMission(mission: InsertFieldMission): Promise<FieldMission> {
    const [newMission] = await db.insert(fieldMissions).values(mission as any).returning();
    return newMission;
  }

  async updateFieldMission(id: string, updates: Partial<FieldMission>): Promise<FieldMission | undefined> {
    const [mission] = await db
      .update(fieldMissions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(fieldMissions.id, id))
      .returning();
    return mission || undefined;
  }

  // Candidates already hired through one of this agency's own job postings —
  // the "came through the normal pipeline" path for starting a field mission
  // (the other path, a direct placement outside any offer, just searches
  // /api/candidates instead).
  async getHiredCandidatesByAgency(agencyId: string): Promise<{ candidateId: string; candidateName: string; jobTitle: string }[]> {
    const rows = await db
      .select({
        candidateId: applications.candidateId,
        candidateName: users.fullName,
        jobTitle: jobPostings.title,
      })
      .from(applications)
      .innerJoin(jobPostings, eq(applications.jobId, jobPostings.id))
      .innerJoin(users, eq(applications.candidateId, users.id))
      .where(and(eq(jobPostings.agencyId, agencyId), eq(applications.status, "hired")));
    return rows;
  }

  // Derived client "portfolio" for V0 — clients aren't a managed entity yet
  // (missions use a free-text client name), so this is just an aggregation
  // over the agency's own missions rather than a separate relationship table.
  async getFieldMissionClientsByAgency(agencyId: string): Promise<{
    clientName: string;
    relationshipStartDate: Date;
    activeMissionsCount: number;
  }[]> {
    const rows = await db
      .select({
        clientName: fieldMissions.clientName,
        relationshipStartDate: sql<Date>`min(${fieldMissions.startDate})`,
        activeMissionsCount: sql<number>`count(*) filter (where ${fieldMissions.status} in ('planned', 'in_progress'))`,
      })
      .from(fieldMissions)
      .where(eq(fieldMissions.agencyId, agencyId))
      .groupBy(fieldMissions.clientName)
      .orderBy(fieldMissions.clientName);
    return rows.map((row) => ({
      ...row,
      activeMissionsCount: Number(row.activeMissionsCount),
    }));
  }

  // Conversational WhatsApp bot session — one row per phone, upserted on
  // every turn. See shared/schema.ts's whatsappSessions comment.
  async getWhatsAppSession(phone: string): Promise<WhatsAppSession | undefined> {
    const [row] = await db.select().from(whatsappSessions).where(eq(whatsappSessions.phone, phone));
    return row || undefined;
  }

  async upsertWhatsAppSession(phone: string, step: WhatsAppBotStep, context: Record<string, unknown>): Promise<WhatsAppSession> {
    const [row] = await db
      .insert(whatsappSessions)
      .values({ phone, step, context })
      .onConflictDoUpdate({
        target: whatsappSessions.phone,
        set: { step, context, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  // Records an inbound message: updatedAt doubles as "last message the
  // candidate sent us", which is what opens Meta's 24h service window.
  // Keeps the current step/context; a first-time number starts at the menu.
  async touchWhatsAppSession(phone: string): Promise<void> {
    await db
      .insert(whatsappSessions)
      .values({ phone, step: "main_menu", context: {} })
      .onConflictDoUpdate({ target: whatsappSessions.phone, set: { updatedAt: new Date() } });
  }

  async createWhatsAppNotification(row: { candidateId: string; phone: string; applicationId: string | null; message: string; status: WhatsAppNotificationStatus; lastError?: string | null }): Promise<WhatsAppNotification> {
    const [created] = await db.insert(whatsappNotifications).values({
      ...row,
      sentAt: row.status === "envoye" || row.status === "envoye_template" ? new Date() : null,
    }).returning();
    return created;
  }

  // Atomically takes a phone's waiting notifications (oldest first) and
  // marks them sent, so two inbound messages processed concurrently can
  // never deliver the same notification twice. A failed send is put back
  // with releaseWhatsAppNotification.
  async claimPendingWhatsAppNotifications(phone: string): Promise<WhatsAppNotification[]> {
    const claimed = await db
      .update(whatsappNotifications)
      .set({ status: "envoye", sentAt: new Date(), lastError: null })
      .where(and(eq(whatsappNotifications.phone, phone), eq(whatsappNotifications.status, "en_attente_fenetre")))
      .returning();
    return claimed.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
  }

  async releaseWhatsAppNotification(id: string, error: string): Promise<void> {
    await db
      .update(whatsappNotifications)
      .set({ status: "en_attente_fenetre", sentAt: null, lastError: error })
      .where(eq(whatsappNotifications.id, id));
  }

  async listPendingWindowWhatsAppNotifications(): Promise<(WhatsAppNotification & { candidateName: string | null; jobTitle: string | null })[]> {
    return db
      .select({ ...getTableColumns(whatsappNotifications), candidateName: users.fullName, jobTitle: jobPostings.title })
      .from(whatsappNotifications)
      .leftJoin(users, eq(users.id, whatsappNotifications.candidateId))
      .leftJoin(applications, eq(applications.id, whatsappNotifications.applicationId))
      .leftJoin(jobPostings, eq(jobPostings.id, applications.jobId))
      .where(eq(whatsappNotifications.status, "en_attente_fenetre"))
      .orderBy(whatsappNotifications.createdAt);
  }

  async createInvitationCode(code: InsertInvitationCode): Promise<InvitationCode> {
    const [newCode] = await db.insert(invitationCodes).values(code as any).returning();
    return newCode;
  }

  async getInvitationCodeByCode(code: string): Promise<InvitationCode | undefined> {
    const [row] = await db.select().from(invitationCodes).where(eq(invitationCodes.code, code));
    return row || undefined;
  }

  async listInvitationCodes(): Promise<(InvitationCode & { organizationName: string | null })[]> {
    return db
      .select({
        ...getTableColumns(invitationCodes),
        organizationName: sql<string | null>`coalesce(${agencyProfiles.agencyName}, ${companyProfiles.companyName})`,
      })
      .from(invitationCodes)
      .leftJoin(agencyProfiles, eq(invitationCodes.organizationId, agencyProfiles.userId))
      .leftJoin(companyProfiles, eq(invitationCodes.organizationId, companyProfiles.userId))
      .orderBy(desc(invitationCodes.createdAt));
  }

  async markInvitationCodeUsed(id: string, organizationId: string): Promise<InvitationCode | undefined> {
    const [row] = await db
      .update(invitationCodes)
      .set({ isUsed: true, organizationId })
      .where(eq(invitationCodes.id, id))
      .returning();
    return row || undefined;
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

  async getMatchingResultsByJob(jobId: string): Promise<MatchingResult[]> {
    return this.getMatchingResultsForJob(jobId);
  }

  async createMatchingResult(result: InsertMatchingResult): Promise<MatchingResult> {
    const [newResult] = await db.insert(matchingResults).values(result as any).returning();
    return newResult;
  }

  async createDemoRequest(request: InsertDemoRequest): Promise<DemoRequest> {
    const [newRequest] = await db.insert(demoRequests).values(request as any).returning();
    return newRequest;
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

  async listModerationItems(): Promise<(ModerationItem & { targetOrgName: string | null })[]> {
    return db
      .select({
        id: moderationItems.id,
        targetType: moderationItems.targetType,
        targetEntityId: moderationItems.targetEntityId,
        targetUserId: moderationItems.targetUserId,
        targetLabel: moderationItems.targetLabel,
        targetUserType: moderationItems.targetUserType,
        reason: moderationItems.reason,
        reportedBy: moderationItems.reportedBy,
        priority: moderationItems.priority,
        status: moderationItems.status,
        resolvedBy: moderationItems.resolvedBy,
        resolvedAt: moderationItems.resolvedAt,
        createdAt: moderationItems.createdAt,
        // The job title is already the row's targetLabel — this resolves
        // *who posted it* (agency/company name) for display underneath,
        // instead of just the generic "Agence"/"Entreprise" role word.
        targetOrgName: sql<string | null>`coalesce(${agencyProfiles.agencyName}, ${companyProfiles.companyName})`,
      })
      .from(moderationItems)
      .leftJoin(agencyProfiles, eq(moderationItems.targetUserId, agencyProfiles.userId))
      .leftJoin(companyProfiles, eq(moderationItems.targetUserId, companyProfiles.userId))
      .orderBy(desc(moderationItems.createdAt));
  }

  async createModerationItem(item: InsertModerationItem): Promise<ModerationItem> {
    const [newItem] = await db.insert(moderationItems).values(item as any).returning();
    return newItem;
  }

  async getDashboardKpis(): Promise<DashboardKpis> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    // Documented, admin-toggled plan price (services.tsx / require-partner-plan.tsx)
    // — no payment gateway exists, so this is an estimate off the advertised
    // rate times how many agencies currently hold the plan, not billed revenue.
    const PARTNER_PLAN_MONTHLY_PRICE_FCFA = 150000;

    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      [{ count: activeOrganizations }],
      [{ count: jobsPublishedThisMonth }],
      [{ count: jobsPublishedActive }],
      [{ count: applicationsReceivedThisMonth }],
      [{ count: missionsInProgress }],
      [{ count: jobsPendingValidation }],
      [{ count: jobsPendingValidationOverdue }],
      [{ count: partnerAgencies }],
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users)
        .where(and(inArray(users.userType, ["company", "agency"]), eq(users.isVerified, true))),
      db.select({ count: sql<number>`count(*)::int` }).from(jobPostings)
        .where(gte(jobPostings.createdAt, monthStart)),
      db.select({ count: sql<number>`count(*)::int` }).from(jobPostings)
        .where(eq(jobPostings.isActive, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(applications)
        .where(gte(applications.createdAt, monthStart)),
      // Field missions (see shared/schema.ts's fieldMissions comment) are the
      // actual operational "mission en cours" now — agencyPlacements is the
      // billing/commission-oriented table, a different concept.
      db.select({ count: sql<number>`count(*)::int` }).from(fieldMissions)
        .where(eq(fieldMissions.status, "in_progress")),
      db.select({ count: sql<number>`count(*)::int` }).from(moderationItems)
        .where(and(eq(moderationItems.status, "pending"), eq(moderationItems.targetType, "job"))),
      db.select({ count: sql<number>`count(*)::int` }).from(moderationItems)
        .where(and(eq(moderationItems.status, "pending"), eq(moderationItems.targetType, "job"), lt(moderationItems.createdAt, oneDayAgo))),
      db.select({ count: sql<number>`count(*)::int` }).from(agencyProfiles)
        .where(eq(agencyProfiles.subscriptionPlan, "partner")),
    ]);

    return {
      activeOrganizations,
      jobsPublishedThisMonth,
      jobsPublishedActive,
      applicationsReceivedThisMonth,
      missionsInProgress,
      jobsPendingValidation,
      jobsPendingValidationOverdue,
      mrrEstimatedFcfa: partnerAgencies * PARTNER_PLAN_MONTHLY_PRICE_FCFA,
    };
  }

  async getMetricsSeries(key: string, from: Date, to: Date, organizationId?: string | null): Promise<DailyMetric[]> {
    const orgFilter = organizationId === undefined
      ? undefined
      : organizationId === null
      ? isNull(dailyMetrics.organizationId)
      : eq(dailyMetrics.organizationId, organizationId);

    return db
      .select()
      .from(dailyMetrics)
      .where(and(
        eq(dailyMetrics.key, key),
        gte(dailyMetrics.date, from),
        lte(dailyMetrics.date, to),
        orgFilter,
      ))
      .orderBy(dailyMetrics.date);
  }

  // Upserted by every beacon the client sends for a given (visitor, day) —
  // see shared/schema.ts's siteVisits comment for why this shape lets
  // "visitor count" and "time on site" both come straight out of one row
  // per session instead of a raw events log.
  async recordSiteVisit(visitorId: string, country: string | null, at: Date): Promise<SiteVisit> {
    const day = new Date(at.getFullYear(), at.getMonth(), at.getDate());
    const [visit] = await db
      .insert(siteVisits)
      .values({ visitorId, date: day, country, firstSeenAt: at, lastSeenAt: at, pageViews: 1 })
      .onConflictDoUpdate({
        target: [siteVisits.visitorId, siteVisits.date],
        set: { lastSeenAt: at, pageViews: sql`${siteVisits.pageViews} + 1` },
      })
      .returning();
    return visit;
  }

  async getVisitorsPerDay(from: Date, to: Date): Promise<{ date: string; value: number }[]> {
    const rows = await db
      .select({ date: siteVisits.date, value: sql<number>`count(*)::int` })
      .from(siteVisits)
      .where(and(gte(siteVisits.date, from), lte(siteVisits.date, to)))
      .groupBy(siteVisits.date)
      .orderBy(siteVisits.date);
    return rows.map((row) => ({ date: new Date(row.date).toISOString(), value: row.value }));
  }

  async getAverageVisitDurationSeconds(from: Date, to: Date): Promise<number> {
    const [row] = await db
      .select({
        avgSeconds: sql<number>`coalesce(avg(extract(epoch from (${siteVisits.lastSeenAt} - ${siteVisits.firstSeenAt}))), 0)`,
      })
      .from(siteVisits)
      .where(and(gte(siteVisits.date, from), lte(siteVisits.date, to)));
    return Math.round(row?.avgSeconds ?? 0);
  }

  async getVisitorCountryBreakdown(from: Date, to: Date): Promise<{ country: string; count: number }[]> {
    const countryExpr = sql<string>`coalesce(${siteVisits.country}, 'Inconnu')`;
    const rows = await db
      .select({ country: countryExpr, count: sql<number>`count(*)::int` })
      .from(siteVisits)
      .where(and(gte(siteVisits.date, from), lte(siteVisits.date, to)))
      .groupBy(countryExpr)
      .orderBy(sql`count(*) desc`);
    return rows;
  }

  async getApplicationFunnel(jobId?: string): Promise<Record<ApplicationStatus, number>> {
    const rows = await db
      .select({ status: applications.status, count: sql<number>`count(*)::int` })
      .from(applications)
      .where(jobId ? eq(applications.jobId, jobId) : undefined)
      .groupBy(applications.status);

    const funnel: Record<string, number> = {
      pending: 0, reviewing: 0, shortlisted: 0, interview: 0, offered: 0, hired: 0, rejected: 0, withdrawn: 0,
    };
    for (const row of rows) {
      funnel[row.status ?? "pending"] = row.count;
    }
    return funnel as Record<ApplicationStatus, number>;
  }

  async createReportExport(data: InsertReportExport): Promise<ReportExport> {
    const [report] = await db.insert(reportExports).values(data as any).returning();
    return report;
  }

  async getReportExport(id: string): Promise<ReportExport | undefined> {
    const [report] = await db.select().from(reportExports).where(eq(reportExports.id, id));
    return report || undefined;
  }

  async updateReportExport(id: string, updates: Partial<ReportExport>): Promise<ReportExport | undefined> {
    const [report] = await db
      .update(reportExports)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(reportExports.id, id))
      .returning();
    return report || undefined;
  }

  async listReportExports(requestedByAdminId?: string): Promise<ReportExport[]> {
    return db
      .select()
      .from(reportExports)
      .where(requestedByAdminId ? eq(reportExports.requestedByAdminId, requestedByAdminId) : undefined)
      .orderBy(desc(reportExports.createdAt));
  }

  async updateModerationItemStatus(
    id: string,
    status: ModerationStatus,
    resolvedBy: string,
  ): Promise<ModerationItem | undefined> {
    const [item] = await db
      .update(moderationItems)
      .set({ status, resolvedBy, resolvedAt: new Date() })
      .where(eq(moderationItems.id, id))
      .returning();
    return item || undefined;
  }

  async listActivityLogs(filters: ActivityLogFilters = {}): Promise<(ActivityLog & { targetLabel: string | null })[]> {
    const conditions = [];
    if (filters.action) conditions.push(eq(activityLogs.action, filters.action));
    if (filters.targetType) conditions.push(eq(activityLogs.targetType, filters.targetType));
    if (filters.targetId) conditions.push(eq(activityLogs.targetId, filters.targetId));
    if (filters.userId) conditions.push(eq(activityLogs.userId, filters.userId));
    if (filters.dateFrom) conditions.push(gte(activityLogs.createdAt, filters.dateFrom));
    if (filters.dateTo) conditions.push(lte(activityLogs.createdAt, filters.dateTo));

    return db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        userId: activityLogs.userId,
        userLabel: activityLogs.userLabel,
        ipAddress: activityLogs.ipAddress,
        status: activityLogs.status,
        details: activityLogs.details,
        targetType: activityLogs.targetType,
        targetId: activityLogs.targetId,
        createdAt: activityLogs.createdAt,
        // Resolves "who/what was targeted" to a display name in one query —
        // only meaningful when targetId is a users.id (true for candidats
        // aujourd'hui, the only target type in use).
        targetLabel: users.fullName,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.targetId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(activityLogs.createdAt))
      .limit(filters.limit ?? 200);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log as any).returning();
    return newLog;
  }

  async listNotifications(userId: string): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification as any).returning();
    return newNotification;
  }

  async markNotificationRead(id: string, userId: string): Promise<Notification | undefined> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return notification || undefined;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getAgencyFinancialSettings(agencyId: string): Promise<AgencyFinancialSettings> {
    const [existing] = await db
      .select()
      .from(agencyFinancialSettings)
      .where(eq(agencyFinancialSettings.agencyId, agencyId));
    if (existing) return existing;

    const [created] = await db
      .insert(agencyFinancialSettings)
      .values({ agencyId } as any)
      .returning();
    return created;
  }

  async updateAgencyFinancialSettings(
    agencyId: string,
    updates: Partial<AgencyFinancialSettings>,
  ): Promise<AgencyFinancialSettings> {
    await this.getAgencyFinancialSettings(agencyId);
    const [updated] = await db
      .update(agencyFinancialSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(agencyFinancialSettings.agencyId, agencyId))
      .returning();
    return updated;
  }

  async listCommissionRateSettings(agencyId: string): Promise<CommissionRateSetting[]> {
    return db
      .select()
      .from(commissionRateSettings)
      .where(eq(commissionRateSettings.agencyId, agencyId));
  }

  async createCommissionRateSetting(data: InsertCommissionRateSetting): Promise<CommissionRateSetting> {
    const [created] = await db.insert(commissionRateSettings).values(data as any).returning();
    return created;
  }

  async updateCommissionRateSetting(
    id: string,
    agencyId: string,
    updates: Partial<CommissionRateSetting>,
  ): Promise<CommissionRateSetting | undefined> {
    const [updated] = await db
      .update(commissionRateSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(commissionRateSettings.id, id), eq(commissionRateSettings.agencyId, agencyId)))
      .returning();
    return updated || undefined;
  }

  async deleteCommissionRateSetting(id: string, agencyId: string): Promise<boolean> {
    const result = await db
      .delete(commissionRateSettings)
      .where(and(eq(commissionRateSettings.id, id), eq(commissionRateSettings.agencyId, agencyId)))
      .returning();
    return result.length > 0;
  }

  async listPaymentMethodSettings(agencyId: string): Promise<PaymentMethodSetting[]> {
    return db
      .select()
      .from(paymentMethodSettings)
      .where(eq(paymentMethodSettings.agencyId, agencyId));
  }

  async createPaymentMethodSetting(data: InsertPaymentMethodSetting): Promise<PaymentMethodSetting> {
    const [created] = await db.insert(paymentMethodSettings).values(data as any).returning();
    return created;
  }

  async updatePaymentMethodSetting(
    id: string,
    agencyId: string,
    updates: Partial<PaymentMethodSetting>,
  ): Promise<PaymentMethodSetting | undefined> {
    const [updated] = await db
      .update(paymentMethodSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(paymentMethodSettings.id, id), eq(paymentMethodSettings.agencyId, agencyId)))
      .returning();
    return updated || undefined;
  }

  async deletePaymentMethodSetting(id: string, agencyId: string): Promise<boolean> {
    const result = await db
      .delete(paymentMethodSettings)
      .where(and(eq(paymentMethodSettings.id, id), eq(paymentMethodSettings.agencyId, agencyId)))
      .returning();
    return result.length > 0;
  }

  async listInvoices(agencyId: string): Promise<Invoice[]> {
    return db
      .select()
      .from(invoices)
      .where(eq(invoices.agencyId, agencyId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string, agencyId: string): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.agencyId, agencyId)));
    return invoice || undefined;
  }

  async getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
    return db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoiceId));
  }

  async createInvoice(
    agencyId: string,
    data: Omit<InsertInvoice, "agencyId" | "invoiceNumber">,
    lineItems: Omit<InsertInvoiceLineItem, "invoiceId">[],
  ): Promise<Invoice> {
    const settings = await this.getAgencyFinancialSettings(agencyId);
    const nextNumber = settings.invoiceNextNumber ?? 1;
    const year = new Date().getFullYear();
    const invoiceNumber = `${settings.invoicePrefix ?? "FAC"}-${year}-${String(nextNumber).padStart(4, "0")}`;

    const [invoice] = await db
      .insert(invoices)
      .values({ ...data, agencyId, invoiceNumber } as any)
      .returning();

    if (lineItems.length > 0) {
      await db.insert(invoiceLineItems).values(
        lineItems.map((item) => ({ ...item, invoiceId: invoice.id })) as any,
      );
    }

    await db
      .update(agencyFinancialSettings)
      .set({ invoiceNextNumber: nextNumber + 1 })
      .where(eq(agencyFinancialSettings.agencyId, agencyId));

    return invoice;
  }

  async updateInvoice(id: string, agencyId: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const [updated] = await db
      .update(invoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.agencyId, agencyId)))
      .returning();
    return updated || undefined;
  }

  async listSalaryPayments(agencyId: string): Promise<SalaryPayment[]> {
    return db
      .select()
      .from(salaryPayments)
      .where(eq(salaryPayments.agencyId, agencyId))
      .orderBy(desc(salaryPayments.createdAt));
  }

  async createSalaryPayment(data: InsertSalaryPayment): Promise<SalaryPayment> {
    const [created] = await db.insert(salaryPayments).values(data as any).returning();
    return created;
  }

  async updateSalaryPayment(
    id: string,
    agencyId: string,
    updates: Partial<SalaryPayment>,
  ): Promise<SalaryPayment | undefined> {
    const [updated] = await db
      .update(salaryPayments)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(salaryPayments.id, id), eq(salaryPayments.agencyId, agencyId)))
      .returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();
