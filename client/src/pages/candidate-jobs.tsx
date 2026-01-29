import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { MobileJobCard } from "@/components/mobile-job-card";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { VoiceCVButton } from "@/components/voice-cv-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const mockJobs = [
  {
    id: 1,
    title: "Développeur Full Stack",
    company: "TechCorp",
    location: "Bamako",
    salary: "800K - 1.2M XOF / mois",
    contractType: "CDI",
    description: "Rejoignez notre équipe de développeurs passionnés pour construire des applications innovantes.",
    skills: ["React", "Node.js", "TypeScript"],
    matchScore: 95,
  },
  {
    id: 2,
    title: "Designer UX/UI",
    company: "Creative Labs",
    location: "Dakar",
    salary: "600K - 900K XOF / mois",
    contractType: "CDI",
    description: "Nous recherchons un designer créatif pour améliorer l'expérience utilisateur de nos produits.",
    skills: ["Figma", "Adobe XD", "Prototyping"],
    matchScore: 88,
  },
  {
    id: 3,
    title: "Chef de Projet Digital",
    company: "AfriTech Solutions",
    location: "Abidjan",
    salary: "1M - 1.5M XOF / mois",
    contractType: "CDD",
    description: "Gérez des projets digitaux innovants pour nos clients dans toute l'Afrique de l'Ouest.",
    skills: ["Agile", "Scrum", "Leadership"],
    matchScore: 82,
  },
  {
    id: 4,
    title: "Data Analyst",
    company: "FinanceAfrica",
    location: "Bamako",
    salary: "700K - 1M XOF / mois",
    contractType: "CDI",
    description: "Analysez les données financières pour aider nos clients à prendre de meilleures décisions.",
    skills: ["Python", "SQL", "Power BI"],
    matchScore: 90,
  },
  {
    id: 5,
    title: "Community Manager",
    company: "SocialMedia Mali",
    location: "Bamako",
    salary: "400K - 600K XOF / mois",
    contractType: "Stage",
    description: "Gérez nos réseaux sociaux et créez du contenu engageant pour notre communauté.",
    skills: ["Social Media", "Content", "Analytics"],
    matchScore: 75,
  },
];

export default function CandidateJobsPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [likedJobs, setLikedJobs] = useState<number[]>([]);
  const [skippedJobs, setSkippedJobs] = useState<number[]>([]);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundImage: "linear-gradient(155deg, rgb(250, 245, 255) 0%, rgb(239, 246, 255) 50%, rgb(253, 242, 248) 100%)" }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getInitials = (name: string) => {
    return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  };

  const currentJob = mockJobs[currentJobIndex];
  const availableJobs = mockJobs.filter(
    (job) => !likedJobs.includes(job.id) && !skippedJobs.includes(job.id)
  );

  const handleLike = () => {
    if (currentJob) {
      setLikedJobs([...likedJobs, currentJob.id]);
      if (currentJobIndex < mockJobs.length - 1) {
        setCurrentJobIndex(currentJobIndex + 1);
      }
    }
  };

  const handleSkip = () => {
    if (currentJob) {
      setSkippedJobs([...skippedJobs, currentJob.id]);
      if (currentJobIndex < mockJobs.length - 1) {
        setCurrentJobIndex(currentJobIndex + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentJobIndex > 0) {
      setCurrentJobIndex(currentJobIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentJobIndex < mockJobs.length - 1) {
      setCurrentJobIndex(currentJobIndex + 1);
    }
  };

  const handleVoiceCVComplete = (blob: Blob) => {
    console.log("Voice CV recorded:", blob);
  };

  return (
    <div 
      className="min-h-screen pb-24"
      style={{ backgroundImage: "linear-gradient(155deg, rgb(250, 245, 255) 0%, rgb(239, 246, 255) 50%, rgb(253, 242, 248) 100%)" }}
    >
      <div className="absolute top-4 left-4 z-20">
        <Link href="/">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-white/90 dark:bg-gray-800/90 shadow-lg rounded-xl text-sm font-bold"
            data-testid="button-back-menu"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au menu
          </Button>
        </Link>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-normal text-gray-900 dark:text-white">
              Opportunités
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-base">
              {availableJobs.length} offres disponibles
            </p>
          </div>
          <Avatar 
            className="h-12 w-12"
            style={{ backgroundImage: "linear-gradient(135deg, rgb(173, 70, 255) 0%, rgb(246, 51, 154) 100%)" }}
          >
            <AvatarFallback className="text-white text-lg font-normal bg-transparent">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="relative px-8">
          {currentJob ? (
            <MobileJobCard
              job={currentJob}
              onLike={handleLike}
              onSkip={handleSkip}
              onPrevious={handlePrevious}
              onNext={handleNext}
              showNavigation={true}
            />
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 text-center shadow-xl">
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Vous avez vu toutes les offres disponibles !
              </p>
            </div>
          )}
        </div>
      </div>

      <VoiceCVButton onRecordingComplete={handleVoiceCVComplete} />
      <MobileBottomNav userType="candidate" />
    </div>
  );
}
