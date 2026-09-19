import * as React from "react";
import { cn } from "@/src/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
  children?: React.ReactNode;
  className?: string;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-indigo-700 text-white shadow-xs hover:bg-indigo-800",
    secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200",
    destructive: "border-transparent bg-rose-600 text-white shadow-xs hover:bg-rose-700",
    outline: "border-slate-300 text-slate-800 bg-white",
    success: "border-transparent bg-emerald-600 text-white shadow-xs hover:bg-emerald-700",
    warning: "border-transparent bg-amber-500 text-white shadow-xs hover:bg-amber-600",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors select-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
