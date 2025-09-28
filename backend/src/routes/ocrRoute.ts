import express from "express";
import multer from "multer";
import path from "path";
import { processDocument, processBatchDocuments, validateHologramMultiAngle } from "../controllers/ocrController";
import { verifyDocument ,verifyBatchDocuments} from "../controllers/verificationcontroller";
const router = express.Router();

// Setup multer for file uploads
const upload = multer({ dest: path.join(__dirname, "../../uploads/") });

// Existing routes
router.post("/upload", upload.single("file"), processDocument);
router.post("/batch-upload", upload.array("files", 4), processBatchDocuments);

//PHASE 2: Multi-angle hologram validation route
router.post("/validate-hologram", upload.array("files", 5), validateHologramMultiAngle);

// New route for document verification
router.post("/verify", upload.single("file"), verifyDocument);
router.post('/verify/batch', upload.array('files'), verifyBatchDocuments);
export default router;