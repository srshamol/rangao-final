// Node.js CLI script to upload optimized variants to Cloudflare R2
// Usage: node upload-image.js ./local/image.jpg products/slug-name

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || ""; // e.g., pub-[hash].r2.dev

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error("Missing Cloudflare R2 credentials in environment variables.");
  process.exit(1);
}

const s3Client = new S3Client({
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  region: "auto",
});

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: node upload-image.js <local-image-path> <r2-key-prefix>");
  process.exit(1);
}

const [localPath, r2KeyPrefix] = args;

async function uploadToR2(buffer: Buffer, key: string, mimeType: string) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  await s3Client.send(command);
  console.log(`Successfully uploaded: ${key}`);
}

async function main() {
  try {
    if (!fs.existsSync(localPath)) {
      console.error(`Local file does not exist: ${localPath}`);
      process.exit(1);
    }

    const fileBuffer = fs.readFileSync(localPath);
    const targetSizes = [400, 800, 1200];
    
    // We generate optimized WebP and JPEG variants for each target size
    for (const size of targetSizes) {
      // 1. WebP format
      const webpBuffer = await sharp(fileBuffer)
        .resize(size)
        .webp({ quality: 80 })
        .toBuffer();
      
      const webpKey = `${r2KeyPrefix}-${size}.webp`;
      await uploadToR2(webpBuffer, webpKey, "image/webp");

      // 2. JPEG format (fallback)
      const jpegBuffer = await sharp(fileBuffer)
        .resize(size)
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

      const jpegKey = `${r2KeyPrefix}-${size}.jpg`;
      await uploadToR2(jpegBuffer, jpegKey, "image/jpeg");
    }

    // Upload the raw original too
    const originalExt = path.extname(localPath).toLowerCase();
    const originalMime = originalExt === ".png" ? "image/png" : "image/jpeg";
    const originalKey = `${r2KeyPrefix}-original${originalExt}`;
    await uploadToR2(fileBuffer, originalKey, originalMime);

    const basePublicUrl = R2_PUBLIC_DOMAIN.startsWith("http")
      ? R2_PUBLIC_DOMAIN.endsWith("/") ? R2_PUBLIC_DOMAIN.slice(0, -1) : R2_PUBLIC_DOMAIN
      : `https://${R2_PUBLIC_DOMAIN}`;

    console.log("\nImage Variants Upload Complete!");
    console.log(`Base Original URL: ${basePublicUrl}/${originalKey}`);
    console.log(`WebP 800w URL:     ${basePublicUrl}/${r2KeyPrefix}-800.webp`);
  } catch (err) {
    console.error("Failed to process and upload image variants:", err);
    process.exit(1);
  }
}

main();
