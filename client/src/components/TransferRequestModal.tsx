import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAcceptTransfer } from "@/hooks/use-tickets";
import { User } from "lucide-react";

interface TransferRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: number;
  requestingUser: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  onAccept?: () => void;
  onReject?: () => void;
}

export function TransferRequestModal({
  open,
  onOpenChange,
  ticketId,
  requestingUser,
  onAccept,
  onReject,
}: TransferRequestModalProps) {
  const { mutate: acceptTransfer, isPending } = useAcceptTransfer();

  const handleAccept = () => {
    acceptTransfer(ticketId, {
      onSuccess: () => {
        onOpenChange(false);
        onAccept?.();
      },
    });
  };

  const handleReject = () => {
    onOpenChange(false);
    onReject?.();
  };

  if (!requestingUser) {
    return null;
  }

  const requestingUserName = requestingUser.firstName && requestingUser.lastName
    ? `${requestingUser.firstName} ${requestingUser.lastName}`
    : requestingUser.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Request</DialogTitle>
          <DialogDescription>
            Another admin wants to take over this ticket.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">{requestingUserName}</p>
              <p className="text-sm text-muted-foreground">{requestingUser.email}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Do you want to transfer this ticket to {requestingUserName}?
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleReject}
              disabled={isPending}
            >
              Reject
            </Button>
            <Button
              type="button"
              onClick={handleAccept}
              disabled={isPending}
            >
              {isPending ? "Accepting..." : "Accept"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
