import { useRef, useState } from "react";
import { FileText, Paperclip, Trash2 } from "lucide-react";
import type { TicketAttachment } from "@gifftai/shared";
import { useDeleteTicketAttachment, useTicketAttachments, useUploadTicketAttachments } from "../api";
import { useHasPermission } from "../../../hooks/usePermission";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Spinner } from "../../../components/ui/Spinner";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { toast } from "../../../components/ui/Toast";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TicketAttachments({ ticketId }: { ticketId: string }) {
  const canManage = useHasPermission("tickets:update");
  const { data: attachments, isLoading } = useTicketAttachments(ticketId);
  const uploadAttachments = useUploadTicketAttachments(ticketId);
  const deleteAttachment = useDeleteTicketAttachment(ticketId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    uploadAttachments.mutate(Array.from(fileList), {
      onSuccess: (uploaded) => toast.success(`Uploaded ${uploaded.length} file${uploaded.length === 1 ? "" : "s"}`),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to upload attachment"),
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    deleteAttachment.mutate(pendingDeleteId, {
      onSuccess: () => {
        toast.success("Attachment removed");
        setPendingDeleteId(null);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to remove attachment");
        setPendingDeleteId(null);
      },
    });
  }

  return (
    <Card className="max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Attachments</h2>
        {canManage && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.txt"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={uploadAttachments.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={14} /> Add file
            </Button>
          </>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : attachments?.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No attachments yet — PDFs, images, and documents show up here.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attachments?.map((attachment: TicketAttachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
            >
              <FileText size={18} className="shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <a
                  href={attachment.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm font-medium text-brand-600 hover:underline dark:text-brand-500"
                >
                  {attachment.fileName}
                </a>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatFileSize(attachment.size)} · {attachment.uploadedByName} ·{" "}
                  {new Date(attachment.createdAt).toLocaleDateString()}
                </p>
              </div>
              {canManage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingDeleteId(attachment.id)}
                  aria-label={`Remove ${attachment.fileName}`}
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Remove attachment"
        description="Are you sure you want to remove this attachment? This cannot be undone."
        confirmLabel="Remove"
        isLoading={deleteAttachment.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </Card>
  );
}
