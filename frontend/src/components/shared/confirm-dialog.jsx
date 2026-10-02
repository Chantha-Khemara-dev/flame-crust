import { jsx, jsxs } from "react/jsx-runtime";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConfirmDialog({
  trigger,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  open,
  onOpenChange,
}) {
  const isDestructive = variant === "destructive";

  const content = (
    <AlertDialogContent className="rounded-2xl">
      <AlertDialogHeader>
        <AlertDialogTitle className="font-serif text-xl">{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel className="rounded-full">{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className={cn(
            "rounded-full",
            isDestructive && "bg-destructive text-white hover:bg-destructive/90"
          )}
        >
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );

  if (open !== undefined) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        {content}
      </AlertDialog>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      {content}
    </AlertDialog>
  );
}
