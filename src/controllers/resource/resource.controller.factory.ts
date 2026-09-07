import { Request, Response } from "express";
import { User } from "../../models/users/user.model.js";
import { BaseResourceFields } from "../../models/resource/resourceSchema.js";
import * as resourceService from "../../services/resource/resource.service.js";
import { ResourceConfig } from "../../services/resource/resource.service.js";
import { AppError } from "../../utils/errors/AppError.js";
import {
  contentApprovalMail,
  contentRejectionMail,
} from "../../utils/email.js";

export interface ResourceControllerConfig<TDoc extends BaseResourceFields>
  extends ResourceConfig<TDoc> {
  /** The `:xId` route param name admin/mod management routes use for this
   * resource (e.g. "noteId") — distinct from the owner-facing routes,
   * which always use `:id`. */
  managementIdParam: string;
}

async function getUploader(userId: string) {
  const user = await User.findById(userId).select("email name").lean();
  return user ? { email: user.email, name: user.name } : null;
}

function firstDefinedString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Builds the full set of Express handlers for one resource (notes, pyqs, or
 * syllabus) — user-facing CRUD, admin management, and mod moderation — from
 * one config object. Every handler here used to be a hand-copied file per
 * resource; this is the single implementation they now share. Response
 * envelopes match what each endpoint already returns exactly (see
 * `config.responseKeys`), so callers of the API see no difference.
 */
export function createResourceControllers<TDoc extends BaseResourceFields>(
  config: ResourceControllerConfig<TDoc>,
) {
  const fetchAll = async (req: Request, res: Response) => {
    const requestedLimit = parseInt((req.query.limit as string) ?? "10", 10);
    const limit = Number.isNaN(requestedLimit) ? 10 : requestedLimit;
    const docs = await resourceService.listApproved(config, limit);
    res.status(200).json({
      success: true,
      [config.responseKeys.publicList]: docs,
      count: docs.length,
    });
  };

  /**
   * Paginated, filtered browse. Kept separate from `fetchAll` (the flat
   * top-N above) so existing callers of that endpoint keep their response
   * shape unchanged.
   */
  const browse = async (req: Request, res: Response) => {
    const num = (v: unknown) => {
      const n = parseInt(String(v ?? ""), 10);
      return Number.isNaN(n) ? undefined : n;
    };
    const str = (v: unknown) =>
      typeof v === "string" && v.trim() ? v.trim() : undefined;

    const result = await resourceService.listPublic(config, {
      page: num(req.query.page),
      limit: num(req.query.limit),
      program: str(req.query.program),
      school: str(req.query.school),
      semester: str(req.query.semester),
      year: str(req.query.year),
      courseCode: str(req.query.courseCode),
      query: str(req.query.query) ?? str(req.query.q),
    });

    res.status(200).json({
      success: true,
      data: {
        [config.responseKeys.publicList]: result.docs,
        pagination: result.pagination,
      },
    });
  };

  const filterOptions = async (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: await resourceService.listFilterOptions(config),
    });
  };

  const search = async (req: Request, res: Response) => {
    const { query, program, courseCode, semester, year } = req.query;
    if (query !== undefined && typeof query !== "string") {
      throw new AppError("Query parameter must be a string", 400);
    }

    const docs = await resourceService.search(config, {
      query: firstDefinedString(query),
      program: firstDefinedString(program),
      courseCode: firstDefinedString(courseCode),
      semester: firstDefinedString(semester),
      year: firstDefinedString(year),
    });

    res.status(200).json({
      success: true,
      [config.responseKeys.publicList]: docs,
      count: docs.length,
    });
  };

  const fetchMine = async (req: Request, res: Response) => {
    const docs = await resourceService.listForUser(config, req.user!.userId);
    res.status(200).json({
      success: true,
      [config.responseKeys.myList]: docs,
    });
  };

  const upload = async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError("File is required", 400);
    }
    const doc = await resourceService.create(config, {
      body: req.body,
      file: req.file,
      userId: req.user!.userId,
    });
    res.status(201).json({
      success: true,
      message: `${config.displayName} uploaded successfully`,
      [config.responseKeys.singular]: doc,
    });
  };

  const edit = async (req: Request, res: Response) => {
    // The route's validation schema is `updateXSchema.merge(idParamSchema)`
    // (so the `:id` param's format gets checked too), which means `id` ends
    // up as a key on the validated req.body alongside the real update
    // fields. It must NOT reach Object.assign(doc, body) in the service —
    // mongoose documents have a virtual `id` getter tied to `_id`, and
    // assigning to it is not a field update this endpoint should perform.
    const { id: _id, ...body } = req.body as Record<string, unknown>;
    const doc = await resourceService.update(config, {
      id: req.params.id,
      userId: req.user!.userId,
      body,
      file: req.file,
    });
    res.status(200).json({
      success: true,
      message: `${config.displayName} updated successfully`,
      [config.responseKeys.singular]: doc,
    });
  };

  const remove = async (req: Request, res: Response) => {
    await resourceService.remove(config, {
      id: req.params.id,
      userId: req.user!.userId,
    });
    res.status(200).json({
      success: true,
      message: `${config.displayName} deleted successfully`,
    });
  };

  // ── Admin ──────────────────────────────────────────────────────────────

  const fetchApprovedAdmin = async (_req: Request, res: Response) => {
    const docs = await resourceService.listApprovedAdmin(config);
    res.status(200).json({
      success: true,
      [config.responseKeys.adminList]: docs,
    });
  };

  const removeAdmin = async (req: Request, res: Response) => {
    const id = req.params[config.managementIdParam];
    await resourceService.removeAdmin(config, id);
    res.status(200).json({
      success: true,
      message: `${config.displayName} deleted successfully`,
    });
  };

  // ── Moderation ─────────────────────────────────────────────────────────

  const fetchPending = async (_req: Request, res: Response) => {
    const docs = await resourceService.listPending(config);
    res.status(200).json({
      success: true,
      [config.responseKeys.modList]: docs,
    });
  };

  const approve = async (req: Request, res: Response) => {
    const id = req.params[config.managementIdParam];
    const uploader = await resourceService.approve(config, {
      id,
      approverId: req.user!.userId,
      getUploader,
    });

    // Fire-and-forget — the moderation action already succeeded; a slow or
    // failed email shouldn't hold up (or fail) the response.
    contentApprovalMail(uploader.email, uploader.name, config.emailContentType)
      .then((result) => {
        if (!result.success) {
          console.error("Failed to send approval email:", result.error);
        }
      })
      .catch((err) => console.error("Failed to send approval email:", err));

    res.status(200).json({
      success: true,
      message: `${config.displayName} approved successfully`,
    });
  };

  const reject = async (req: Request, res: Response) => {
    const id = req.params[config.managementIdParam];
    const { rejectionReason } = req.body;
    const uploader = await resourceService.reject(config, {
      id,
      rejecterId: req.user!.userId,
      rejectionReason,
      getUploader,
    });

    contentRejectionMail(
      uploader.email,
      uploader.name,
      config.emailContentType,
      rejectionReason,
    )
      .then((result) => {
        if (!result.success) {
          console.error("Failed to send rejection email:", result.error);
        }
      })
      .catch((err) => console.error("Failed to send rejection email:", err));

    res.status(200).json({
      success: true,
      message: `${config.displayName} rejected successfully`,
    });
  };

  return {
    fetchAll,
    browse,
    filterOptions,
    search,
    fetchMine,
    upload,
    edit,
    remove,
    fetchApprovedAdmin,
    removeAdmin,
    fetchPending,
    approve,
    reject,
  };
}
