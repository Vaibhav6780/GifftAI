import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { whatsappConnectSchema, type WhatsappConnectInput } from "@gifftai/shared";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { toast } from "../../../components/ui/Toast";
import { useConnectWhatsapp, useTestWhatsappConnection } from "../../../features/integrations/api";

export function WhatsAppConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const connectWhatsapp = useConnectWhatsapp();
  const testConnection = useTestWhatsappConnection();
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<WhatsappConnectInput>({ resolver: zodResolver(whatsappConnectSchema) });

  function handleClose() {
    reset();
    onClose();
  }

  function handleTestConnection() {
    const { apiKey, apiSecret } = getValues();
    if (!apiKey || !apiSecret) {
      toast.error("Enter both the API Key and API Secret first");
      return;
    }
    testConnection.mutate(
      { apiKey, apiSecret },
      {
        onSuccess: (account) => toast.success(`Connected to ${account.channelName} (${account.phoneNumber})`),
        onError: (error) => toast.error(error instanceof Error ? error.message : "Connection test failed"),
      },
    );
  }

  const onSubmit = handleSubmit((data) => {
    connectWhatsapp.mutate(data, {
      onSuccess: () => {
        toast.success("WhatsApp connected");
        handleClose();
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to connect WhatsApp"),
    });
  });

  return (
    <Modal open={open} onClose={handleClose} title="Connect WhatsApp">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enter the API Key and API Secret from your WaHamster account (see LEAD_INGESTION.md).
        </p>
        <Input label="API Key" type="password" error={errors.apiKey?.message} {...register("apiKey")} />
        <Input label="API Secret" type="password" error={errors.apiSecret?.message} {...register("apiSecret")} />

        <div className="flex justify-start">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleTestConnection}
            isLoading={testConnection.isPending}
          >
            Test Connection
          </Button>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={connectWhatsapp.isPending}>
            Connect
          </Button>
        </div>
      </form>
    </Modal>
  );
}
