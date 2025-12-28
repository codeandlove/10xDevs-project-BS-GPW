/**
 * NocoDB Proxy Validation Schemas
 * Zod schemas for validating NocoDB API requests
 */

import { z } from "zod";

/**
 * Grid query parameters schema
 */
export const GridQuerySchema = z.object({
  range: z.enum(["week", "month", "quarter"], {
    errorMap: () => ({ message: "range must be one of: week, month, quarter" }),
  }),
  symbols: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const symbolArray = val.split(",");
        return symbolArray.every((s) => s.trim().length > 0 && s.trim().length <= 10);
      },
      { message: "Each symbol must be 1-10 characters" }
    ),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: "Invalid date value" }
    ),
});

/**
 * Event ID path parameter schema
 */
export const EventIdSchema = z.string().startsWith("rec_", "Invalid NocoDB record ID format");

/**
 * Summaries query parameters schema
 */
export const SummariesQuerySchema = z.object({
  symbol: z
    .string()
    .min(1, "Symbol is required")
    .max(10, "Symbol must be 1-10 characters")
    .regex(/^[A-Z0-9]+$/, "Symbol must contain only uppercase letters and numbers"),
  occurrence_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: "Invalid date value" }
    ),
  event_type: z.enum(["BLACK_SWAN_UP", "BLACK_SWAN_DOWN", "VOLATILITY_UP", "VOLATILITY_DOWN", "BIG_MOVE"]).optional(),
});

/**
 * Type exports for use in endpoints
 */
export type GridQueryInput = z.infer<typeof GridQuerySchema>;
export type EventIdInput = z.infer<typeof EventIdSchema>;
export type SummariesQueryInput = z.infer<typeof SummariesQuerySchema>;
