/**
 * NocoDB Proxy Validation Schemas
 * Zod schemas for validating NocoDB API requests
 */

import { z } from "zod";

/**
 * Grid query parameters schema
 * Supports 3 modes:
 * 1. Explicit dates: start_date + end_date
 * 2. Range with anchor: range + end_date
 * 3. Range only: range
 */
export const GridQuerySchema = z
  .object({
    // Date range params (flexible)
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        { message: "Invalid start_date value" }
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
        { message: "Invalid end_date value" }
      ),

    // Range param (preserved for presets and legacy)
    range: z
      .enum(["week", "month", "quarter"], {
        errorMap: () => ({ message: "range must be one of: week, month, quarter" }),
      })
      .optional(),

    // Symbols filter
    symbols: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return val;
        // Strip trailing comma and filter empty entries
        return val
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .join(",");
      })
      .refine(
        (val) => {
          if (!val) return true;
          const symbolArray = val.split(",");
          if (symbolArray.length > 200) return false;
          return symbolArray.every((s) => s.length > 0 && s.length <= 10);
        },
        { message: "Max 200 symbols, each 1-10 characters" }
      ),
  })
  .refine(
    (data) => {
      // Must have at least ONE of:
      // 1. Both start_date + end_date
      // 2. range (with optional end_date)
      const hasExplicitRange = data.start_date && data.end_date;
      const hasRange = data.range;
      return hasExplicitRange || hasRange;
    },
    { message: "Must provide either (start_date + end_date) OR range" }
  )
  .refine(
    (data) => {
      // If both start_date and end_date provided, validate order
      if (data.start_date && data.end_date) {
        return new Date(data.start_date) < new Date(data.end_date);
      }
      return true;
    },
    { message: "start_date must be before end_date" }
  )
  .refine(
    (data) => {
      // If start_date provided without end_date (invalid)
      if (data.start_date && !data.end_date) {
        return false;
      }
      // If end_date provided without start_date, range must be present
      if (data.end_date && !data.start_date) {
        return !!data.range;
      }
      return true;
    },
    { message: "start_date requires end_date, or use range with optional end_date" }
  );

/**
 * Event ID path parameter schema
 * NocoDB może używać różnych formatów ID: liczby, UUID, rec_xxx, etc.
 */
export const EventIdSchema = z
  .string()
  .min(1, "Event ID is required")
  .refine(
    (val) => {
      return val.length > 0 && val.length < 100;
    },
    { message: "Invalid event ID format" }
  );

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
