import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value: Date | string, timeZone = "Asia/Jakarta") {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

export function toWibDate(value: Date | string) {
  return formatDateTime(value, "Asia/Jakarta");
}

export function isValidPin(pin: string) {
  return /^\d{4,6}$/.test(pin);
}

export function isValidUsername(username: string) {
  return /^[a-zA-Z0-9_]{3,30}$/.test(username);
}

export function safeParseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
