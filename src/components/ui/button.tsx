import type { ButtonHTMLAttributes } from "react";

export type AllMeButtonVariant =
  | "destructive"
  | "ghost"
  | "outline"
  | "primary"
  | "secondary";

type AllMeButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  fullWidth?: boolean;
  variant?: AllMeButtonVariant;
};

export function Button({
  className,
  fullWidth = false,
  type = "button",
  variant = "secondary",
  ...props
}: AllMeButtonProps) {
  return (
    <button
      className={allMeButtonClassName({ className, fullWidth, variant })}
      type={type}
      {...props}
    />
  );
}

export function allMeButtonClassName({
  className,
  fullWidth = false,
  variant = "secondary",
}: {
  className?: string;
  fullWidth?: boolean;
  variant?: AllMeButtonVariant;
} = {}) {
  return [
    "inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-xl px-3 text-xs font-semibold transition",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
    "disabled:cursor-not-allowed disabled:opacity-55",
    fullWidth ? "w-full" : null,
    buttonVariantClassNames[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

const buttonVariantClassNames: Record<AllMeButtonVariant, string> = {
  destructive:
    "border border-[var(--danger)]/45 bg-transparent text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--danger)]/10",
  ghost:
    "border border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--empty)] hover:text-[var(--foreground)]",
  outline:
    "border border-[var(--accent)] bg-transparent text-[var(--accent)] hover:bg-[var(--accent)]/10",
  primary:
    "border border-[var(--accent)] bg-[var(--accent)] text-[var(--background)] hover:bg-[var(--accent-strong)]",
  secondary:
    "border border-[var(--line)] bg-[var(--input)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
};
