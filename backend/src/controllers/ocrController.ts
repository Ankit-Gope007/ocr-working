import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { preprocessImage } from "../utils/preprocess";
import { runOCR } from "../utils/ocr";

export const processDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const inputPath = req.file.path;
    const processedPath = path.join("uploads", `processed-${Date.now()}.png`);

    // Preprocess image
    await preprocessImage(inputPath, processedPath);

    // Run OCR
    const text = await runOCR(processedPath);

    // Cleanup input (keep processed for debugging if needed)
    fs.unlinkSync(inputPath);

    res.json({
      message: "Document processed successfully",
      extractedText: text,
      processedFile: processedPath,
    });
  } catch (err) {
    console.error("OCR Error:", err);
    res.status(500).json({ error: "Failed to process document" });
  }
};