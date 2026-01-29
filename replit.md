# BaaraMatch Africa

## Overview
BaaraMatch Africa is a professional job matching platform designed for the African market. It connects three types of users:
- **Candidates**: Job seekers looking for employment opportunities
- **Placement Agencies**: Recruitment agencies that help place candidates
- **Partner Companies**: Businesses looking to hire talent

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with custom African-inspired design tokens
- **State Management**: TanStack Query
- **Authentication**: Session-based with bcrypt password hashing
- **Session**: PostgreSQL-backed sessions (connect-pg-simple)

## Project Structure
```
client/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── ui/          # Shadcn UI components
│   │   ├── navbar.tsx   # Navigation bar
│   │   ├── footer.tsx   # Footer component
│   │   └── theme-*.tsx  # Theme management
│   ├── pages/           # Page components
│   │   ├── home.tsx     # Landing page
│   │   ├── login.tsx    # Login page
│   │   ├── register.tsx # Registration page
│   │   ├── dashboard.tsx# User dashboard
│   │   ├── jobs.tsx     # Job listings
│   │   ├── candidates.tsx# Candidate listings
│   │   └── agencies.tsx # Agency listings
│   └── lib/             # Utilities
server/
├── routes.ts            # API routes
├── storage.ts           # Data storage interface
└── index.ts             # Server entry point
shared/
└── schema.ts            # Shared TypeScript types and Zod schemas
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Jobs
- `GET /api/jobs` - Get all active jobs
- `GET /api/jobs/:id` - Get job by ID
- `POST /api/jobs` - Create new job (company/agency only)
- `PATCH /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

### Applications
- `POST /api/applications` - Create application (candidate only)
- `GET /api/applications` - Get user's applications
- `GET /api/jobs/:jobId/applications` - Get applications for a job
- `PATCH /api/applications/:id` - Update application status

### Profile
- `GET /api/profile` - Get user profile
- `PATCH /api/profile` - Update user profile

### Candidates & Agencies
- `GET /api/candidates` - Get all candidates
- `GET /api/agencies` - Get all agencies

## User Types
1. **Candidate** (`candidate`)
   - Can search and apply for jobs
   - Can manage their profile and resume
   - Can track application status

2. **Agency** (`agency`)
   - Can manage candidate placements
   - Can post jobs on behalf of companies
   - Can track placement statistics

3. **Company** (`company`)
   - Can post job listings
   - Can review applications
   - Can manage hiring process

## Design System
The application uses an African-inspired warm color palette:
- **Primary**: Gold/amber (#D97706)
- **Secondary**: Terracotta
- **Accent**: Forest green
- Dark mode support with automatic theme detection

## Database Schema

### Core Tables
- **users**: Base user accounts with authentication
- **candidate_profiles**: Extended candidate info (voice CV, skills, embedding)
- **agency_profiles**: Agency info with APDP verification status
- **company_profiles**: Company info with B2B fields (SIRET/VAT)

### Skills & Matching
- **skills**: Master skills catalog with vector embeddings for semantic matching
- **candidate_skills**: Junction table linking candidates to skills with proficiency
- **job_required_skills**: Junction table linking jobs to required skills with weights
- **matching_results**: Stores semantic matching scores between candidates and jobs

### Jobs & Applications
- **job_postings**: Enhanced with required/preferred skills, salary ranges, experience levels
- **applications**: Application tracking with status history, match scores, interview dates

### Agency Placements
- **agency_placements**: Tracks placed employees with contract details, commissions, ratings

### Semantic Matching Engine
The application includes a complete semantic matching engine using OpenAI embeddings:

**API Endpoints:**
- `POST /api/embeddings/job/:id` - Generate embedding for a job posting
- `POST /api/embeddings/candidate` - Generate embedding for candidate profile
- `POST /api/embeddings/jobs/batch` - Batch generate embeddings for all jobs
- `GET /api/matching/job/:jobId/candidates` - Get matched candidates for a job with scores
- `GET /api/matching/candidate/jobs` - Get matched jobs for a candidate
- `POST /api/matching/results` - Store matching result
- `GET /api/matching/job/:jobId/results` - Get stored matching results

**Technology:**
- OpenAI `text-embedding-3-small` model (1536 dimensions)
- PostgreSQL with `pgvector` extension for vector storage
- Cosine similarity function for matching scores
- Hybrid filtering: semantic + availability + location + salary + skills

**Vector Embedding Columns:**
- `skills.embedding` - Skill semantic vectors
- `candidate_profiles.profile_embedding` - Candidate profile vectors
- `job_postings.job_embedding` - Job posting vectors
- `company_profiles.company_embedding` - Company profile vectors

**Environment Variables:**
- `OPENAI_API_KEY` - Required for semantic matching (text-embedding-3-small)

## Recent Changes (Jan 2026)
- **Profile View & Avatar Upload** (Latest):
  - Profile page with view/edit toggle modes
  - ProfileView component displays user info (name, contact, experience, skills, voice CV)
  - Avatar upload via POST /api/avatar/upload with server-side validation (MIME type, 2MB limit)
  - Progress bar showing profile completion percentage
  - Uses fresh query data after updates for consistent display
- **Profile Save & Voice CV**:
  - Profile modifications now save to server via PATCH /api/profile API
  - Real voice CV recording using MediaRecorder API (not simulation)
  - Audio playback works for both newly recorded and server-stored voice CVs
  - Recording duration validation using elapsed time tracking
  - Microphone permission handling with user-friendly error messages
  - Loading states during save operations
- **Dashboard Personalization**:
  - Candidate dashboard displays real user data from API
  - Application statistics (Candidatures, Entretiens, Acceptés) calculated from actual data
  - Recent applications show real job titles, locations, and relative dates
  - Empty states when no applications exist
- Migrated from in-memory storage to PostgreSQL with Drizzle ORM
- Implemented bcrypt password hashing (12 salt rounds) for security
- PostgreSQL-backed session storage with connect-pg-simple
- Role-based access control with requireAuth and requireRole middleware
- Three distinct registration flows with type-specific fields:
  - Candidates: WhatsApp notification preferences and voice CV support
  - Agencies: APDP compliance verification requirements
  - Companies: B2B profile with SIRET/VAT fields
- Role-protected dashboard API endpoints
- Enhanced schema with skills matching infrastructure
- Agency placements table for tracking placed employees
- Vector embedding fields for future semantic matching engine
- Mobile-first UI with Figma-based candidate experience:
  - Swipeable job cards with gradient headers and match scores
  - Purple-pink themed "J'aime" action buttons
  - Floating voice CV recording button (red-pink gradient)
  - Bottom navigation: Recherche, Mes candidatures, Profil
  - Gradient background (purple to blue to pink)
- B2B Agency Dashboard with Figma-based "RH Connect" design:
  - Shadcn sidebar navigation (collapsible) with blue-green gradient branding
  - Menu items: Accueil, Candidats, Missions, Contrats, Facturation, Analytique
  - Simplified header with search bar and notification bell
  - 3 KPI stat cards: Taux de remplissage (87%), Missions urgentes (12), Candidats placés (156)
  - Active contracts table with avatar, status badges (Actif/En cours), alerts
  - Candidate search with AI skill filters and semantic matching
  - Voice CV preview dialog
- Separate routing for agency portal (/agency/*) and public routes

### Agency Dashboard Components
- `agency-sidebar.tsx` - RH Connect branded sidebar with gradient icons
- `agency-kpi-cards.tsx` - 3-column KPI grid with metrics
- `active-contracts-table.tsx` - Contracts table with status badges and alerts
- `candidate-search-dashboard.tsx` - AI-powered candidate search

## Development
```bash
npm run dev      # Start dev server
npm run db:push  # Push schema changes to database
```
This starts both the Vite dev server and Express backend on port 5000.

## Security Notes
- SESSION_SECRET is required in production (will throw error if missing)
- Passwords hashed with bcrypt (12 salt rounds)
- Session cookies configured with httpOnly, secure (in prod), and sameSite: lax
- PostgreSQL sessions persist across restarts (table: user_sessions)
- Role-based middleware protects sensitive endpoints

## Authentication Flow
1. User selects account type (candidate/agency/company)
2. Registration form shows type-specific requirements
3. Password hashed with bcrypt before storage
4. Session created with userId and userType
5. Dashboard routes protected by role middleware

## Mobile Export
The application is designed to be responsive and can be exported as a native mobile app using Capacitor. The viewport meta tags and CSS are optimized for mobile devices.
