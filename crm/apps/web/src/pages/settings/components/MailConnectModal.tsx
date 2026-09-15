import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mailConnectSchema, type MailConnectInput } from "@gifftai/shared";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { toast } from "../../../components/ui/Toast";
import { useConnectHostingerMail, useTestHostingerMailConnection } from "../../../features/mail/api";

export function MailConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const connect = useConnectHostingerMail();
  const testConnection = useTestHostingerMailConnection();
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<MailConnectInput>({ resolver: zodResolver(mailConnectSchema) });

  function handleClose() {
    reset();
    onClose();
  }

  function handleTestConnection() {
    const { apiToken, smtpPassword } = getValues();
    if (!apiToken || !smtpPassword) {
      toast.error("Enter both the API token and the SMTP password first");
      return;
    }
    testConnection.mutate(
      { apiToken, smtpPassword },
      {
        onSuccess: (account) => toast.success(`Verified ${account.mailboxAddress}`),
        onError: (error) => toast.error(error instanceof Error ? error.message : "Connection test failed"),
      },
    );
  }

  const onSubmit = handleSubmit((data) => {
    connect.mutate(data, {
      onSuccess: () => {
        toast.success("Hostinger Mail connected");
        handleClose();
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to connect Hostinger Mail"),
    });
  });

  return (
    <Modal open={open} onClose={handleClose} title="Connect Hostinger Mail">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Create an API token in hPanel under Agentic Mail → API access (scope it to support@gifftai.com, with SMTP/IMAP and
          webhook-management permissions), then enter it here along with the mailbox's SMTP password.
        </p>
        <Input label="Hostinger Mail API token" type="password" error={errors.apiToken?.message} {...register("apiToken")} />
        <Input label="SMTP password (support@gifftai.com)" type="password" error={errors.smtpPassword?.message} {...register("smtpPassword")} />

        <div className="flex justify-start">
          <Button type="button" variant="secondary" size="sm" onClick={handleTestConnection} isLoading={testConnection.isPending}>
            Test Connection
          </Button>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={connect.isPending}>
            Connect
          </Button>
        </div>
      </form>
    </Modal>
  );
}
