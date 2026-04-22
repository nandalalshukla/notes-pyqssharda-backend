import path from "path";

/**
 * Helper function to determine media type from MIME type
 * @param mimetype - The MIME type of the file
 * @returns 'image' or 'video'
 */
export const getMediaType = (mimetype: string): "image" | "video" => {
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
};

/**
 * Helper function to get file extension from filename
 * @param filename - The original filename
 * @returns File extension without dot
 */
export const getFileExtension = (filename: string): string => {
  return path.extname(filename).substring(1).toLowerCase();
};

/**
 * Interface for uploaded file from multer/cloudinary
 */
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  bucket: string;
  key: string;
  acl: string;
  contentType: string;
  contentDisposition: string | null;
  storageClass: string;
  metadata: any;
  location: string;
  etag: string;
  // Cloudinary specific
  path?: string; // URL
  filename?: string; // public_id
}

/**
 * Interface for processed media object
 */
export interface ProcessedMedia {
  type: "image" | "video";
  url: string;
  publicId: string;
  thumbnail?: string;
}

/**
 * Process uploaded files from multer and convert to media objects
 * Handles both single and multiple file uploads
 * @param files - Array of uploaded files from multer
 * @param originalFilename - Original filename to generate thumbnail if needed
 * @returns Array of processed media objects
 */
export const processUploadedFiles = (
  files: UploadedFile[] | undefined,
): ProcessedMedia[] => {
  if (!files || files.length === 0) {
    return [];
  }

  return files.map((file: UploadedFile) => {
    const mediaType = getMediaType(file.mimetype);
    const processedMedia: ProcessedMedia = {
      type: mediaType,
      url: file.path || file.location, // Cloudinary URL
      publicId: file.filename || file.key, // Cloudinary public_id
    };

    // Add thumbnail for videos (optional - Cloudinary can generate)
    // This can be enhanced later for auto-generated thumbnails
    if (mediaType === "video") {
      // Cloudinary URL with video thumbnail transformation
      processedMedia.thumbnail = `${processedMedia.url}?crop=fill&width=200&height=200`;
    }

    return processedMedia;
  });
};

/**
 * Validate processed media before saving to database
 * @param media - Array of processed media objects
 * @returns Object with validation status and errors
 */
export const validateMedia = (
  media: ProcessedMedia[],
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!Array.isArray(media)) {
    errors.push("Media must be an array");
    return { valid: false, errors };
  }

  if (media.length > 5) {
    errors.push("Maximum 5 media files allowed per post");
  }

  media.forEach((m, index) => {
    if (!m.type || !["image", "video"].includes(m.type)) {
      errors.push(`Media ${index + 1}: Invalid media type`);
    }
    if (!m.url || typeof m.url !== "string") {
      errors.push(`Media ${index + 1}: Missing or invalid URL`);
    }
    if (!m.publicId || typeof m.publicId !== "string") {
      errors.push(`Media ${index + 1}: Missing or invalid public ID`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Extract media information from request
 * @param files - Uploaded files from multer
 * @returns Array of processed media or empty array
 */
export const extractMediaFromRequest = (
  files: UploadedFile[] | UploadedFile | undefined,
): ProcessedMedia[] => {
  // Handle single file
  if (files && !Array.isArray(files)) {
    return processUploadedFiles([files as UploadedFile]);
  }

  // Handle multiple files
  return processUploadedFiles(files as UploadedFile[]);
};

/**
 * Get total file size from uploaded files (in MB)
 * @param files - Uploaded files from multer
 * @returns Total size in MB
 */
export const getTotalFileSize = (files: UploadedFile[] | undefined): number => {
  if (!files || files.length === 0) {
    return 0;
  }

  const files_array = Array.isArray(files) ? files : [files];
  const totalBytes = files_array.reduce((sum, file) => sum + file.size, 0);
  return totalBytes / (1024 * 1024); // Convert to MB
};

/**
 * Validate file size constraints
 * @param files - Uploaded files from multer
 * @param maxSizePerFileMB - Maximum size per file in MB
 * @param maxTotalSizeMB - Maximum total size in MB
 * @returns Object with validation status and errors
 */
export const validateFileSize = (
  files: UploadedFile[] | undefined,
  maxSizePerFileMB: number = 50,
  maxTotalSizeMB: number = 200,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!files || files.length === 0) {
    return { valid: true, errors };
  }

  const files_array = Array.isArray(files) ? files : [files];

  // Check individual file sizes
  files_array.forEach((file, index) => {
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizePerFileMB) {
      errors.push(
        `File ${index + 1}: Size (${fileSizeMB.toFixed(2)}MB) exceeds maximum (${maxSizePerFileMB}MB)`,
      );
    }
  });

  // Check total size
  const totalSize = getTotalFileSize(files_array);
  if (totalSize > maxTotalSizeMB) {
    errors.push(
      `Total size (${totalSize.toFixed(2)}MB) exceeds maximum (${maxTotalSizeMB}MB)`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
