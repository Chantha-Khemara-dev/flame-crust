import { jsx, jsxs } from "react/jsx-runtime";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function FormField({
  label,
  name,
  register,
  errors,
  type = "text",
  placeholder,
  className,
  required,
  ...props
}) {
  const error = errors?.[name];
  const registration = register ? register(name, { required }) : {};

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={name} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        {...registration}
        {...props}
        className={cn(
          "rounded-xl border-border/60",
          error && "border-destructive focus-visible:ring-destructive"
        )}
      />
      {error && (
        <p className="text-xs text-destructive font-medium">
          {error.message || "This field is required"}
        </p>
      )}
    </div>
  );
}
