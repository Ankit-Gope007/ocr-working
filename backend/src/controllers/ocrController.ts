import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { preprocessImage } from "../utils/preprocess";
import { runOCR } from "../utils/ocr";
import { geminiService } from "../services/geminiService";
import { saveUserId } from "./dbControllers/UserId.controller";
import { issueCertificate, checkCertificateExists, createCertificateHash } from "../utils/blockchain";

interface ParsedStudentData {
  student_info: {
    name: string | null;
    institution: string | null;
    registration_no: string | null;
    date_of_birth: string | null;
    blood_group: string | null;
    programme: string | null;
    department: string | null;
    valid_until: string | null; // expected DD.MM.YYYY
  };
}

export const processDocument = async (req: Request, res: Response) => {
  let inputPath = "";
  let processedPath = "";
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uploadsDir = "uploads";
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    inputPath = req.file.path;
    processedPath = path.join(uploadsDir, `processed-${Date.now()}.png`);

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
      return res.status(400).json({ error: "Parsed data missing required fields" });
    }

    // 🔑 Generate hash consistently via blockchain util
    const certHash = createCertificateHash({
      name: studentInfo.name as string,
      registration_no: studentInfo.registration_no as string,
      department: studentInfo.department as string,
      programme: studentInfo.programme as string,
      valid_until: studentInfo.valid_until as string,
    });
    const certExists = await checkCertificateExists(certHash);

    if (certExists) {
      return res.status(200).json({
        message: "Certificate already exists on the blockchain. No new certificate issued.",
        parsed: parsedData,
        blockchainAdded: false,
      });
    }

    // Convert date → timestamp (seconds)
    const [dd, mm, yyyy] = studentInfo.valid_until.split(".");
    const validUntilTimestamp = Math.floor(Date.parse(`${yyyy}-${mm}-${dd}`) / 1000);

    const newCertHash = await issueCertificate(
      studentInfo.name,
      studentInfo.registration_no,
      studentInfo.department,
      studentInfo.programme,
      validUntilTimestamp
    );

    await saveUserId(studentInfo);

    res.json({
      message: "Document processed successfully and certificate issued on blockchain.",
      parsed: parsedData,
      certHash: newCertHash,
      blockchainAdded: true,
    });
  } catch (err) {
    console.error("OCR Error:", err);
    res.status(500).json({ error: "Failed to process document" });
  } finally {
    // cleanup
    [inputPath, processedPath].forEach((file) => {
      if (file && fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  }
};
export const processBatchDocuments = async (req: Request, res: Response) => {
  if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const results: any[] = [];
  let successful = 0;
  let failed = 0;

  for (const file of req.files as Express.Multer.File[]) {
    let inputPath = "";
    let processedPath = "";

    try {
      inputPath = file.path;
      processedPath = path.join("uploads", `batch-${Date.now()}-${file.filename}.png`);

      await preprocessImage(inputPath, processedPath);
      const text = await runOCR(processedPath);
      const parsedData = await geminiService.parseStudentData(text);

      const studentInfo = parsedData.student_info;
      if (
        !studentInfo?.name ||
        !studentInfo.registration_no ||
        !studentInfo.department ||
        !studentInfo.programme ||
        !studentInfo.valid_until
      ) {
        failed++;
        results.push({ filename: file.originalname, success: false, error: "Missing required fields" });
        continue;
      }

      const certHash = createCertificateHash({
        name: studentInfo.name,
        registration_no: studentInfo.registration_no,
        department: studentInfo.department,
        programme: studentInfo.programme,
        valid_until: studentInfo.valid_until,
      });

      const exists = await checkCertificateExists(certHash);
      if (exists) {
        successful++;
        results.push({ filename: file.originalname, success: true, data: parsedData, certHash });
        continue;
      }

      const [dd, mm, yyyy] = studentInfo.valid_until.split(".");
      const validUntilTimestamp = Math.floor(Date.parse(`${yyyy}-${mm}-${dd}`) / 1000);

      const newHash = await issueCertificate(
        studentInfo.name,
        studentInfo.registration_no,
        studentInfo.department,
        studentInfo.programme,
        validUntilTimestamp
      );

      await saveUserId(studentInfo);

      successful++;
      results.push({ filename: file.originalname, success: true, data: parsedData, certHash: newHash });

    } catch (err) {
      console.error("Batch OCR Error:", err);
      failed++;
      results.push({ filename: file.originalname, success: false, error: "Failed to process file" });
    } finally {
      [inputPath, processedPath].forEach((p) => {
        if (p && fs.existsSync(p)) fs.unlinkSync(p);
      });
    }
  }

  return res.json({
    message: "Batch processing complete",
    totalProcessed: results.length,
    successful,
    failed,
    results,
  });
};
