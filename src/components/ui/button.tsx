import type { ButtonHTMLAttributes } from "react";

export type AllMeButtonVariant =
  | "destructive"
  | "ghost"
  | "outline"
  | "primary"
  | "segmented"
  | "secondary";

type AllMeButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  fullWidth?: boolean;
  variant?: AllMeButtonVariant;
};

export function Button({
  active = false,
  className,
  fullWidth = false,
  type = "button",
  variant = "secondary",
  ...props
}: AllMeButtonProps) {
  return (
    <button
      className={allMeButtonClassName({
        active,
        className,
        fullWidth,
        variant,
      })}
      type={type}
      {...props}
    />
  );
}

export function allMeButtonClassName({
  active = false,
  className,
  fullWidth = false,
  variant = "secondary",
}: {
  active?: boolean;
  className?: string;
  fullWidth?: boolean;
  variant?: AllMeButtonVariant;
} = {}) {
  return [
    "inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-xl px-3 text-xs font-semibold transition",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
    "disabled:cursor-not-allowed disabled:opacity-55",
    fullWidth ? "w-full" : null,
    getButtonVariantClassName(variant, active),
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

function getButtonVariantClassName(
  variant: AllMeButtonVariant,
  active: boolean,
) {
  if (variant === "segmented") {
    return active
      ? "border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent-soft)]"
      : "border border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--empty)] hover:text-[var(--foreground)]";
  }

  return buttonVariantClassNames[variant];
}

const buttonVariantClassNames: Record<
  Exclude<AllMeButtonVariant, "segmented">,
  string
> = {
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
