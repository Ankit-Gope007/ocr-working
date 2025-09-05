import express from "express";
import multer from "multer";
import path from "path";
import { runOCR } from "../utils/ocr";
import { parseCBSECertificate } from "../utils/parser";

const router = express.Router();

// Setup multer for file uploads
const upload = multer({ dest: path.join(__dirname, "../../uploads/") });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    let imagePath = req.file.path;
   
    // 1. Run OCR
    const ocrText = await runOCR(imagePath);

    // 2. Run parser
    const parsedData = parseCBSECertificate(ocrText);

    // 3. Return structured response
    res.json({
      rawText: ocrText,
      parsed: parsedData,
    });
  } catch (err) {
    console.error("OCR Error:", err);
    res.status(500).json({ error: "OCR processing failed" });
  }
});

export default router;