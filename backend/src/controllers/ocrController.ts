import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { preprocessImage } from "../utils/preprocess";
import { runOCR } from "../utils/ocr";
import { geminiService } from "../services/geminiService";
import { saveUserId } from "./dbControllers/UserId.controller";
import { issueCertificate, checkCertificateExists, createCertificateHash } from "../utils/blockchain";
import { exec } from "child_process";


export async function convertPdfToImages(
  pdfPath: string,
  outputDir: string
): Promise<string[]> {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = Date.now();
  const outputPrefix = path.join(outputDir, `pdf-${timestamp}-page`);

  return new Promise((resolve, reject) => {
    exec(
      `pdftoppm -png "${pdfPath}" "${outputPrefix}"`,
      (err, stdout, stderr) => {
        if (err) return reject(err);

        const files = fs
          .readdirSync(outputDir)
          .filter(
            (f) => f.startsWith(`pdf-${timestamp}-page`) && f.endsWith(".png")
          )
          .map((f) => path.join(outputDir, f));

        if (files.length === 0)
          return reject(new Error("No images generated from PDF"));

        resolve(files);
      }
    );
  });
}

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
    const ext = path.extname(req.file.originalname).toLowerCase();
    let imagePaths: string[] = [];

    if (ext === ".pdf") {
      imagePaths = await convertPdfToImages(inputPath, uploadsDir);
    } else {
      processedPath = path.join(uploadsDir, `processed-${Date.now()}.png`);
      await preprocessImage(inputPath, processedPath);
      imagePaths = [processedPath];
    }

    // Run OCR on all images (take first page for single-document processing)
    const text = await runOCR(imagePaths[0]);

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
    let imagePaths: string[] = [];
    const tempImagePaths: string[] = []; // Array to hold temporary image paths for cleanup

    try {
      inputPath = file.path;
      const ext = path.extname(file.originalname).toLowerCase();
      const uploadsDir = "uploads";

      if (ext === ".pdf") {
        // PDF files must be converted to images first
        imagePaths = await convertPdfToImages(inputPath, uploadsDir);
        // The first page of the PDF is used for OCR, but all generated images need to be cleaned up
        tempImagePaths.push(...imagePaths);
        // Preprocess the first page for OCR
        processedPath = path.join(
          uploadsDir,
          `processed-${Date.now()}-temp.png`
        );
        await preprocessImage(imagePaths[0], processedPath);
        imagePaths = [processedPath];
        tempImagePaths.push(processedPath);
      } else {
        // Supported image files are preprocessed directly
        processedPath = path.join(
          uploadsDir,
          `processed-${Date.now()}-temp.png`
        );
        await preprocessImage(inputPath, processedPath);
        imagePaths = [processedPath];
        tempImagePaths.push(processedPath);
      }

      // Run OCR on the single, preprocessed image
      const text = await runOCR(imagePaths[0]);

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
        results.push({
          filename: file.originalname,
          success: false,
          error: "Missing required fields",
        });
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
        results.push({
          filename: file.originalname,
          success: true,
          data: parsedData,
          certHash,
        });
        continue;
      }

      const [dd, mm, yyyy] = studentInfo.valid_until.split(".");
      const validUntilTimestamp = Math.floor(
        Date.parse(`${yyyy}-${mm}-${dd}`) / 1000
      );

      const newHash = await issueCertificate(
        studentInfo.name,
        studentInfo.registration_no,
        studentInfo.department,
        studentInfo.programme,
        validUntilTimestamp
      );

      await saveUserId(studentInfo);

      successful++;
      results.push({
        filename: file.originalname,
        success: true,
        data: parsedData,
        certHash: newHash,
      });
    } catch (err) {
      console.error("Batch OCR Error:", err);
      failed++;
      results.push({
        filename: file.originalname,
        success: false,
        error: "Failed to process file",
      });
    } finally {
      // Clean up all temporary files, including converted PDF images
      [inputPath, ...tempImagePaths].forEach((p) => {
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