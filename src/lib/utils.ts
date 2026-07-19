import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn/ui's standard class-merge helper.
 * `cn("px-2", condition && "px-4")` → later Tailwind classes win via tailwind-merge.
 * Every component in this design system composes classes through `cn`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
