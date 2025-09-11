import express from "express";
import multer from "multer";
import path from "path";
import { processDocument, batchProcessDocuments } from "../controllers/ocrController";

const router = express.Router();

// Setup multer for file uploads
const upload = multer({ dest: path.join(__dirname, "../../uploads/") });

router.post("/upload", upload.single("file"), processDocument);
router.post("/batch-upload", upload.array("files", 4), batchProcessDocuments);

export default router;