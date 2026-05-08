import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";

export function requiredTrimmedString(message: string) {
  return z.string().trim().min(1, message);
}

export function optionalTrimmedString() {
  return z.string().optional();
}

export function optionalEmailString(message: string) {
  return z
    .string()
    .trim()
    .refine((v) => v === "" || z.string().email().safeParse(v).success, message);
}

export function toNullIfBlank(value?: string | null) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function clearErrorsOnDialogClose<T extends Record<string, unknown>>(
  next: boolean,
  setOpen: (open: boolean) => void,
  form: UseFormReturn<T>,
) {
  setOpen(next);
  if (!next) form.clearErrors();
}
