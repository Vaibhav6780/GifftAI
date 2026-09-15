import { useState } from "react";
import { useAddLeadNote } from "../api";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { toast } from "../../../components/ui/Toast";

/** Blank fields are omitted entirely rather than left as an empty "Location: " line. */
function buildFirstNoteBody(location: string, budget: string, interest: string): string {
  return [
    location.trim() && `Location: ${location.trim()}`,
    budget.trim() && `Budget: ${budget.trim()}`,
    interest.trim() && `Interested in: ${interest.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** The first note on a lead prompts for Location, Budget, and Interested in as separate
 *  fields instead of free text, so the key qualifying details are captured consistently —
 *  used both on the lead detail page (LeadNotes) and the Leads list's inline Note column
 *  (LeadNoteCell), which previously only had this on the detail page, so a first note added
 *  from the list silently skipped the template entirely. All three fields are optional; only
 *  a completely empty note (nothing filled in) is blocked, since the backend rejects that. */
export function LeadFirstNoteForm({ leadId, compact = false }: { leadId: string; compact?: boolean }) {
  const addNote = useAddLeadNote(leadId);
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [interest, setInterest] = useState("");

  function handleAdd() {
    const body = buildFirstNoteBody(location, budget, interest);
    if (!body) {
      toast.error("Fill in at least one field before adding the note");
      return;
    }
    addNote.mutate(
      { body },
      {
        onSuccess: () => {
          toast.success("Note added");
          setLocation("");
          setBudget("");
          setInterest("");
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to add note"),
      },
    );
  }

  const inputClassName = compact ? "h-8 text-xs" : undefined;

  return (
    <div className={compact ? "flex flex-col gap-1.5" : "mb-4 flex flex-col gap-3"}>
      <Input
        label={compact ? undefined : "Location"}
        placeholder={compact ? "Location" : "City / region"}
        className={inputClassName}
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <Input
        label={compact ? undefined : "Budget"}
        placeholder={compact ? "Budget" : "e.g. 50,000 - 75,000"}
        className={inputClassName}
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
      />
      <Input
        label={compact ? undefined : "Interested in"}
        placeholder={compact ? "Interested in" : "What are they looking for?"}
        className={inputClassName}
        value={interest}
        onChange={(e) => setInterest(e.target.value)}
      />
      {!compact && (
        <p className="text-xs text-slate-500 dark:text-slate-400">All fields are optional — fill in whichever you have.</p>
      )}
      <div className={compact ? "flex justify-end" : "flex justify-end"}>
        <Button size="sm" variant={compact ? "secondary" : "primary"} onClick={handleAdd} isLoading={addNote.isPending}>
          Add note
        </Button>
      </div>
    </div>
  );
}
