import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";
import path from "path";

// `Express.Request.user` is already declared once, globally, in
// src/types/express.d.ts — no need to redeclare it here.

export function getResourceType(mimetype: string): "image" | "video" | "raw" {
  const imageMimeTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/svg+xml",
  ];

  const videoMimeTypes = [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-msvideo",
  ];

  if (imageMimeTypes.includes(mimetype)) return "image";
  if (videoMimeTypes.includes(mimetype)) return "video";
  return "raw";
}

function getFilenameWithoutExtension(filename: string): string {
  return path.parse(filename).name;
}

// Cloudinary's `format` param is used to pick the file extension it stores
// under. Deriving it from the client-supplied `originalname` (as this used
// to do) means a request can send `mimetype: "application/pdf"` (which
// passes the fileFilter allowlist below) alongside an originalname like
// "payload.svg" and have Cloudinary store/serve it as an SVG — a format
// whose content can carry an executable `<script>` payload. Deriving the
// extension from the already-allowlisted, server-observed MIME type instead
// keeps the stored format consistent with what was actually validated.
const MIME_TO_EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
};

function getFormatFromMimetype(mimetype: string, originalname: string): string {
  return (
    MIME_TO_EXTENSION[mimetype] ??
    path.extname(originalname).substring(1).toLowerCase()
  );
}

/**
 * Sanitizes filename for Cloudinary public_id
 * Cloudinary only allows: alphanumeric, hyphens, underscores, dots, slashes
 * Removes/replaces: spaces, parentheses, ampersands, special chars
 */
function sanitizePublicId(filename: string): string {
  return filename
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[()&\[\]{}|\\:;"'<>?,]/g, "") // Remove special characters
    .replace(/[^\w\-\.]/g, "") // Keep only word chars, hyphens, dots
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 100); // Limit to 100 chars (Cloudinary limit)
}

// ─── existing storages unchanged ─────────────────────────────────────────────

const notesStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const filenameWithoutExt = getFilenameWithoutExtension(file.originalname);
    const sanitizedFilename = sanitizePublicId(filenameWithoutExt);
    return {
      folder: "notes_uploads",
      resource_type: getResourceType(file.mimetype),
      public_id: `${Date.now()}-${sanitizedFilename}`,
      format: getFormatFromMimetype(file.mimetype, file.originalname),
    };
  },
});

const pyqStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const filenameWithoutExt = getFilenameWithoutExtension(file.originalname);
    const sanitizedFilename = sanitizePublicId(filenameWithoutExt);
    return {
      folder: "pyq_uploads",
      resource_type: getResourceType(file.mimetype),
      public_id: `${Date.now()}-${sanitizedFilename}`,
      format: getFormatFromMimetype(file.mimetype, file.originalname),
    };
  },
});

const syllabusStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const filenameWithoutExt = getFilenameWithoutExtension(file.originalname);
    const sanitizedFilename = sanitizePublicId(filenameWithoutExt);
    return {
      folder: "syllabus_uploads",
      resource_type: getResourceType(file.mimetype),
      public_id: `${Date.now()}-${sanitizedFilename}`,
      format: getFormatFromMimetype(file.mimetype, file.originalname),
    };
  },
});

// ─── Profile pic storage ──────────────────────────────────────────────────────

const profilePicStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "profile_pics",
      resource_type: "image",
      // Use userId as public_id so each user always has one file — overwrites on update
      public_id: `user_${req.user?.userId}`,
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
      ],
    };
  },
});

// ─── Post files storage ───────────────────────────────────────────────────────

const postFileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const filenameWithoutExt = getFilenameWithoutExtension(file.originalname);
    const sanitizedFilename = sanitizePublicId(filenameWithoutExt);
    const resourceType = getResourceType(file.mimetype);
    return {
      folder: "post_uploads",
      resource_type: resourceType,
      public_id: `${Date.now()}-${sanitizedFilename}`,
      // Only set format for non-video — videos should keep their original container
      ...(resourceType !== "video" && {
        format: getFormatFromMimetype(file.mimetype, file.originalname),
      }),
    };
  },
});

const MAX_NOTE_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export const uploadNotesMulter = multer({
  storage: notesStorage,
  limits: { fileSize: MAX_NOTE_FILE_SIZE_BYTES },
  fileFilter(req, file, cb) {
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
      "image/bmp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

export const uploadPyqsMulter = multer({
  storage: pyqStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
      "image/bmp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

export const uploadSyllabusMulter = multer({
  storage: syllabusStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
      "image/bmp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

// ─── Profile pic multer ───────────────────────────────────────────────────────

export const uploadProfilePicMulter = multer({
  storage: profilePicStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB — profile pics don't need to be large
  fileFilter(req, file, cb) {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      cb(
        new Error(
          "Only PNG, JPG, JPEG and WEBP images are allowed for profile pictures",
        ),
      );
      return;
    }
    cb(null, true);
  },
});

// ─── Post files multer ────────────────────────────────────────────────────────

export const uploadPostFilesMulter = multer({
  storage: postFileStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB — covers videos
  fileFilter(req, file, cb) {
    const allowed = [
      // Images
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
      // PDFs
      "application/pdf",
      // Videos
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "video/x-msvideo",
    ];
    if (!allowed.includes(file.mimetype)) {
      cb(
        new Error(
          `File type not allowed: ${file.mimetype}. Supported: images, PDFs, videos`,
        ),
      );
      return;
    }
    cb(null, true);
  },
});
