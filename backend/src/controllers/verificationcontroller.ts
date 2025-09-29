import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { preprocessImage } from "../utils/preprocess";
import { runOCR } from "../utils/ocr";
import { geminiService } from "../services/geminiService";
// ⚡ Assuming verifyCertificate is now also exported from the blockchain utility file
import { createCertificateHash, verifyCertificate } from "../utils/blockchain"; 
import { analyzeMetadata } from "../utils/metaForgeryChecker";

interface ParsedStudentData {
    student_info: {
        name: string | null;
        registration_no: string | null;
        programme: string | null;
        department: string | null;
        valid_until: string | null;
    };
}

/**
 * Handles single document verification by running OCR, checking metadata, 
 * hashing student data, and verifying existence on the blockchain.
 */
export const verifyDocument = async (req: Request, res: Response) => {
    let inputPath: string | undefined;
    let processedPath: string | undefined;

    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Verification failed",
                isValid: false,
                error: "No file uploaded for verification."
            });
        }

        inputPath = req.file.path;
        processedPath = path.join("uploads", `verify-processed-${Date.now()}.png`);

        // 0. Metadata forgery check
        const metaReport = await analyzeMetadata(inputPath);
        console.log("[METADATA REPORT]:");
        console.log(JSON.stringify(metaReport, null, 2));

        if (metaReport.verdict === "likely_forged" || metaReport.verdict === "suspicious") {
            // Cleanup input file immediately after suspicious metadata detection
            fs.unlinkSync(inputPath);
            inputPath = undefined; // Clear path to prevent double cleanup
            throw new Error(`Metadata forgery suspicion: ${metaReport.summary.join("; ")}`);
        }

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
            throw new Error("Could not extract all required fields for verification.");
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
        
        let issuedDateISO = "";
        let isValid = false;
        
        try {
            // ⚡ Use verifyCertificate to get full data and check existence
            const certData = await verifyCertificate(generatedHash);
            
            // issuedOn is a Unix timestamp in seconds, convert to milliseconds (* 1000)
            issuedDateISO = new Date(certData.issuedOn * 1000).toISOString();
            isValid = true;

            return res.json({
                message: "✅ Document verified successfully",
                isValid: true,
                studentData: parsedData,
                blockchainData: {
                    certHash: generatedHash,
                    issuedDate: issuedDateISO, 
                    validUntil: studentInfo.valid_until,
                }
            });

        } catch (verificationError) {
            // Certificate does not exist or other blockchain error
            console.warn("Blockchain Verification Failed:", verificationError);
            
            return res.status(404).json({
                message: "❌ Document verification failed. No matching certificate found on blockchain.",
                isValid: false,
                studentData: parsedData,
                blockchainData: {
                    certHash: generatedHash,
                    issuedDate: issuedDateISO,
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
    } finally {
        // Cleanup logic runs after the main response is sent or an error is caught
        [inputPath, processedPath].forEach((file) => {
            if (file && fs.existsSync(file)) fs.unlinkSync(file);
        });
    }
};

/**
 * Handles batch document verification.
 */
export const verifyBatchDocuments = async (req: Request, res: Response) => {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).json({
                message: "Batch verification failed",
                isValid: false,
                error: "No files uploaded for batch verification."
            });
        }

        const results = [];
        const filesToProcess = req.files as Express.Multer.File[];

        for (const file of filesToProcess) {
            const inputPath = file.path;
            const processedPath = path.join("uploads", `verify-processed-${Date.now()}-${file.filename}.png`);


            let currentFileResult: any = {
                file: file.originalname,
                isValid: false,
                error: "Verification pending"
            };


            try {
                // 0. Metadata forgery check
                const metaReport = await analyzeMetadata(inputPath);
                console.log("[METADATA REPORT]:");
                console.log(JSON.stringify(metaReport, null, 2));

                
                // If metadata is suspicious, add to results as failed and continue to next file
                if (metaReport.verdict === "likely_forged" || metaReport.verdict === "suspicious") {
                    results.push({
                        file: file.originalname,
                        isValid: false,
                        error: `Metadata forgery detected: ${metaReport.summary.join("; ")}`,
                        metadataReport: metaReport
                    });
                    continue; // Skip to next file

                }

                await preprocessImage(inputPath, processedPath);
                const text = await runOCR(processedPath);
                const parsedData: ParsedStudentData = await geminiService.parseStudentData(text);
                
                currentFileResult.studentData = parsedData;

                const studentInfo = parsedData.student_info;
                if (
                    !studentInfo?.name ||
                    !studentInfo.registration_no ||
                    !studentInfo.department ||
                    !studentInfo.programme ||
                    !studentInfo.valid_until
                ) {
                    throw new Error("Could not extract all required fields for verification.");
                }

                const formattedInfo = {
                    name: studentInfo.name,
                    registration_no: studentInfo.registration_no,
                    department: studentInfo.department,
                    programme: studentInfo.programme,
                    valid_until: studentInfo.valid_until,
                };
                const generatedHash = createCertificateHash(formattedInfo);
                
                let issuedDateISO = "";

                try {
                    // ⚡ Use verifyCertificate to get full data and check existence
                    const certData = await verifyCertificate(generatedHash);
                    
                    // issuedOn is a Unix timestamp in seconds, convert to milliseconds (* 1000)
                    issuedDateISO = new Date(certData.issuedOn * 1000).toISOString();
                    
                    currentFileResult = {
                        file: file.originalname,
                        isValid: true,
                        studentData: parsedData,
                        blockchainData: {
                            certHash: generatedHash,
                            issuedDate: issuedDateISO,
                            validUntil: studentInfo.valid_until,
                        }
                    };
                } catch (verificationError) {
                    // Certificate not found
                    console.warn(`Blockchain Verification failed for ${file.originalname}:`, verificationError);
                    
                    currentFileResult = {
                        file: file.originalname,
                        isValid: false,
                        error: "No matching certificate found on blockchain.",
                        studentData: parsedData,
                        blockchainData: {
                            certHash: generatedHash,
                            issuedDate: "",
                            validUntil: studentInfo.valid_until,
                        }
                    };
                }
            } catch (err) {
                // Catch any failure during OCR, Gemini parsing, or initial checks
                currentFileResult.error = err instanceof Error ? err.message : "Unknown error during processing.";
                currentFileResult.isValid = false;
                // If an error occurred, remove any pending blockchain data
                delete currentFileResult.blockchainData; 
            } finally {
                results.push(currentFileResult);
                // Cleanup current file paths
                [inputPath, processedPath].forEach((f) => {
                    if (fs.existsSync(f)) fs.unlinkSync(f);
                });
            }
        }

        return res.json({
            message: "Batch verification completed",
            results
        });
    } catch (err) {
        console.error("Batch Verification Error:", err);
        

        // This catch block handles catastrophic failures like an empty upload or the metadata check throwing an error.

        return res.status(500).json({
            message: "Batch verification failed due to a critical error.",
            isValid: false,
            error: err instanceof Error ? err.message : "Unknown error"
        });
    }
};
