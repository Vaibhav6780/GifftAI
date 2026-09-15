import { useCallback, useState } from "react";
import { MAILBOX_ALL_ADDRESSES } from "@gifftai/shared";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";
import { useComposeMail } from "../../features/mail/api";

function parseAddressList(value: string): string[] {
  return value
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

export function MailComposeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const compose = useComposeMail();
  const [from, setFrom] = useState<string>(MAILBOX_ALL_ADDRESSES[0]);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Every keystroke in the controlled fields below re-renders this component (unlike the
  // other Settings modals, which use react-hook-form's uncontrolled register() and don't
  // re-render on input). A plain function here would get a new identity on every render,
  // and Modal's focus-trap effect depends on [open, onClose] — so it would tear down and
  // re-run on every keystroke, re-focusing the first field in the dialog (the "From"
  // select) mid-typing. useCallback with an empty dep array keeps `onClose` referentially
  // stable across those re-renders so Modal's effect only fires on actual open/close.
  const handleClose = useCallback(() => {
    setFrom(MAILBOX_ALL_ADDRESSES[0]);
    setTo("");
    setCc("");
    setBcc("");
    setSubject("");
    setBody("");
    onClose();
  }, [onClose]);

  function handleSend() {
    const toAddresses = parseAddressList(to);
    if (toAddresses.length === 0) {
      toast.error("Enter at least one recipient");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and message are required");
      return;
    }

    compose.mutate(
      {
        from: from as (typeof MAILBOX_ALL_ADDRESSES)[number],
        to: toAddresses,
        cc: parseAddressList(cc),
        bcc: parseAddressList(bcc),
        subject: subject.trim(),
        body: body.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Email sent");
          handleClose();
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to send"),
      },
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Compose Email" className="max-w-lg">
      <div className="flex flex-col gap-3">
        <Select label="From" value={from} onChange={(e) => setFrom(e.target.value)}>
          {MAILBOX_ALL_ADDRESSES.map((address) => (
            <option key={address} value={address}>
              {address}
            </option>
          ))}
        </Select>
        <Input label="To" placeholder="name@example.com, another@example.com" value={to} onChange={(e) => setTo(e.target.value)} />
        <Input label="Cc" placeholder="Optional" value={cc} onChange={(e) => setCc(e.target.value)} />
        <Input label="Bcc" placeholder="Optional" value={bcc} onChange={(e) => setBcc(e.target.value)} />
        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea label="Message" rows={8} value={body} onChange={(e) => setBody(e.target.value)} />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSend} isLoading={compose.isPending}>
            Send
          </Button>
        </div>
      </div>
    </Modal>
  );
}
