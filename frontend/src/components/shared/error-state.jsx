import { jsx, jsxs } from "react/jsx-runtime";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  error,
  onRetry,
  onCleanReload,
  className,
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className || ""}`}>
      <div className="flex items-center justify-center size-16 rounded-full bg-destructive/10 mb-5">
        <AlertCircle className="size-8 text-destructive" />
      </div>
      <h3 className="font-serif text-2xl font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">{description}</p>
      {error && (
        <div className="mt-3 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-mono text-destructive max-w-md break-all">
          {error.message || String(error)}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        {onRetry && (
          <Button
            onClick={onRetry}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 cursor-pointer"
          >
            Try again
          </Button>
        )}
        {onCleanReload && (
          <Button
            variant="outline"
            onClick={onCleanReload}
            className="rounded-full h-11 px-6 border-border cursor-pointer"
          >
            Clean Refresh
          </Button>
        )}
      </div>
    </div>
  );
}
