import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for semantic matching");
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.trim(),
    dimensions: EMBEDDING_DIMENSIONS,
  });
  
  return response.data[0].embedding;
}

export async function generateJobEmbedding(job: {
  title: string;
  description: string;
  requirements?: string[] | null;
  requiredSkills?: string[] | null;
  location: string;
  category?: string | null;
}): Promise<number[]> {
  const text = [
    `Poste: ${job.title}`,
    `Description: ${job.description}`,
    job.requirements?.length ? `Exigences: ${job.requirements.join(", ")}` : "",
    job.requiredSkills?.length ? `Compétences requises: ${job.requiredSkills.join(", ")}` : "",
    `Localisation: ${job.location}`,
    job.category ? `Catégorie: ${job.category}` : "",
  ].filter(Boolean).join("\n");
  
  return generateEmbedding(text);
}

export async function generateCandidateEmbedding(profile: {
  title?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  experience?: string | null;
  education?: string | null;
  languages?: string[] | null;
}): Promise<number[]> {
  const text = [
    profile.title ? `Titre: ${profile.title}` : "",
    profile.bio ? `Bio: ${profile.bio}` : "",
    profile.skills?.length ? `Compétences: ${profile.skills.join(", ")}` : "",
    profile.experience ? `Expérience: ${profile.experience}` : "",
    profile.education ? `Formation: ${profile.education}` : "",
    profile.languages?.length ? `Langues: ${profile.languages.join(", ")}` : "",
  ].filter(Boolean).join("\n");
  
  if (!text.trim()) {
    throw new Error("Profile has no content to generate embedding");
  }
  
  return generateEmbedding(text);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function similarityToPercentage(similarity: number): number {
  // Convert cosine similarity (-1 to 1) to percentage (0 to 100)
  // We use (similarity + 1) / 2 to normalize from [-1,1] to [0,1]
  // Then multiply by 100 for percentage
  return Math.round(((similarity + 1) / 2) * 100);
}

export interface MatchingFilters {
  location?: string;
  landmark?: string;
  availableFrom?: string;
  salaryMin?: number;
  salaryMax?: number;
  experienceMin?: number;
  experienceMax?: number;
  skills?: string[];
}

export function applyHybridFilters<T extends {
  id: string;
  matchScore: number;
  profile?: {
    availableFrom?: string | null;
    salaryExpectation?: string | null;
    experienceYears?: number | null;
    skills?: string[] | null;
  } | null;
  user: {
    city?: string | null;
  };
}>(
  candidates: T[],
  filters: MatchingFilters
): T[] {
  return candidates.filter(candidate => {
    // Location filter (includes landmark-based search for Bamako)
    if (filters.location || filters.landmark) {
      const candidateCity = candidate.user.city?.toLowerCase() || "";
      const filterLocation = (filters.location || filters.landmark || "").toLowerCase();
      if (!candidateCity.includes(filterLocation) && !filterLocation.includes(candidateCity)) {
        // For landmark search, we check if city is Bamako
        if (filters.landmark && !candidateCity.includes("bamako")) {
          return false;
        }
      }
    }
    
    // Availability filter
    if (filters.availableFrom && candidate.profile?.availableFrom) {
      const filterDate = new Date(filters.availableFrom);
      const candidateDate = new Date(candidate.profile.availableFrom);
      if (candidateDate > filterDate) {
        return false;
      }
    }
    
    // Salary expectation filter
    if (filters.salaryMin || filters.salaryMax) {
      const salaryStr = candidate.profile?.salaryExpectation || "";
      const salaryMatch = salaryStr.match(/(\d+)/);
      if (salaryMatch) {
        const salary = parseInt(salaryMatch[1]);
        if (filters.salaryMin && salary < filters.salaryMin) return false;
        if (filters.salaryMax && salary > filters.salaryMax) return false;
      }
    }
    
    // Experience filter
    if (filters.experienceMin || filters.experienceMax) {
      const exp = candidate.profile?.experienceYears || 0;
      if (filters.experienceMin && exp < filters.experienceMin) return false;
      if (filters.experienceMax && exp > filters.experienceMax) return false;
    }
    
    // Skills filter
    if (filters.skills && filters.skills.length > 0) {
      const candidateSkills = (candidate.profile?.skills || []).map(s => s.toLowerCase());
      const hasAllSkills = filters.skills.every(skill => 
        candidateSkills.some(cs => cs.includes(skill.toLowerCase()))
      );
      if (!hasAllSkills) return false;
    }
    
    return true;
  });
}
