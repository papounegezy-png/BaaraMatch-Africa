import { describe, expect, it } from "vitest";
import { DUREE_MAX_SECONDES, DUREE_MIN_SECONDES, adresseAudioLisible, deNom, libelleDureeAudio, typeAudio } from "../shared/cv-vocal";

describe("CV vocal : formats et libellés", () => {
  it("fixe la durée de 10 s à 2 min", () => {
    expect([DUREE_MIN_SECONDES, DUREE_MAX_SECONDES]).toEqual([10, 120]);
  });
  it("reconnaît les formats des navigateurs, sans les codecs", () => {
    expect(typeAudio("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(typeAudio("audio/mp4")).toBe("audio/mp4");
    expect(typeAudio(" AUDIO/OGG ; codecs=opus")).toBe("audio/ogg");
    expect(typeAudio("video/mp4")).toBeNull();
    expect(typeAudio("")).toBeNull();
    expect(typeAudio(undefined)).toBeNull();
  });
  it("écarte les adresses illisibles par un navigateur", () => {
    expect(adresseAudioLisible("data:audio/webm;base64,GkXf")).toBe(true);
    expect(adresseAudioLisible("/api/files/voice-cv/abc.webm")).toBe(true);
    expect(adresseAudioLisible("whatsapp://media/123")).toBe(false);
    expect(adresseAudioLisible("data:application/pdf;base64,JVBE")).toBe(false);
    expect(adresseAudioLisible(null)).toBe(false);
  });
  it("écrit la durée", () => {
    expect(libelleDureeAudio(45)).toBe("45 s");
    expect(libelleDureeAudio(65)).toBe("1 min 05 s");
    expect(libelleDureeAudio(120)).toBe("2 min 00 s");
    expect(libelleDureeAudio(0)).toBeNull();
    expect(libelleDureeAudio(null)).toBeNull();
  });
  it("élide « de » devant une voyelle", () => {
    expect(deNom("Aminata Diallo")).toBe("d'Aminata Diallo");
    expect(deNom("Oumar Traoré")).toBe("d'Oumar Traoré");
    expect(deNom("Moussa Keïta")).toBe("de Moussa Keïta");
    expect(deNom("")).toBe("de ce candidat");
  });
});
