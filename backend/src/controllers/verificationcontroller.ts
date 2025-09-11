// controllers/verificationController.ts
import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { preprocessImage } from "../utils/preprocess";
import { runOCR } from "../utils/ocr";
import { geminiService } from "../services/geminiService";
import { checkCertificateExists } from "../utils/blockchain"; // ⬅️ The same function
import crypto from "crypto";

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

// -----------------------------------------------------------------------------
// Helper function to create the hash of student data (same as before)
// -----------------------------------------------------------------------------
const createCertificateHash = (studentInfo: ParsedStudentData['student_info']): string => {
  const dataString = `${studentInfo.name}-${studentInfo.registration_no}-${studentInfo.department}-${studentInfo.programme}`;
  return crypto.createHash('sha256').update(dataString).digest('hex');
};

export const verifyDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded for verification." });
    }

    const inputPath = req.file.path;
    const processedPath = path.join("uploads", `verify-processed-${Date.now()}.png`);

    // Step 1: Preprocess and run OCR on the uploaded document
    await preprocessImage(inputPath, processedPath);
    const text = await runOCR(processedPath);
    const parsedData: ParsedStudentData = await geminiService.parseStudentData(text);

    const studentInfo = parsedData.student_info;
    if (!studentInfo || !studentInfo.name || !studentInfo.registration_no || !studentInfo.department || !studentInfo.programme) {
      return res.status(400).json({ error: "Could not extract all required fields for verification." });
    }

    // Step 2: Generate the hash from the extracted data
    const generatedHash = createCertificateHash(studentInfo);

    // Step 3: Check the blockchain for the generated hash
    const certExists = await checkCertificateExists(generatedHash);

    // Cleanup files
    fs.unlinkSync(inputPath);
    fs.unlinkSync(processedPath);

    if (certExists) {
      res.json({
        message: "Document is **valid**. A matching certificate was found on the blockchain.",
        status: "valid",
        data: parsedData,
        hash: generatedHash,
      });
    } else {
      res.status(404).json({
        message: "Document is **invalid**. No matching certificate found on the blockchain.",
        status: "invalid",
        data: parsedData,
        hash: generatedHash,
      });
    }
  } catch (err) {
    console.error("Verification Error:", err);
    res.status(500).json({ error: "Failed to verify document" });
  }
};