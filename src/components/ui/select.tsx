import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface SelectContextValue {
  value: string;
  onValueChange: (val: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  labelMap: Map<string, React.ReactNode>;
  registerLabel: (val: string, label: React.ReactNode) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

export function Select({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
}) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const [labelMap] = React.useState(() => new Map<string, React.ReactNode>());
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;

  const registerLabel = React.useCallback(
    (val: string, label: React.ReactNode) => {
      if (labelMap.get(val) !== label) {
        labelMap.set(val, label);
        forceUpdate();
      }
    },
    [labelMap]
  );

  const handleValueChange = React.useCallback(
    (val: string) => {
      if (controlledValue === undefined) {
        setUncontrolledValue(val);
      }
      onValueChange?.(val);
      setOpen(false);
    },
    [controlledValue, onValueChange]
  );

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange: handleValueChange,
        open,
        setOpen,
        labelMap,
        registerLabel,
      }}
    >
      <div ref={containerRef} className="relative inline-block w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error("SelectTrigger must be inside Select");

  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      className={cn(
        "flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-xs transition-colors hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", ctx.open && "rotate-180")} />
    </button>
  );
}

export function SelectValue({ placeholder = "Velg..." }: { placeholder?: string }) {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error("SelectValue must be inside Select");

  const display = ctx.labelMap.get(ctx.value) || ctx.value || placeholder;
  return <span className={cn("truncate", !ctx.value && "text-slate-400")}>{display}</span>;
}

export function SelectContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error("SelectContent must be inside Select");

  if (!ctx.open) return null;

  return (
    <div
      className={cn(
        "absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-60 overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in-80",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SelectItem({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  key?: React.Key;
}) {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error("SelectItem must be inside Select");

  React.useEffect(() => {
    ctx.registerLabel(value, children);
  }, [value, children, ctx]);

  const isSelected = ctx.value === value;

  return (
    <div
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-xl py-2 pl-3 pr-8 text-sm text-slate-800 outline-none transition-colors hover:bg-indigo-50 hover:text-indigo-950",
        isSelected && "bg-indigo-50/80 font-semibold text-indigo-900",
        className
      )}
    >
      <span className="truncate">{children}</span>
      {isSelected && (
        <span className="absolute right-3 flex items-center justify-center text-indigo-700">
          <Check className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}
