import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { preprocessImage } from "../utils/preprocess";
import { runOCR } from "../utils/ocr";
import { geminiService } from "../services/geminiService";

export const processDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    // Paths
    const inputPath = req.file.path;
    const processedPath = path.join("uploads", `processed-${Date.now()}.png`);

    //1.  Preprocess image
    await preprocessImage(inputPath, processedPath);

    // 2. Run OCR
    const text = await runOCR(processedPath);
    console.log("[RAW OCR TEXT]:");
    console.log(text);
    console.log("================");

    // 3. Parse text using Gemini AI
    const parsedData = await geminiService.parseStudentData(text);
    console.log(" [PARSED DATA]:");
    console.log(JSON.stringify(parsedData, null, 2));

    console.log("================");
    // 4. save in the db 
    
    // Cleanup input (keep processed for debugging if needed)
    fs.unlinkSync(inputPath);
    // fs.unlinkSync(processedPath); // Uncomment to delete processed image after OCR
    fs.unlinkSync(processedPath);

    res.json({
      message: "Document processed successfully",
      
      processedFile: processedPath,
    
      rawText: text,
      parsed: parsedData,
    });
  } catch (err) {
    console.error("OCR Error:", err);
    res.status(500).json({ error: "Failed to process document" });
  }
};