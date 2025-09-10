import express from "express";
import multer from "multer";
import path from "path";
import { processDocument } from "../controllers/ocrController";

const router = express.Router();

// Setup multer for file uploads
const upload = multer({ dest: path.join(__dirname, "../../uploads/") });

router.post("/upload", upload.single("file"), processDocument);

export default router;