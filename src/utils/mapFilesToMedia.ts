export function mapFilesToMedia(files: Express.Multer.File[]) {
  return files.map((file) => {
    const { mimetype } = file;
    let type: "image" | "video" | "raw";
    if (mimetype.startsWith("image/")) type = "image";
    else if (mimetype.startsWith("video/")) type = "video";
    else type = "raw";

    return {
      type,
      url: (file as any).path, // Cloudinary secure_url (set by multer-storage-cloudinary)
      publicId: (file as any).filename, // Cloudinary public_id
    };
  });
}
