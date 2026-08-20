import { z } from "zod";

export const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const objectIdSchema = z
  .string()
  .regex(OBJECT_ID_REGEX, { message: "Invalid ID format" });

/**
 * Validates a route's `:id` param. Shared by every resource's own
 * edit/delete routes (notes/pyqs/syllabus) instead of each re-declaring the
 * same regex — the admin/mod routes have their own differently-named param
 * schemas (e.g. `noteId`) since they mount at a different path shape.
 */
export const idParamSchema = z.object({
  id: objectIdSchema,
});
