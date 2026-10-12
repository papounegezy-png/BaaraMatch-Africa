import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Period = { from: string; to: string };
type Preset = "this_month" | "last_month" | "this_quarter" | "this_year" | "last_year" | "custom";

const ymd = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

function presetPeriod(preset: Exclude<Preset, "custom">): Period {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "this_month": return { from: ymd(new Date(y, m, 1)), to: ymd(now) };
    case "last_month": return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
    case "this_quarter": return { from: ymd(new Date(y, Math.floor(m / 3) * 3, 1)), to: ymd(now) };
    case "last_year": return { from: ymd(new Date(y - 1, 0, 1)), to: ymd(new Date(y - 1, 11, 31)) };
    default: return { from: ymd(new Date(y, 0, 1)), to: ymd(now) };
  }
}

export const periodQuery = (period: Period) => `from=${period.from}&to=${period.to}`;
export const formatPeriodLabel = (period: Period) =>
  `du ${new Date(period.from).toLocaleDateString("fr-FR")} au ${new Date(period.to).toLocaleDateString("fr-FR")}`;

export function usePeriod(initial: Exclude<Preset, "custom"> = "this_year") {
  const [preset, setPreset] = useState<Preset>(initial);
  const [custom, setCustom] = useState<Period>(presetPeriod(initial));
  const period = useMemo(() => (preset === "custom" ? custom : presetPeriod(preset)), [preset, custom]);
  const valid = !!period.from && !!period.to && period.from <= period.to;
  return { preset, setPreset, custom, setCustom, period, valid };
}

export function PeriodPicker({ state }: { state: ReturnType<typeof usePeriod> }) {
  const { preset, setPreset, custom, setCustom, period } = state;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={(value) => { if (value === "custom") setCustom(period); setPreset(value as Preset); }}>
        <SelectTrigger className="w-[190px]" data-testid="select-period"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="this_month">Ce mois-ci</SelectItem>
          <SelectItem value="last_month">Mois dernier</SelectItem>
          <SelectItem value="this_quarter">Trimestre en cours</SelectItem>
          <SelectItem value="this_year">Année en cours</SelectItem>
          <SelectItem value="last_year">Année précédente</SelectItem>
          <SelectItem value="custom">Période personnalisée</SelectItem>
        </SelectContent>
      </Select>
      {preset === "custom" && (
        <>
          <Input type="date" className="w-[150px]" value={custom.from} max={custom.to} onChange={(e) => setCustom({ ...custom, from: e.target.value })} aria-label="Du" data-testid="input-period-from" />
          <Input type="date" className="w-[150px]" value={custom.to} min={custom.from} onChange={(e) => setCustom({ ...custom, to: e.target.value })} aria-label="Au" data-testid="input-period-to" />
        </>
      )}
    </div>
  );
}
