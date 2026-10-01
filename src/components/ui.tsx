import type { ButtonHTMLAttributes, ReactNode, TextareaHTMLAttributes, InputHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const buttonClass = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-[transform,background-color,opacity] duration-150 ease-out active:opacity-90 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      tone: {
        primary: "bg-pine text-paper hover:opacity-90",
        quiet: "bg-card text-ink shadow-line hover:bg-paper-2",
        pine: "bg-pine text-paper hover:opacity-90",
        paper: "bg-paper text-ink hover:bg-card",
      },
    },
    defaultVariants: { tone: "primary" },
  },
);

export function Button({
  tone,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonClass>) {
  return <button type={type} className={cn(buttonClass({ tone }), className)} {...props} />;
}

export const fieldClass =
  "h-11 w-full rounded-lg border border-line bg-card px-3 text-base text-ink outline-none placeholder:text-muted focus-visible:border-pine";

export const areaClass =
  "min-h-40 w-full rounded-lg border border-line bg-card px-3 py-3 text-base text-ink outline-none placeholder:text-muted focus-visible:border-pine";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClass, props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(areaClass, props.className)} />;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-sm text-muted">{hint}</span> : null}
    </label>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-paper-2", className)} />;
}
