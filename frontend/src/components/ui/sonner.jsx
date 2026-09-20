"use client";
import { useTheme } from "@/components/theme-provider.jsx";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      duration={4000}
      visibleToasts={3}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card/95 group-[.toaster]:text-card-foreground group-[.toaster]:border-border/80 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:p-3 sm:group-[.toaster]:p-3.5 group-[.toaster]:pr-10 sm:group-[.toaster]:pr-10 group-[.toaster]:font-sans group-[.toaster]:backdrop-blur-xl transition-all group-[.toaster]:w-full sm:group-[.toaster]:w-auto group-[.toaster]:min-w-[240px] group-[.toaster]:max-w-[420px]",
          title: "font-semibold text-xs sm:text-sm leading-snug tracking-tight",
          description: "group-[.toast]:text-muted-foreground text-[11px] sm:text-xs mt-0.5 leading-normal",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-xl group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:font-medium",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-xl group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

