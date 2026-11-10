import part1 from "./en-1.json";
import part2 from "./en-2.json";
import part3 from "./en-3.json";
import part4 from "./en-4.json";
import part5 from "./en-5.json";
import part6 from "./en-6.json";

/**
 * English texts, keyed by the Vietnamese original (see lib/i18n.ts). Split in files only to keep each one readable.
 * Later files win when a key is repeated.
 */
export const EN: Record<string, string> = { ...part1, ...part2, ...part3, ...part4, ...part5, ...part6 };
