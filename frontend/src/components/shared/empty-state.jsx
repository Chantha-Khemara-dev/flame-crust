import { jsx, jsxs } from "react/jsx-runtime";
import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon = PackageOpen,
  title = "Nothing here yet",
  description = "No items to display right now.",
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className || ""}`}>
      <div className="flex items-center justify-center size-16 rounded-full bg-secondary mb-5">
        <Icon className="size-8 text-muted-foreground" />
      </div>
      <h3 className="font-serif text-2xl font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="mt-6 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
