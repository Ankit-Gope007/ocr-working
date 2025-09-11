import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { preprocessImage } from "../utils/preprocess";
import { runOCR } from "../utils/ocr";
import { geminiService } from "../services/geminiService";
import { saveUserId } from "./dbControllers/UserId.controller";
import { issueCertificate } from "../utils/blockchain";

interface ParsedStudentData {
  student_info: {
    name: string | null;
    institution: string | null;
    registration_no: string | null;
    date_of_birth: string | null;
    blood_group: string | null;
    programme: string | null;
    department: string | null;
    valid_until: string | null;
  };
}

export const processDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uploadsDir = "uploads";
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const inputPath = req.file.path;
    const processedPath = path.join("uploads", `processed-${Date.now()}.png`);

    await preprocessImage(inputPath, processedPath);
    const text = await runOCR(processedPath);
    const parsedData: ParsedStudentData = await geminiService.parseStudentData(text);

    //  if (parsedData) {
    //   await saveUserId(parsedData.student_info);
    // }

    const studentInfo = parsedData.student_info;
    if (!studentInfo || !studentInfo.name || !studentInfo.registration_no || !studentInfo.department || !studentInfo.programme || !studentInfo.valid_until) {
      return res.status(400).json({ error: "Parsed data missing required fields for blockchain submission." });
    }

    // --- Fix for Invalid Date Format ---
    const dateParts = studentInfo.valid_until.split('.');
    if (dateParts.length !== 3) {
      return res.status(400).json({ error: `Invalid date format for 'valid_until': ${studentInfo.valid_until}` });
    }
    const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
    const validUntilTimestamp = Date.parse(formattedDate);
    // --- End of Fix ---

    if (isNaN(validUntilTimestamp)) {
      return res.status(400).json({ error: `Could not parse date: ${studentInfo.valid_until}` });
    }

    const certHash = await issueCertificate(
      studentInfo.name,
      studentInfo.registration_no,
      studentInfo.department,
      studentInfo.programme,
      validUntilTimestamp
    );

    fs.unlinkSync(inputPath);
    fs.unlinkSync(processedPath);

    res.json({
      message: "Document processed successfully and certificate issued on blockchain.",
      parsed: parsedData,
      certHash,
      blockchainAdded: true,   // ✅ Added
    });
     if (parsedData) {
      await saveUserId(parsedData.student_info);
    }
    
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
    const uploadsDir = "uploads";
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const file of files) {
      try {
        const inputPath = file.path;
        const processedPath = path.join("uploads", `processed-${Date.now()}-${file.filename}.png`);

        await preprocessImage(inputPath, processedPath);
        const text = await runOCR(processedPath);
        const parsedData: ParsedStudentData = await geminiService.parseStudentData(text);


        const studentInfo = parsedData.student_info;
        if (!studentInfo || !studentInfo.name || !studentInfo.registration_no || !studentInfo.department || !studentInfo.programme || !studentInfo.valid_until) {
          throw new Error("Missing required fields for blockchain submission.");
        }

        const dateParts = studentInfo.valid_until.split('.');
        if (dateParts.length !== 3) {
          throw new Error(`Invalid date format for 'valid_until': ${studentInfo.valid_until}`);
        }
        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        const validUntilTimestamp = Date.parse(formattedDate);

        if (isNaN(validUntilTimestamp)) {
          throw new Error(`Could not parse date: ${studentInfo.valid_until}`);
        }

        const certHash = await issueCertificate(
          studentInfo.name,
          studentInfo.registration_no,
          studentInfo.department,
          studentInfo.programme,
          validUntilTimestamp
        );

        fs.unlinkSync(inputPath);
        fs.unlinkSync(processedPath);

        results.push({
          filename: file.originalname,
          success: true,
          data: parsedData,
          certHash,
          blockchainAdded: true,
        });
         if (parsedData) {
      await saveUserId(parsedData.student_info);
    }
        successful++;
      } catch (error) {
        console.error(`[ERROR processing ${file.originalname}]:`, error);
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
          error: error instanceof Error ? error.message : "Unknown error occurred",
          blockchainAdded: false,
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
      institution,
    });
  } catch (err) {
    console.error("Batch OCR Error:", err);
    const files = req.files as Express.Multer.File[];
    if (files) {
      files.forEach((file) => {
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