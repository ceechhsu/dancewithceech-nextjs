import { v2 as cloudinary } from "cloudinary";
import { readdir } from "fs/promises";
import { join } from "path";

cloudinary.config({
  cloud_name: "dedxm1lig",
  api_key: "714686318135257",
  api_secret: "N5D7KLoJ2snkHg2cSaK7qL7ueYg",
});

const FRAMES_DIR = join(process.cwd(), "public/hero-frames");

const files = (await readdir(FRAMES_DIR))
  .filter((f) => f.endsWith(".jpg"))
  .sort();

console.log(`Uploading ${files.length} frames to Cloudinary...`);

let uploaded = 0;
for (const file of files) {
  const publicId = `hero-frames/${file.replace(".jpg", "")}`;
  const filePath = join(FRAMES_DIR, file);

  try {
    await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      overwrite: false,
      resource_type: "image",
    });
    uploaded++;
    if (uploaded % 20 === 0) console.log(`${uploaded}/${files.length} uploaded...`);
  } catch (err) {
    console.error(`Failed: ${file}`, err.message);
  }
}

console.log(`Done! ${uploaded}/${files.length} frames uploaded.`);
