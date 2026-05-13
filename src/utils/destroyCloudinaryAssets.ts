import cloudinary from "../config/cloudinary.js";

export async function destroyCloudinaryAssets(
  media: Array<{ publicId: string; type: "image" | "video" | "raw" }>,
) {
  await Promise.all(
    media.map((m) =>
      cloudinary.uploader.destroy(m.publicId, {
        resource_type: m.type,
      }),
    ),
  );
}
