import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { telegramConnectSchema, type TelegramConnectInput } from "@gifftai/shared";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { toast } from "../../../components/ui/Toast";
import { useConnectTelegram } from "../../../features/integrations/api";

export function TelegramConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const connectTelegram = useConnectTelegram();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TelegramConnectInput>({ resolver: zodResolver(telegramConnectSchema) });

  function handleClose() {
    reset();
    onClose();
  }

  const onSubmit = handleSubmit((data) => {
    connectTelegram.mutate(data, {
      onSuccess: (result) => {
        toast.success(result.username ? `Connected to @${result.username}` : "Telegram connected");
        handleClose();
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to connect Telegram"),
    });
  });

  return (
    <Modal open={open} onClose={handleClose} title="Connect Telegram">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Create a bot with{" "}
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 hover:underline dark:text-brand-500"
          >
            @BotFather
          </a>{" "}
          and paste its token below.
        </p>
        <Input label="Bot token" error={errors.botToken?.message} {...register("botToken")} />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={connectTelegram.isPending}>
            Connect
          </Button>
        </div>
      </form>
    </Modal>
  );
}
