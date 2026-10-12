// pages/api/company-names.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../server/db";
import { companyProfiles } from "../../shared/schema";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: "Invalid ids" });
  }
  try {
    // Query company profiles for the given ids
    const profiles = await db
      .select({ id: companyProfiles.id, companyName: companyProfiles.companyName })
      .from(companyProfiles)
      .where(companyProfiles.id.in(ids));
    const map: Record<string, string> = {};
    for (const profile of profiles) {
      map[profile.id] = profile.companyName;
    }
    res.status(200).json(map);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch company names" });
  }
}
