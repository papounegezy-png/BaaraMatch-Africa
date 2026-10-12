// A job posting reads "Récent" only on its publish day (calendar date, not
// a rolling 24h window — a job posted yesterday evening is already on its
// "2nd day" this morning even though under 24h have elapsed). From the next
// calendar day on, a candidate is better served by the actual date than a
// growing "il y a N jours" counter that never resolves to something concrete.
export function formatJobPostedLabel(createdAt: Date | string | null | undefined): string {
  if (!createdAt) return "Récent";
  const posted = new Date(createdAt);
  const postedDay = new Date(posted.getFullYear(), posted.getMonth(), posted.getDate());
  const today = new Date();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((todayDay.getTime() - postedDay.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Récent";
  return posted.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
