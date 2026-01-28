# BaaraMatch Africa

## Overview
BaaraMatch Africa is a professional job matching platform designed for the African market. It connects three types of users:
- **Candidates**: Job seekers looking for employment opportunities
- **Placement Agencies**: Recruitment agencies that help place candidates
- **Partner Companies**: Businesses looking to hire talent

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Styling**: Tailwind CSS with custom African-inspired design tokens
- **State Management**: TanStack Query
- **Storage**: In-memory storage (MemStorage)
- **Session**: Express session with memory store

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

## Recent Changes (Jan 2026)
- Integrated express-session middleware for authentication
- Connected AuthProvider context to App.tsx for global auth state
- Updated login/register pages to invalidate auth cache after successful auth
- Jobs page now fetches data from /api/jobs with loading states
- Navbar displays user status and logout functionality

## Development
```bash
npm run dev
```
This starts both the Vite dev server and Express backend on port 5000.

## Security Notes
- SESSION_SECRET is required in production (will throw error if missing)
- Passwords are currently hashed with SHA-256 (consider bcrypt for production)
- Session uses memory store (not persistent across restarts)

## Mobile Export
The application is designed to be responsive and can be exported as a native mobile app using Capacitor. The viewport meta tags and CSS are optimized for mobile devices.
