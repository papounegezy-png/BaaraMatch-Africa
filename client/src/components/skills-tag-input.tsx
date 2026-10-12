import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { SKILLS_LIST_SORTED } from "@/lib/skills-list";

const MAX_SUGGESTIONS = 6;
// Badges render with whitespace-nowrap (by design, app-wide) — an unbounded
// tag would overflow its row instead of wrapping, so cap input length.
const MAX_SKILL_LENGTH = 40;

/**
 * Pill-based tag input for a string[] field (skills, but generic enough to
 * reuse anywhere a free-form tag list is needed). Enter or comma commits the
 * current text as a tag; Backspace on an empty input removes the last tag.
 * Typing shows a LinkedIn-style dropdown of matching known skills — picking
 * one commits it directly, but free text is always accepted too.
 */
export function SkillsTagInput({
  value,
  onChange,
  placeholder = "Ajouter une compétence...",
  "aria-label": ariaLabel = "Compétences requises",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const [draft, setDraft] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const suggestions = useMemo(() => {
    const query = draft.trim().toLowerCase();
    if (!query) return [];
    return SKILLS_LIST_SORTED.filter(
      (skill) => skill.toLowerCase().includes(query) && !value.includes(skill),
    ).slice(0, MAX_SUGGESTIONS);
  }, [draft, value]);

  const showSuggestions = isOpen && suggestions.length > 0;

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft("");
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
      return;
    }
    if (showSuggestions && e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      return;
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (showSuggestions && activeIndex >= 0) {
        addSkill(suggestions[activeIndex]);
      } else {
        addSkill(draft);
      }
      setIsOpen(false);
      return;
    }
    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeSkill = (skill: string) => {
    onChange(value.filter((s) => s !== skill));
  };

  const activeOptionId =
    showSuggestions && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div className="relative">
      <div
        className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 min-h-11 focus-within:ring-1 focus-within:ring-ring"
        data-testid="skills-tag-input"
      >
        {value.map((skill) => (
          <Badge key={skill} variant="secondary" className="gap-1 pl-2.5 pr-1 py-1" data-testid={`badge-skill-${skill}`}>
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              aria-label={`Retirer la compétence ${skill}`}
              className="rounded-full p-0.5 hover:bg-muted-foreground/20"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay so a click on a suggestion registers before the listbox unmounts.
            setTimeout(() => setIsOpen(false), 150);
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          maxLength={MAX_SKILL_LENGTH}
          aria-label={ariaLabel}
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          className="flex-1 min-w-[8rem] border-dashed border-b bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1"
          data-testid="input-skills-tag-draft"
        />
      </div>

      {showSuggestions && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Suggestions de compétences"
          className="absolute z-10 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md py-1"
          data-testid="list-skill-suggestions"
        >
          {suggestions.map((skill, index) => (
            <li
              key={skill}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => {
                // mousedown (not click) fires before the input's onBlur.
                e.preventDefault();
                addSkill(skill);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`px-3 py-1.5 text-sm cursor-pointer ${
                index === activeIndex ? "bg-accent text-accent-foreground" : ""
              }`}
              data-testid={`option-skill-${skill}`}
            >
              {skill}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
