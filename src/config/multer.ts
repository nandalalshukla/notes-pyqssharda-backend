import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "notes_uploads",
      resource_type: "auto",
      public_id: `${Date.now()}-${file.originalname}`,
    };
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter(req, file, cb) {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];

    if (!allowed.includes(file.mimetype)) {
      cb(new Error("File type not allowed"));
      return;
    }

    cb(null, true);
  },
});
