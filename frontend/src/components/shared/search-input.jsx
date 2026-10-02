import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
}) {
  const [internalValue, setInternalValue] = useState("");
  const searchValue = value ?? internalValue;
  const handleChange = onChange ?? setInternalValue;

  return (
    <div className={cn("relative group", className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70 group-focus-within:text-primary transition-colors duration-300 pointer-events-none" />
      <Input
        type="text"
        value={searchValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 sm:h-12 pl-10 pr-10 rounded-full border-none bg-card text-xs sm:text-sm shadow-[0_4px_20px_rgb(0,0,0,0.04)] ring-1 ring-border/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:shadow-[0_4px_20px_rgba(227,52,47,0.08)] transition-all duration-300 placeholder:text-muted-foreground/60"
      />
      {searchValue && (
        <button
          onClick={() => handleChange("")}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all active:scale-95"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
