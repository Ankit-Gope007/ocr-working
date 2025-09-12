import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { preprocessImage } from "../utils/preprocess";
import { runOCR } from "../utils/ocr";
import { geminiService } from "../services/geminiService";
import { checkCertificateExists, createCertificateHash } from "../utils/blockchain";

interface ParsedStudentData {
  student_info: {
    name: string | null;
    registration_no: string | null;
    programme: string | null;
    department: string | null;
    valid_until: string | null;
  };
}

export const verifyDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Verification failed",
        isValid: false,
        error: "No file uploaded for verification."
      });
    }

    const inputPath = req.file.path;
    const processedPath = path.join("uploads", `verify-processed-${Date.now()}.png`);

    await preprocessImage(inputPath, processedPath);
    const text = await runOCR(processedPath);
    const parsedData: ParsedStudentData = await geminiService.parseStudentData(text);

    const studentInfo = parsedData.student_info;
    if (
      !studentInfo?.name ||
      !studentInfo.registration_no ||
      !studentInfo.department ||
      !studentInfo.programme ||
      !studentInfo.valid_until
    ) {
      return res.status(400).json({
        message: "Verification failed",
        isValid: false,
        error: "Could not extract all required fields for verification."
      });
    }

    // ✅ Normalize structure for hashing
    const formattedInfo = {
      name: studentInfo.name,
      registration_no: studentInfo.registration_no,
      department: studentInfo.department,
      programme: studentInfo.programme,
      valid_until: studentInfo.valid_until,
    };

    const generatedHash = createCertificateHash(formattedInfo);
    const certExists = await checkCertificateExists(generatedHash);

    // Cleanup
    [inputPath, processedPath].forEach((file) => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });

    if (certExists) {
      return res.json({
        message: "✅ Document verified successfully",
        isValid: true,
        studentData: parsedData,
        blockchainData: {
          certHash: generatedHash,
          issuedDate: new Date().toISOString(), // ⚡ Replace with real issued date if stored on-chain
          validUntil: studentInfo.valid_until,
        }
      });
    } else {
      return res.status(404).json({
        message: "❌ Document verification failed. No matching certificate found on blockchain.",
        isValid: false,
        studentData: parsedData,
        blockchainData: {
          certHash: generatedHash,
          issuedDate: "",
          validUntil: studentInfo.valid_until,
        }
      });
    }
  } catch (err) {
    console.error("Verification Error:", err);

    return res.status(500).json({
      message: "Verification failed",
      isValid: false,
      error: err instanceof Error ? err.message : "Unknown error"
    });
  }
};
