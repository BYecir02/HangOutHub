import { Copy, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui';
import {
  DAYS,
  DEFAULT_RANGE,
  type DayKey,
  type TimeRange,
  type WeeklyHours,
} from '@/lib/opening-hours';

interface OpeningHoursEditorProps {
  value: WeeklyHours;
  onChange: (next: WeeklyHours) => void;
}

export function OpeningHoursEditor({ value, onChange }: OpeningHoursEditorProps) {
  const setDay = (day: DayKey, ranges: TimeRange[]) =>
    onChange({ ...value, [day]: ranges });

  const toggleDay = (day: DayKey, open: boolean) =>
    setDay(day, open ? [{ ...DEFAULT_RANGE }] : []);

  const updateRange = (
    day: DayKey,
    index: number,
    field: keyof TimeRange,
    val: string,
  ) => {
    const ranges = [...(value[day] ?? [])];
    ranges[index] = { ...ranges[index], [field]: val };
    setDay(day, ranges);
  };

  const addRange = (day: DayKey) =>
    setDay(day, [...(value[day] ?? []), { ...DEFAULT_RANGE }]);

  const removeRange = (day: DayKey, index: number) =>
    setDay(
      day,
      (value[day] ?? []).filter((_, i) => i !== index),
    );

  const applyMondayToAll = () => {
    const source = value.mon ?? [];
    const next: WeeklyHours = {};
    DAYS.forEach(({ key }) => {
      next[key] = source.map((range) => ({ ...range }));
    });
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {DAYS.map(({ key, label }) => {
        const ranges = value[key] ?? [];
        const isOpen = ranges.length > 0;
        return (
          <div
            key={key}
            className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-start"
          >
            <div className="flex w-full items-center justify-between sm:w-32 sm:shrink-0">
              <span className="text-sm font-medium">{label}</span>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={isOpen}
                  onChange={(e) => toggleDay(key, e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                {isOpen ? 'Ouvert' : 'Fermé'}
              </label>
            </div>

            <div className="flex-1">
              {isOpen && (
                <div className="space-y-2">
                  {ranges.map((range, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={range.open}
                        onChange={(e) => updateRange(key, index, 'open', e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      />
                      <span className="text-muted-foreground">–</span>
                      <input
                        type="time"
                        value={range.close}
                        onChange={(e) => updateRange(key, index, 'close', e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      />
                      {ranges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRange(key, index)}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                          aria-label="Retirer le créneau"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addRange(key)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter un créneau
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={applyMondayToAll}>
        <Copy className="h-4 w-4" />
        Appliquer le lundi à toute la semaine
      </Button>
    </div>
  );
}
