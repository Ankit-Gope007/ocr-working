import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { preprocessImage } from "../utils/preprocess";
import { runOCR } from "../utils/ocr";

import { geminiService } from "../services/geminiService";

import { parseCollegeIDCard } from "../utils/parser";
import { saveUserId } from "./dbControllers/UserId.controller";


export const processDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Ensure uploads directory exists
    const uploadsDir = "uploads";
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
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


    // 4. save in the db 
    
    // 4. Save userId if present
    if (parsedData) {
      await saveUserId(parsedData.student_info);
    }



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

export const batchProcessDocuments = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const { documentType, institution } = req.body;
    console.log(`[BATCH UPLOAD] Processing ${files.length} files for ${institution} - Document type: ${documentType}`);

    // Ensure uploads directory exists
    const uploadsDir = "uploads";
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const results = [];
    let successful = 0;
    let failed = 0;

    // Process each file
    for (const file of files) {
      try {
        console.log(`[PROCESSING] ${file.originalname}`);
        
        // Paths
        const inputPath = file.path;
        const processedPath = path.join("uploads", `processed-${Date.now()}-${file.filename}.png`);

        // 1. Preprocess image
        await preprocessImage(inputPath, processedPath);

        // 2. Run OCR
        const text = await runOCR(processedPath);
        console.log(`[RAW OCR TEXT for ${file.originalname}]:`);
        console.log(text);

        // 3. Parse text using Gemini AI
        const parsedData = await geminiService.parseStudentData(text);
        console.log(`[PARSED DATA for ${file.originalname}]:`);
        console.log(JSON.stringify(parsedData, null, 2));

        // 4. Save to database
        if (parsedData && parsedData.student_info) {
          await saveUserId(parsedData.student_info);
        }

        // Cleanup files
        fs.unlinkSync(inputPath);
        fs.unlinkSync(processedPath);

        results.push({
          filename: file.originalname,
          success: true,
          data: parsedData
        });
        
        successful++;
        
      } catch (error) {
        console.error(`[ERROR processing ${file.originalname}]:`, error);
        
        // Cleanup input file even on error
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError);
        }

        results.push({
          filename: file.originalname,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
        
        failed++;
      }
    }

    res.json({
      message: "Batch processing completed",
      totalProcessed: files.length,
      successful,
      failed,
      results,
      documentType,
      institution
    });

  } catch (err) {
    console.error("Batch OCR Error:", err);
    
    // Cleanup any remaining files
    const files = req.files as Express.Multer.File[];
    if (files) {
      files.forEach(file => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError);
        }
      });
    }

    res.status(500).json({ error: "Failed to process batch documents" });
  }
};