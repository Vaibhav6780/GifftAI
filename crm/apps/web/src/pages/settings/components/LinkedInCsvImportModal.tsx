import { useState } from "react";
import type { LinkedInImportResult } from "@gifftai/shared";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { toast } from "../../../components/ui/Toast";
import { useImportLinkedInCsv } from "../../../features/integrations/api";

export function LinkedInCsvImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const importCsv = useImportLinkedInCsv();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<LinkedInImportResult | null>(null);

  function handleClose() {
    setFile(null);
    setResult(null);
    onClose();
  }

  function handleImport() {
    if (!file) return;
    importCsv.mutate(file, {
      onSuccess: (data) => {
        setResult(data);
        toast.success(`Imported ${data.imported} new lead${data.imported === 1 ? "" : "s"} (${data.updated} updated)`);
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to import CSV"),
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import LinkedIn Lead Gen Form CSV">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          LinkedIn's Lead Sync API requires Marketing Partner Program approval most teams can't get — export a CSV
          from LinkedIn Campaign Manager's Lead Gen Forms instead and upload it here.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
          }}
          className="text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:text-slate-200 dark:file:bg-slate-800"
        />

        {result && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
            <p className="text-slate-700 dark:text-slate-200">
              Imported: {result.imported} · Updated: {result.updated} · Skipped: {result.skipped}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-red-600 dark:text-red-400">
                {result.errors.slice(0, 5).map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Close
          </Button>
          <Button type="button" onClick={handleImport} isLoading={importCsv.isPending} disabled={!file}>
            Import
          </Button>
        </div>
      </div>
    </Modal>
  );
}
