interface CloudinaryFile extends Omit<
  Express.Multer.File,
  "filename" | "path"
> {
  path?: string; // Cloudinary secure_url
  filename?: string; // Cloudinary public_id
}

export function mapFilesToMedia(files: CloudinaryFile[]) {
  return files.map((file) => {
    const { mimetype } = file;
    let type: "image" | "video" | "raw";
    if (mimetype.startsWith("image/")) type = "image";
    else if (mimetype.startsWith("video/")) type = "video";
    else type = "raw";

    return {
      type,
      url: file.path || "", // Cloudinary secure_url (set by multer-storage-cloudinary)
      publicId: file.filename || "", // Cloudinary public_id
    };
  });
}
