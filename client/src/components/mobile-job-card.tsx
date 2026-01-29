import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Briefcase, Heart, X, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

interface JobData {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  contractType: string;
  description: string;
  skills: string[];
  matchScore: number;
}

interface MobileJobCardProps {
  job: JobData;
  onLike?: () => void;
  onSkip?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  showNavigation?: boolean;
}

export function MobileJobCard({ 
  job, 
  onLike, 
  onSkip,
  onPrevious,
  onNext,
  showNavigation = true
}: MobileJobCardProps) {
  return (
    <div className="relative">
      {showNavigation && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-[-60px] top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 shadow-lg rounded-full h-12 w-12 opacity-30 hover:opacity-100"
            onClick={onPrevious}
            data-testid="button-job-previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-[-60px] top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 shadow-lg rounded-full h-12 w-12"
            onClick={onNext}
            data-testid="button-job-next"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      <Card 
        className="relative overflow-hidden rounded-3xl border-2 border-gray-100 dark:border-gray-800 shadow-2xl bg-white dark:bg-gray-900"
        data-testid={`job-card-${job.id}`}
      >
        <div 
          className="absolute top-6 right-4 z-10 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-white font-bold"
          style={{ backgroundImage: "linear-gradient(to right, rgb(0, 201, 80), rgb(0, 188, 125))" }}
        >
          <Sparkles className="h-4 w-4" />
          <span>{job.matchScore}%</span>
        </div>

        <div 
          className="h-16 flex items-center justify-center"
          style={{ backgroundImage: "linear-gradient(170deg, rgb(243, 232, 255) 0%, rgb(219, 234, 254) 100%)" }}
        >
          <span className="text-5xl">🚀</span>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {job.title}
            </h2>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {job.company}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <MapPin className="h-5 w-5 text-gray-400" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <span className="font-bold">{job.salary}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <Briefcase className="h-5 w-5 text-gray-400" />
              <span>{job.contractType}</span>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 line-clamp-3">
            {job.description}
          </p>

          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <Badge 
                key={skill}
                variant="outline"
                className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700 rounded-full px-4 py-1.5"
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-4">
          <Button
            variant="secondary"
            className="flex-1 h-16 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            onClick={onSkip}
            data-testid="button-job-skip"
          >
            <X className="h-8 w-8 text-gray-600 dark:text-gray-400" />
          </Button>
          <Button
            className="flex-1 h-16 rounded-2xl text-white font-bold text-lg shadow-lg"
            style={{ backgroundImage: "linear-gradient(to right, rgb(173, 70, 255), rgb(246, 51, 154))" }}
            onClick={onLike}
            data-testid="button-job-like"
          >
            <Heart className="h-8 w-8 mr-2" />
            J'aime
          </Button>
        </div>
      </Card>
    </div>
  );
}
