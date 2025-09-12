import express from "express";
import multer from "multer";
import path from "path";
import { processDocument, processBatchDocuments } from "../controllers/ocrController";
import { verifyDocument } from "../controllers/verificationcontroller";
const router = express.Router();

// Setup multer for file uploads
const upload = multer({ dest: path.join(__dirname, "../../uploads/") });

// Existing routes
router.post("/upload", upload.single("file"), processDocument);
router.post("/batch-upload", upload.array("files", 4), processBatchDocuments);

// ⬅️ New route for document verification
router.post("/verify", upload.single("file"), verifyDocument);

export default router;