import { pool } from "./db";

export async function initPgVector(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");
    
    await client.query(`
      CREATE OR REPLACE FUNCTION cosine_similarity(a real[], b real[])
      RETURNS real AS $$
      DECLARE
        dot_product real := 0;
        norm_a real := 0;
        norm_b real := 0;
        i int;
      BEGIN
        IF array_length(a, 1) != array_length(b, 1) OR array_length(a, 1) IS NULL THEN
          RETURN 0;
        END IF;
        
        FOR i IN 1..array_length(a, 1) LOOP
          dot_product := dot_product + (a[i] * b[i]);
          norm_a := norm_a + (a[i] * a[i]);
          norm_b := norm_b + (b[i] * b[i]);
        END LOOP;
        
        IF norm_a = 0 OR norm_b = 0 THEN
          RETURN 0;
        END IF;
        
        RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
      END;
      $$ LANGUAGE plpgsql IMMUTABLE
    `);

    console.log("[pgvector] Extension and cosine_similarity function initialized");
  } catch (error) {
    console.error("[pgvector] Initialization error:", error);
    throw error;
  } finally {
    client.release();
  }
}

export async function findMatchingCandidatesSQL(
  jobEmbedding: number[],
  filters?: {
    city?: string;
    skills?: string[];
    salaryMin?: number;
    salaryMax?: number;
    experienceMin?: number;
    experienceMax?: number;
  }
): Promise<Array<{
  candidateId: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  city: string | null;
  matchScore: number;
  skills: string[] | null;
  experienceYears: number | null;
  salaryExpectation: string | null;
  voiceCvUrl: string | null;
  avatarUrl: string | null;
}>> {
  const client = await pool.connect();
  try {
    const embeddingStr = `ARRAY[${jobEmbedding.join(",")}]::real[]`;
    
    let whereConditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (filters?.city) {
      whereConditions.push(`LOWER(u.city) LIKE LOWER($${paramIdx})`);
      params.push(`%${filters.city}%`);
      paramIdx++;
    }

    if (filters?.experienceMin) {
      whereConditions.push(`cp.experience_years >= $${paramIdx}`);
      params.push(filters.experienceMin);
      paramIdx++;
    }

    if (filters?.experienceMax) {
      whereConditions.push(`cp.experience_years <= $${paramIdx}`);
      params.push(filters.experienceMax);
      paramIdx++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE u.user_type = 'candidate' AND ${whereConditions.join(" AND ")}`
      : `WHERE u.user_type = 'candidate'`;

    const query = `
      SELECT 
        cp.id as candidate_id,
        u.id as user_id,
        u.full_name,
        u.email,
        u.phone,
        u.city,
        u.avatar_url,
        cp.skills,
        cp.experience_years,
        cp.salary_expectation,
        cp.voice_cv_url,
        CASE 
          WHEN cp.profile_embedding IS NOT NULL 
          THEN (cosine_similarity(cp.profile_embedding, ${embeddingStr}) + 1) / 2 * 100
          ELSE 50
        END as match_score
      FROM users u
      LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
      ${whereClause}
      ORDER BY match_score DESC
      LIMIT 100
    `;

    const result = await client.query(query, params);
    
    return result.rows.map(row => ({
      candidateId: row.candidate_id,
      userId: row.user_id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      city: row.city,
      matchScore: Math.round(parseFloat(row.match_score)),
      skills: row.skills,
      experienceYears: row.experience_years,
      salaryExpectation: row.salary_expectation,
      voiceCvUrl: row.voice_cv_url,
      avatarUrl: row.avatar_url,
    }));
  } finally {
    client.release();
  }
}

export async function findMatchingJobsSQL(
  candidateEmbedding: number[]
): Promise<Array<{
  jobId: string;
  title: string;
  description: string;
  location: string;
  salaryRange: string | null;
  jobType: string;
  matchScore: number;
}>> {
  const client = await pool.connect();
  try {
    const embeddingStr = `ARRAY[${candidateEmbedding.join(",")}]::real[]`;
    
    const query = `
      SELECT 
        jp.id as job_id,
        jp.title,
        jp.description,
        jp.location,
        jp.salary_range,
        jp.job_type,
        CASE 
          WHEN jp.job_embedding IS NOT NULL 
          THEN (cosine_similarity(jp.job_embedding, ${embeddingStr}) + 1) / 2 * 100
          ELSE 50
        END as match_score
      FROM job_postings jp
      WHERE jp.is_active = true
      ORDER BY match_score DESC
      LIMIT 50
    `;

    const result = await client.query(query);
    
    return result.rows.map(row => ({
      jobId: row.job_id,
      title: row.title,
      description: row.description,
      location: row.location,
      salaryRange: row.salary_range,
      jobType: row.job_type,
      matchScore: Math.round(parseFloat(row.match_score)),
    }));
  } finally {
    client.release();
  }
}
