import OpenAI from "openai";
import { storage } from "./storage";
import { generateCandidateEmbedding } from "./embeddings";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  audio?: { id: string; mime_type: string };
  voice?: { id: string; mime_type: string };
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: WhatsAppMessage[];
      };
      field: string;
    }>;
  }>;
}

export async function downloadWhatsAppMedia(mediaId: string): Promise<Buffer> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("WHATSAPP_ACCESS_TOKEN not configured");

  const mediaUrlResponse = await fetch(
    `https://graph.facebook.com/v18.0/${mediaId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!mediaUrlResponse.ok) {
    throw new Error(`Failed to get media URL: ${mediaUrlResponse.statusText}`);
  }

  const mediaData = await mediaUrlResponse.json() as { url: string };
  
  const mediaResponse = await fetch(mediaData.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!mediaResponse.ok) {
    throw new Error(`Failed to download media: ${mediaResponse.statusText}`);
  }

  const arrayBuffer = await mediaResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const extension = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "mp3";
  
  const file = new File([audioBuffer], `audio.${extension}`, { type: mimeType });
  
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "fr",
    response_format: "text",
  });

  return transcription;
}

interface ExtractedProfile {
  skills: string[];
  experienceYears: number;
  summary: string;
  languages: string[];
  education: string | null;
  desiredPosition: string | null;
}

export async function extractProfileFromTranscription(transcription: string): Promise<ExtractedProfile> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Tu es un expert RH qui analyse des CV vocaux de candidats africains. 
Extrais les informations clés de la transcription et retourne un JSON structuré.
Sois précis sur les compétences techniques et les années d'expérience.
Si une information n'est pas mentionnée, utilise null ou une valeur par défaut appropriée.`,
      },
      {
        role: "user",
        content: `Analyse cette transcription de CV vocal et extrais les informations suivantes:
- skills: liste des compétences techniques et soft skills (tableau de strings)
- experienceYears: nombre total d'années d'expérience (nombre entier, 0 si non mentionné)
- summary: résumé professionnel en 2-3 phrases
- languages: langues parlées (tableau de strings)
- education: niveau d'études ou diplôme principal (string ou null)
- desiredPosition: poste recherché (string ou null)

Transcription:
${transcription}

Retourne UNIQUEMENT le JSON, sans markdown ni explication.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content || "{}";
  
  try {
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
    return {
      skills: parsed.skills || [],
      experienceYears: parsed.experienceYears || 0,
      summary: parsed.summary || "",
      languages: parsed.languages || [],
      education: parsed.education || null,
      desiredPosition: parsed.desiredPosition || null,
    };
  } catch {
    console.error("Failed to parse GPT response:", content);
    return {
      skills: [],
      experienceYears: 0,
      summary: transcription.substring(0, 200),
      languages: ["Français"],
      education: null,
      desiredPosition: null,
    };
  }
}

export function calculateProfileCompleteness(profile: {
  skills?: string[] | null;
  experienceYears?: number | null;
  voiceCvUrl?: string | null;
  salaryExpectation?: string | null;
  availableFrom?: string | null;
}): number {
  let score = 0;
  const weights = {
    skills: 30,
    experienceYears: 20,
    voiceCvUrl: 25,
    salaryExpectation: 15,
    availableFrom: 10,
  };

  if (profile.skills && profile.skills.length > 0) {
    score += weights.skills;
  }
  if (profile.experienceYears && profile.experienceYears > 0) {
    score += weights.experienceYears;
  }
  if (profile.voiceCvUrl) {
    score += weights.voiceCvUrl;
  }
  if (profile.salaryExpectation) {
    score += weights.salaryExpectation;
  }
  if (profile.availableFrom) {
    score += weights.availableFrom;
  }

  return score;
}

export type WhatsAppSendResult =
  | { ok: true }
  | { ok: false; errorCode: number | null; error: string };

// Meta Cloud API error codes meaning "this message can't go out right now
// because of the 24h window / template rules" — as opposed to a real
// failure (bad number, credentials, rate limit...):
// - 131047: re-engagement message — more than 24h since the user last wrote
// - 132001: template does not exist (or not in that language)
// - 132015 / 132016: template paused / disabled by Meta
export const WHATSAPP_WINDOW_ERROR_CODES = new Set([131047, 132001, 132015, 132016]);

async function postWhatsAppMessage(payload: Record<string, unknown>): Promise<WhatsAppSendResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.error("WhatsApp credentials not configured");
    return { ok: false, errorCode: null, error: "WhatsApp credentials not configured" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...payload }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send WhatsApp message:", error);
      let errorCode: number | null = null;
      try {
        errorCode = (JSON.parse(error) as { error?: { code?: number } }).error?.code ?? null;
      } catch {
        // non-JSON error body — keep the raw text only
      }
      return { ok: false, errorCode, error };
    }

    return { ok: true };
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return { ok: false, errorCode: null, error: String(error) };
  }
}

/** Free-form text — only deliverable inside the 24h service window. */
export function sendWhatsAppText(phoneNumber: string, message: string): Promise<WhatsAppSendResult> {
  return postWhatsAppMessage({ to: phoneNumber, type: "text", text: { body: message } });
}

/** Pre-approved template — the only way to write first outside the window. */
export function sendWhatsAppTemplate(
  phoneNumber: string,
  template: { name: string; language: string; bodyParams: string[] },
): Promise<WhatsAppSendResult> {
  return postWhatsAppMessage({
    to: phoneNumber,
    type: "template",
    template: {
      name: template.name,
      language: { code: template.language },
      components: [{ type: "body", parameters: template.bodyParams.map((text) => ({ type: "text", text })) }],
    },
  });
}

export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<boolean> {
  return (await sendWhatsAppText(phoneNumber, message)).ok;
}

export async function processVoiceCVMessage(
  message: WhatsAppMessage,
  senderName: string
): Promise<{ success: boolean; completenessScore?: number; error?: string }> {
  try {
    const audioMessage = message.audio || message.voice;
    if (!audioMessage) {
      return { success: false, error: "No audio content in message" };
    }

    console.log(`Processing voice CV from ${message.from} (${senderName})`);

    const audioBuffer = await downloadWhatsAppMedia(audioMessage.id);
    console.log(`Downloaded audio: ${audioBuffer.length} bytes`);

    const transcription = await transcribeAudio(audioBuffer, audioMessage.mime_type);
    console.log(`Transcription: ${transcription.substring(0, 100)}...`);

    const extractedProfile = await extractProfileFromTranscription(transcription);
    console.log(`Extracted profile:`, extractedProfile);

    let candidate = await storage.getUserByPhone(message.from);
    
    if (!candidate) {
      candidate = await storage.createUser({
        email: `whatsapp_${message.from}@baaramatch.africa`,
        password: `wa_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        userType: "candidate",
        fullName: senderName,
        phone: message.from,
        country: "Mali",
      });
      console.log(`Created new candidate: ${candidate.id}`);
    }

    let existingProfile = await storage.getCandidateProfile(candidate.id);
    
    const profileData = {
      skills: extractedProfile.skills,
      experienceYears: extractedProfile.experienceYears,
      voiceCvUrl: `whatsapp://media/${audioMessage.id}`,
      voiceCvTranscript: transcription,
      whatsappNumber: message.from,
    };

    if (existingProfile) {
      await storage.updateCandidateProfile(candidate.id, profileData);
      existingProfile = { ...existingProfile, ...profileData };
    } else {
      existingProfile = await storage.createCandidateProfile({
        userId: candidate.id,
        ...profileData,
      });
    }

    if (extractedProfile.skills.length > 0) {
      try {
        const embedding = await generateCandidateEmbedding(existingProfile);
        await storage.updateCandidateProfile(candidate.id, { profileEmbedding: embedding });
      } catch (err) {
        console.error("Failed to generate candidate embedding:", err);
      }
    }

    const completenessScore = calculateProfileCompleteness(existingProfile);

    return { success: true, completenessScore };
  } catch (error) {
    console.error("Error processing voice CV:", error);
    return { success: false, error: String(error) };
  }
}

export function parseWhatsAppWebhook(body: unknown): WhatsAppWebhookPayload | null {
  try {
    const payload = body as WhatsAppWebhookPayload;
    if (payload.object === "whatsapp_business_account" && payload.entry?.length > 0) {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

export function getMessagesFromWebhook(payload: WhatsAppWebhookPayload): Array<{
  message: WhatsAppMessage;
  senderName: string;
  phoneNumberId: string;
}> {
  const results: Array<{
    message: WhatsAppMessage;
    senderName: string;
    phoneNumberId: string;
  }> = [];

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field === "messages" && change.value.messages) {
        const contacts = change.value.contacts || [];
        const phoneNumberId = change.value.metadata.phone_number_id;

        for (const message of change.value.messages) {
          const contact = contacts.find((c) => c.wa_id === message.from);
          results.push({
            message,
            senderName: contact?.profile?.name || "Candidat",
            phoneNumberId,
          });
        }
      }
    }
  }

  return results;
}
