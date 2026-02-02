# BaaraMatch Africa

## Overview
BaaraMatch Africa is a professional job matching platform for the African market, connecting Candidates, Placement Agencies, and Partner Companies. It aims to streamline recruitment, improve talent acquisition for businesses, and empower job seekers across Africa. The platform includes a semantic matching engine for efficient candidate-job pairing.

## User Preferences
I want iterative development, with a focus on delivering core features first.
I prefer clear and concise communication.
Ask before making major architectural changes.
Ensure all UI components are responsive and mobile-friendly.
Focus on robust authentication and authorization mechanisms.
Prioritize semantic matching accuracy.
Do not make changes to folder `node_modules`.

## System Architecture
BaaraMatch Africa is built with a modern web stack:
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI, TanStack Query. Features African-inspired design tokens and supports dark mode.
- **Backend**: Express.js, TypeScript.
- **Database**: PostgreSQL with Drizzle ORM for data persistence and `pgvector` for vector embeddings.
- **Authentication**: Session-based authentication using `bcrypt` for password hashing and `connect-pg-simple` for PostgreSQL-backed sessions. Role-based access control is implemented via middleware.
- **UI/UX**:
    - **Candidate Experience**: Mobile-first design with swipeable job cards, purple-pink themes, floating voice CV recording button, and bottom navigation.
    - **Agency Dashboard ("RH Connect")**: Figma-based design with a collapsible Shadcn sidebar, blue-green gradient branding, KPI cards, active contracts table, and AI-powered candidate search.
    - **Company ATS ("WorkMatch ATS")**: Enterprise HR and recruitment management system with a purple-pink gradient sidebar. Includes modules for Recruitment (Job Listings, Applications, Pipeline, Statistics) and HR Management (Employee, Leave, Payroll, Org Chart).
    - **Super Admin Interface**: Administrative dashboard for platform management with red-orange gradient styling.
- **Semantic Matching Engine**: Utilizes OpenAI `text-embedding-3-small` for generating vector embeddings for skills, candidate profiles, and job postings. Cosine similarity is used for matching scores, combined with hybrid filtering (availability, location, salary, skills).
- **Core Features**:
    - User registration and profiles for Candidates, Agencies, and Companies with type-specific fields (e.g., voice CV for candidates, APDP verification for agencies, B2B fields for companies).
    - Job posting and application management.
    - Agency placement tracking.
    - Profile management with avatar upload and voice CV recording functionality.
    - Personalized dashboards for different user types.
    - Optional industry-specific modules for BTP/Mines companies (Sites Management, Certifications & Habilitations, EPI & Équipements, HSE).

## External Dependencies
- **OpenAI**: Used for the `text-embedding-3-small` model to generate vector embeddings for the semantic matching engine.
- **PostgreSQL**: Primary database for all application data and session storage, utilizing the `pgvector` extension.
- **Capacitor**: For exporting the responsive web application as a native mobile app.