import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique ID
 * Uses crypto.randomUUID() if available, otherwise falls back to a custom implementation
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: timestamp + random string
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone an object
 * Uses structuredClone if available, otherwise falls back to JSON parse/stringify
 */
export function deepClone<T>(obj: T): T {
  if (typeof structuredClone !== 'undefined') {
    return structuredClone(obj);
  }

  // Fallback for older browsers
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generate a unique label by appending a number if the base label already exists
 */
export function generateUniqueLabel(baseLabel: string, existingLabels: string[]): string {
  if (!existingLabels.includes(baseLabel)) {
    return baseLabel;
  }

  let counter = 2;
  let newLabel = `${baseLabel} ${counter}`;
  while (existingLabels.includes(newLabel)) {
    counter++;
    newLabel = `${baseLabel} ${counter}`;
  }
  return newLabel;
}
