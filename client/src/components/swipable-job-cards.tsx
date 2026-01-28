import { useState, useRef, TouchEvent } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, Heart, X, ChevronLeft, ChevronRight, Banknote, Sparkles, Building2 } from "lucide-react";
import type { JobPosting } from "@shared/schema";

interface SwipableJobCardsProps {
  jobs: JobPosting[];
  onLike?: (jobId: string) => void;
  onSkip?: (jobId: string) => void;
}

export function SwipableJobCards({ jobs, onLike, onSkip }: SwipableJobCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    if (touchStart !== null) {
      const diff = touchStart - e.targetTouches[0].clientX;
      if (diff > 30) setSwipeDirection("left");
      else if (diff < -30) setSwipeDirection("right");
      else setSwipeDirection(null);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < jobs.length - 1) {
      handleSkip();
    } else if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (isLeftSwipe && onSkip && jobs[currentIndex]) {
      onSkip(jobs[currentIndex].id);
    }

    setSwipeDirection(null);
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleLike = () => {
    if (onLike && jobs[currentIndex]) {
      onLike(jobs[currentIndex].id);
    }
    if (currentIndex < jobs.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSkip = () => {
    if (onSkip && jobs[currentIndex]) {
      onSkip(jobs[currentIndex].id);
    }
    if (currentIndex < jobs.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < jobs.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (jobs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Aucune offre disponible</p>
      </Card>
    );
  }

  const currentJob = jobs[currentIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {jobs.length} offres
        </span>
        <div className="flex gap-1">
          {jobs.slice(0, 5).map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                idx === currentIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
          {jobs.length > 5 && <span className="text-xs text-muted-foreground ml-1">...</span>}
        </div>
      </div>

      <div
        ref={cardRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`relative transition-transform duration-200 ${
          swipeDirection === "left" ? "-translate-x-4 rotate-[-2deg]" : 
          swipeDirection === "right" ? "translate-x-4 rotate-[2deg]" : ""
        }`}
      >
        <Card className="overflow-hidden" data-testid={`job-card-${currentJob.id}`}>
          <div className="h-2 gradient-gold" />
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg leading-tight truncate">{currentJob.title}</h3>
                  <p className="text-muted-foreground text-sm truncate">{currentJob.companyId}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full px-3 py-1.5" data-testid={`job-match-score-${currentJob.id}`}>
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-bold text-sm">{Math.floor(70 + Math.random() * 25)}%</span>
                </div>
                {currentJob.isUrgent && (
                  <Badge variant="destructive" className="text-[10px]">Urgent</Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" />
                {currentJob.location}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Briefcase className="h-3 w-3" />
                {currentJob.jobType}
              </Badge>
              {currentJob.isRemote && (
                <Badge variant="outline" className="gap-1">
                  Remote
                </Badge>
              )}
            </div>

            {currentJob.salaryRange && (
              <div className="flex items-center gap-2 text-sm">
                <Banknote className="h-4 w-4 text-primary" />
                <span className="font-medium">{currentJob.salaryRange}</span>
              </div>
            )}

            <p className="text-sm text-muted-foreground line-clamp-3">
              {currentJob.description}
            </p>

            {currentJob.requiredSkills && currentJob.requiredSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {currentJob.requiredSkills.slice(0, 4).map((skill, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {currentJob.requiredSkills.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{currentJob.requiredSkills.length - 4}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full"
                  onClick={handleSkip}
                  data-testid="button-skip-job"
                >
                  <X className="h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  className="rounded-full"
                  onClick={handleLike}
                  data-testid="button-like-job"
                >
                  <Heart className="h-5 w-5" />
                </Button>
              </div>

              <Link href={`/jobs/${currentJob.id}`}>
                <Button variant="default" data-testid="button-view-job">
                  Voir l'offre
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {swipeDirection === "left" && (
          <div className="absolute top-4 right-4 bg-destructive/90 text-white px-3 py-1 rounded-full text-sm font-medium rotate-12">
            Passer
          </div>
        )}
        {swipeDirection === "right" && (
          <div className="absolute top-4 left-4 bg-green-500/90 text-white px-3 py-1 rounded-full text-sm font-medium -rotate-12">
            Retour
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          disabled={currentIndex === 0}
          onClick={handlePrev}
          data-testid="button-prev-job"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">
          Glissez pour naviguer
        </span>
        <Button
          variant="ghost"
          size="icon"
          disabled={currentIndex === jobs.length - 1}
          onClick={handleNext}
          data-testid="button-next-job"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
