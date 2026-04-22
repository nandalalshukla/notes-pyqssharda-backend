import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";
import path from "path";

/**
 * Helper function to determine the correct Cloudinary resource type
 * Images: resource_type = 'image'
 * Videos: resource_type = 'video'
 * PDFs, DOCs, PPTs: resource_type = 'raw' (for proper viewing and download)
 */
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
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-ms-wmv",
    "video/3gpp",
    "video/3gpp2",
  ];

  // Images use 'image' type
  if (imageMimeTypes.includes(mimetype)) {
    return "image";
  }

  // Videos use 'video' type
  if (videoMimeTypes.includes(mimetype)) {
    return "video";
  }

  // PDFs, DOCs, and PPTs must use 'raw' type
  return "raw";
}

/**
 * Helper function to get media type from MIME type
 * Used for storing media type in database
 */
function getMediaType(mimetype: string): "image" | "video" {
  const imageMimeTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/svg+xml",
  ];

  return imageMimeTypes.includes(mimetype) ? "image" : "video";
}

/**
 * Helper function to get filename without extension
 * This prevents double extensions (e.g., file.pdf.pdf)
 */
function getFilenameWithoutExtension(filename: string): string {
  return path.parse(filename).name;
}

const notesStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const filenameWithoutExt = getFilenameWithoutExtension(file.originalname);
    return {
      folder: "notes_uploads",
      resource_type: getResourceType(file.mimetype),
      public_id: `${Date.now()}-${filenameWithoutExt}`,
      format: path.extname(file.originalname).substring(1), // Get extension without dot
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
      format: path.extname(file.originalname).substring(1), // Get extension without dot
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
      format: path.extname(file.originalname).substring(1), // Get extension without dot
    };
  },
});

export const uploadNotesMulter = multer({
  storage: notesStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
  fileFilter(req, file, cb) {
    const allowed = [
      // PDFs
      "application/pdf",
      // Images
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
      "image/bmp",
      // Word documents
      "application/msword", // .doc
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      // PowerPoint
      "application/vnd.ms-powerpoint", // .ppt
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    ];

    if (!allowed.includes(file.mimetype)) {
      cb(
        new Error(
          `File type not allowed: ${file.mimetype}. Supported types: PDF, Images, DOC/DOCX, PPT/PPTX`,
        ),
      );
      return;
    }

    cb(null, true);
  },
});

export const uploadPyqsMulter = multer({
  storage: pyqStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
  fileFilter(req, file, cb) {
    const allowed = [
      //PDFs
      "application/pdf",
      //Images
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
      "image/bmp",
      //Word documents
      "application/msword", // .doc
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      // PowerPoint
      "application/vnd.ms-powerpoint", // .ppt
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    ];

    if (!allowed.includes(file.mimetype)) {
      cb(
        new Error(
          `File type not allowed: ${file.mimetype}. Supported types: PDF, Images, DOC/DOCX, PPT/PPTX`,
        ),
      );
      return;
    }

    cb(null, true);
  },
});

export const uploadSyllabusMulter = multer({
  storage: syllabusStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
  fileFilter(req, file, cb) {
    const allowed = [
      // PDFs
      "application/pdf",
      // Images
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
      "image/bmp",
      // Word documents
      "application/msword", // .doc
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      // PowerPoint
      "application/vnd.ms-powerpoint", // .ppt
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    ];

    if (!allowed.includes(file.mimetype)) {
      cb(
        new Error(
          `File type not allowed: ${file.mimetype}. Supported types: PDF, Images, DOC/DOCX, PPT/PPTX`,
        ),
      );
      return;
    }

    cb(null, true);
  },
});

// ============ POSTS STORAGE (Images & Videos Only) ============

const postsStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const filenameWithoutExt = getFilenameWithoutExtension(file.originalname);
    return {
      folder: "posts_uploads",
      resource_type: getResourceType(file.mimetype),
      public_id: `${Date.now()}-${filenameWithoutExt}`,
      format: path.extname(file.originalname).substring(1), // Get extension without dot
    };
  },
});

export const uploadPostsMulter = multer({
  storage: postsStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB per file
  },
  fileFilter(req, file, cb) {
    const allowed = [
      // Images
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
      "image/bmp",
      "image/svg+xml",
      // Videos
      "video/mp4",
      "video/webm",
      "video/mpeg",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-ms-wmv",
      "video/3gpp",
      "video/3gpp2",
    ];

    if (!allowed.includes(file.mimetype)) {
      cb(
        new Error(
          `File type not allowed: ${file.mimetype}. Supported types: Images (PNG, JPG, WEBP, GIF, BMP) and Videos (MP4, WEBM, MOV, AVI, WMV)`,
        ),
      );
      return;
    }

    cb(null, true);
  },
});
