import { z } from "zod";

/**
 * HTML number inputs submit "" when left blank, and `z.coerce.number()` turns "" into 0 — so an
 * empty optional field would save as 0 (or fail a `.min()`). Wrap optional coerced numbers in this
 * so a blank field means "not provided".
 */
export function blankToUndefined<T extends z.ZodType>(schema: T) {
  return z.preprocess((v) => (v === "" || v === null ? undefined : v), schema);
}
