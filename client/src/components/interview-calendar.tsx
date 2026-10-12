import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Clock, User, CalendarDays } from "lucide-react";

type Interview = {
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  interviewDate: string;
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// No calendar library exists in this app yet — a lightweight month grid
// built for exactly what this needs (show days with interviews, list them),
// rather than pulling in a full scheduling library for that.
export function InterviewCalendar() {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<string>(() => dateKey(new Date()));

  const interviewsQuery = useQuery<Interview[]>({ queryKey: ["/api/interviews"] });

  const interviewsByDay = useMemo(() => {
    const map = new Map<string, Interview[]>();
    for (const interview of interviewsQuery.data ?? []) {
      const key = dateKey(new Date(interview.interviewDate));
      const existing = map.get(key) ?? [];
      existing.push(interview);
      existing.sort((a, b) => new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime());
      map.set(key, existing);
    }
    return map;
  }, [interviewsQuery.data]);

  const gridDays = useMemo(() => {
    const firstOfMonth = startOfMonth(visibleMonth);
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    const days: (Date | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), d));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [visibleMonth]);

  const monthLabel = visibleMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const todayKey = dateKey(new Date());
  const selectedInterviews = interviewsByDay.get(selectedDay) ?? [];

  if (interviewsQuery.isLoading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base capitalize">{monthLabel}</CardTitle>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              data-testid="button-calendar-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              data-testid="button-calendar-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
            {WEEKDAY_LABELS.map((label) => <div key={label}>{label}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {gridDays.map((day, index) => {
              if (!day) return <div key={index} className="aspect-square" />;
              const key = dateKey(day);
              const dayInterviews = interviewsByDay.get(key) ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selectedDay;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(key)}
                  className={`aspect-square rounded-lg border p-1.5 text-left flex flex-col gap-1 hover-elevate ${
                    isSelected ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  data-testid={`calendar-day-${key}`}
                >
                  <span className={`text-xs ${isToday ? "font-bold text-primary" : "text-foreground"}`}>{day.getDate()}</span>
                  {dayInterviews.length > 0 && (
                    <span className="mt-auto inline-flex items-center justify-center text-[10px] font-semibold rounded-full bg-primary text-primary-foreground h-5 min-w-5 px-1">
                      {dayInterviews.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            {new Date(selectedDay).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedInterviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-interviews-this-day">
              Aucun entretien ce jour-là.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedInterviews.map((interview) => (
                <div key={interview.applicationId} className="rounded-lg border p-3 space-y-1" data-testid={`interview-item-${interview.applicationId}`}>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {new Date(interview.interviewDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {interview.candidateName}
                  </div>
                  <p className="text-xs text-muted-foreground">{interview.jobTitle}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
