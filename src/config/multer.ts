import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";
import path from "path";

function getResourceType(mimetype: string): "image" | "video" | "raw" {
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

// ─── existing storages unchanged ─────────────────────────────────────────────

const notesStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const filenameWithoutExt = getFilenameWithoutExtension(file.originalname);
    return {
      folder: "notes_uploads",
      resource_type: getResourceType(file.mimetype),
      public_id: `${Date.now()}-${filenameWithoutExt}`,
      format: path.extname(file.originalname).substring(1),
    };
  },
});

const pyqStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const filenameWithoutExt = getFilenameWithoutExtension(file.originalname);
    return {
      folder: "pyq_uploads",
      resource_type: getResourceType(file.mimetype),
      public_id: `${Date.now()}-${filenameWithoutExt}`,
      format: path.extname(file.originalname).substring(1),
    };
  },
});

const syllabusStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const filenameWithoutExt = getFilenameWithoutExtension(file.originalname);
    return {
      folder: "syllabus_uploads",
      resource_type: getResourceType(file.mimetype),
      public_id: `${Date.now()}-${filenameWithoutExt}`,
      format: path.extname(file.originalname).substring(1),
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
      public_id: `user_${(req as any).user.userId}`,
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
    const resourceType = getResourceType(file.mimetype);
    return {
      folder: "post_uploads",
      resource_type: resourceType,
      public_id: `${Date.now()}-${filenameWithoutExt}`,
      // Only set format for non-video — videos should keep their original container
      ...(resourceType !== "video" && {
        format: path.extname(file.originalname).substring(1),
      }),
    };
  },
});

// ─── existing multer instances unchanged ─────────────────────────────────────

export const uploadNotesMulter = multer({
  storage: notesStorage,
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
