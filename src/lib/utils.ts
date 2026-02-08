import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-") // Replace multiple - with single -
}

export const SPICE_LEVELS = {
  GERMAN: [
    "No spicy",
    "Normal",
    "Medium",
    "Spicy",
    "Very Spicy",
  ],
  INDIAN: [
    "No spicy",
    "Normal",
    "Medium",
    "Spicy",
    "Very Spicy",
  ],
} as const

export const DESSERT_KEYWORDS = [
  "DESSERT",
  "NACHSPEISE",
  "SWEET",
  "SÜSS",
  "KUCHEN",
  "EISSPEZIALITÄTEN",
  "ICECREAM",
]

export const DRINK_KEYWORDS = [
  "GETRÄNKE",
  "ALKOHOLFREIE GETRÄNKE",
  "BIERE",
  "WEINE",
  "SPIRITUOSEN",
  "APERITIF",
  "LONGDRINKS",
  "WARME GETRÄNKE",
  "SEKT",
  "DRINKS",
  "BEVERAGES",
  "BEER",
  "WINE",
  "SOFT DRINKS",
  "JUICE",
  "COFFEE",
  "TEA",
]
