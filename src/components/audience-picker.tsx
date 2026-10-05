import { TAGS, type TagId } from "@/lib/sections";
import { cn } from "@/components/ui";

export function AudiencePicker({
  value,
  onChange,
  label = "Who is it for?",
}: {
  value: TagId[];
  onChange: (next: TagId[]) => void;
  label?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-medium">{label}</legend>
      <p className="mb-2 text-sm text-muted">Pick at least one. Everyday is for apps anyone could use.</p>
      <div className="flex flex-wrap gap-2">
        {TAGS.map((tag) => {
          const on = value.includes(tag.id);
          return (
            <label
              key={tag.id}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm",
                on ? "bg-pine text-paper" : "bg-card text-ink shadow-line hover:bg-paper-2",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={() =>
                  onChange(
                    TAGS.map((item) => item.id).filter((id) => (id === tag.id ? !on : value.includes(id))),
                  )
                }
              />
              <span aria-hidden>{on ? "✓" : "+"}</span>
              {tag.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
