import { NextFunction, Request, RequestHandler, Response } from "express";
import { notesControllers } from "../notes-controllers/notes.config.js";
import { pyqsControllers } from "../pyqs-controllers/pyqs.config.js";
import { syllabusControllers } from "../syllabus-controllers/syllabus.config.js";
import { AppError } from "../../utils/errors/AppError.js";

/**
 * Admin content management, across every resource type.
 *
 * Notes, PYQs and syllabus already share one controller factory, so the
 * admin console gets one parameterised route set (`/admin/content/:type/...`)
 * rather than three near-identical copies. Adding a fourth resource type
 * later is a single entry in the map below — no new routes, no new
 * controllers, no new frontend calls.
 */

const RESOURCES = {
  notes: notesControllers,
  pyqs: pyqsControllers,
  syllabus: syllabusControllers,
} as const;

export type ContentType = keyof typeof RESOURCES;

export const CONTENT_TYPES = Object.keys(RESOURCES) as ContentType[];

/**
 * Resolves `:type` to that resource's controllers and delegates.
 *
 * An unknown type is a 400 rather than a 404: the URL shape is right, the
 * caller just named something this API doesn't have.
 */
function forType(
  pick: (controllers: (typeof RESOURCES)[ContentType]) => RequestHandler,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const controllers = RESOURCES[req.params.type as ContentType];

    if (!controllers) {
      return next(
        new AppError(
          `Unknown content type "${req.params.type}". Expected one of: ${CONTENT_TYPES.join(", ")}.`,
          400,
        ),
      );
    }

    return pick(controllers)(req, res, next);
  };
}

/** Paginated list, filterable by status — pending, approved or rejected. */
export const listContent = forType((c) => c.adminList);

/** Per-status totals for the console's tab badges. */
export const contentCounts = forType((c) => c.adminCounts);

/** Publish a pending upload. Emails the uploader. */
export const approveContent = forType((c) => c.approve);

/** Decline a pending upload with a reason. Emails the uploader. */
export const rejectContent = forType((c) => c.reject);

/**
 * Remove a resource entirely — the database row and the Cloudinary asset,
 * and it reverses the uploader's contribution credit if it was approved.
 * Unlike approve/reject this applies at any status, because an admin
 * removing already-published material is the main reason this exists.
 */
export const deleteContent = forType((c) => c.removeAdmin);
