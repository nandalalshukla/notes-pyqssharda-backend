/**
 * Utility script to fix existing Cloudinary URLs in the database
 * Run this ONCE after deploying the multer.ts fix
 *
 * This will change URLs from:
 *   /image/upload/...file.pdf
 * To:
 *   /raw/upload/...file.pdf
 */

import mongoose from "mongoose";

// Import your models (adjust paths as needed)
// Uncomment and adjust these imports based on your actual model structure
/*
import Note from "./models/notes/notes.model.js";
import Pyq from "./models/pyqs/pyqs.model.js";
import Syllabus from "./models/syllabus/syllabus.model.js";
*/

interface DocumentWithFileUrl {
  _id: mongoose.Types.ObjectId;
  fileUrl: string;
  title: string;
}

async function fixCloudinaryUrls() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI not found in environment variables");
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // IMPORTANT: Uncomment these lines and import your models above
    /*
    const models = [
      { name: "Notes", model: Note },
      { name: "PYQs", model: Pyq },
      { name: "Syllabus", model: Syllabus },
    ];
    */

    // For testing, use empty array if models not imported
    const models: Array<{ name: string; model: any }> = [];

    if (models.length === 0) {
      console.log("⚠️  No models configured.");
      console.log("📝 To use this script:");
      console.log("   1. Uncomment the model imports at the top");
      console.log("   2. Uncomment the models array");
      console.log("   3. Run: npx ts-node fix-cloudinary-urls.ts\n");
      await mongoose.disconnect();
      return;
    }

    let totalFixed = 0;

    for (const { name, model } of models) {
      console.log(`\n📂 Processing ${name}...`);

      // Find documents with incorrect URLs
      // Pattern: URLs with /image/upload/ followed by PDF, DOC, DOCX, PPT, or PPTX
      const docs = (await model.find({
        fileUrl: {
          $regex: /\/image\/upload\/.*\.(pdf|doc|docx|ppt|pptx)(\?|$)/i,
        },
      })) as DocumentWithFileUrl[];

      console.log(`   Found ${docs.length} documents with incorrect URLs`);

      if (docs.length === 0) {
        console.log("   ✅ No fixes needed!");
        continue;
      }

      for (const doc of docs) {
        const oldUrl = doc.fileUrl;
        const newUrl = oldUrl.replace("/image/upload/", "/raw/upload/");

        // Update the document
        await model.updateOne({ _id: doc._id }, { $set: { fileUrl: newUrl } });

        console.log(`\n   📄 Fixed: ${doc.title}`);
        console.log(`      ID: ${doc._id}`);
        console.log(`      Old: ${oldUrl}`);
        console.log(`      New: ${newUrl}`);

        totalFixed++;
      }
    }

    console.log(`\n\n🎉 Migration Complete!`);
    console.log(`   Total documents fixed: ${totalFixed}`);

    if (totalFixed > 0) {
      console.log("\n✅ All file URLs have been corrected!");
      console.log("   Files should now load correctly in the FileViewer.");
    }

    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  } catch (error) {
    console.error("\n❌ Error during migration:", error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  fixCloudinaryUrls();
}

export { fixCloudinaryUrls };
