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
      return res.status(400).json({ error: "No file uploaded for verification." });
    }

    const inputPath = req.file.path;
    const processedPath = path.join("uploads", `verify-processed-${Date.now()}.png`);

    await preprocessImage(inputPath, processedPath);
    const text = await runOCR(processedPath);
    const parsedData: ParsedStudentData = await geminiService.parseStudentData(text);

    const studentInfo = parsedData.student_info;
    if (
      !studentInfo ||
      !studentInfo.name ||
      !studentInfo.registration_no ||
      !studentInfo.department ||
      !studentInfo.programme ||
      !studentInfo.valid_until
    ) {
      return res.status(400).json({ error: "Could not extract all required fields for verification." });
    }

    // ✅ Normalize structure for createCertificateHash
    const formattedInfo = {
      name: studentInfo.name,
      registration_no: studentInfo.registration_no,
      department: studentInfo.department,
      programme: studentInfo.programme,
      valid_until: studentInfo.valid_until,
    };

    const generatedHash = createCertificateHash(formattedInfo);
    const certExists = await checkCertificateExists(generatedHash);

    // Safe cleanup
    [inputPath, processedPath].forEach((file) => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });

    if (certExists) {
      return res.json({
        message: "✅ Document is valid. A matching certificate was found on the blockchain.",
        status: "valid",
        data: parsedData,
        hash: generatedHash,
      });
    } else {
      return res.status(404).json({
        message: "❌ Document is invalid. No matching certificate found on the blockchain.",
        status: "invalid",
        data: parsedData,
        hash: generatedHash,
      });
    }
  } catch (err) {
    console.error("Verification Error:", err);

    return res.status(500).json({
      error: "Failed to verify document",
      details: err instanceof Error ? err.message : err,
    });
  }
};
