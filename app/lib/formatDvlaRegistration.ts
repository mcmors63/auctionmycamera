// app/lib/formatDvlaRegistration.ts

import { formatUkRegistration } from "./formatUkRegistration";

/**
 * Backwards-compatible wrapper.
 * All legacy calls to formatDvlaRegistration now use the smarter
 * formatUkRegistration logic under the hood.
 */
export function formatDvlaRegistration(input: string): string {
  return formatUkRegistration(input);
}
