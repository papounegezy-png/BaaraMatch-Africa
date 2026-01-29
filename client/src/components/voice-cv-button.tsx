import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceCVButtonProps {
  onRecordingComplete?: (audioBlob: Blob) => void;
}

export function VoiceCVButton({ onRecordingComplete }: VoiceCVButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        onRecordingComplete?.(blob);
        stream.getTracks().forEach((track) => track.stop());
        toast({
          title: "CV vocal enregistré",
          description: "Votre CV vocal a été sauvegardé avec succès.",
        });
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'accéder au microphone. Veuillez autoriser l'accès.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  return (
    <Button
      size="icon"
      className={`fixed bottom-24 right-4 z-40 h-16 w-16 rounded-full shadow-2xl ${
        isRecording ? "animate-pulse" : ""
      }`}
      style={{ 
        backgroundImage: isRecording 
          ? "linear-gradient(to right, rgb(251, 44, 54), rgb(246, 51, 154))"
          : "linear-gradient(to right, rgb(251, 44, 54), rgb(246, 51, 154))",
        opacity: isRecording ? 1 : 0.79
      }}
      onClick={isRecording ? stopRecording : startRecording}
      data-testid="button-voice-cv"
    >
      {isRecording ? (
        <Square className="h-8 w-8 text-white" />
      ) : (
        <Mic className="h-8 w-8 text-white" />
      )}
    </Button>
  );
}
