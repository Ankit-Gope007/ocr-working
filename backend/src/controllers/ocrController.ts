import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { preprocessImage } from "../utils/preprocess";
import { runOCR } from "../utils/ocr";
import { geminiService } from "../services/geminiService";
import { saveUserId } from "./dbControllers/UserId.controller";
import { issueCertificate, checkCertificateExists, createCertificateHash } from "../utils/blockchain";
import { HologramDetector, MultiAngleHologramValidator } from "../utils/hologram";

// OCR RESULT CACHE: Avoid re-processing when transitioning from Phase 1 to Phase 2
const ocrCache = new Map<string, OCRPipelineResult>();

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

//Enhanced Hologram Result for parallel processing
interface EnhancedHologramResult {
  hasHologram: boolean;
  confidence: number;
  detectedFeatures: any;
  requiresMultipleAngles: boolean;
  processingTime: number;
  interpretation: string;
  nextSteps: any;
  analysisDetails: any;
}

//OCR Pipeline Result
interface OCRPipelineResult {
  parsedData: ParsedStudentData;
  rawText: string;
  processingTime: number;
  success: boolean;
  error?: string;
}

//HOLOGRAM PIPELINE: Independent processing with error isolation
async function runHologramPipeline(imagePath: string): Promise<EnhancedHologramResult> {
  const startTime = Date.now();
  
  try {
    const hologramDetector = new HologramDetector();
    const result = await hologramDetector.detectHologram(imagePath);
    
    return {
      hasHologram: result.hasHologram,
      confidence: result.confidence,
      detectedFeatures: result.detectedFeatures,
      requiresMultipleAngles: result.requiresMultipleAngles,
      processingTime: result.processingTime,
      interpretation: hologramDetector.interpretResult(result),
      nextSteps: hologramDetector.getNextSteps(result),
      analysisDetails: result.analysisDetails
    };
  } catch (error) {
    console.error('Hologram pipeline error (non-blocking):', error);

    // Return safe default - OCR can continue
    return {
      hasHologram: false,
      confidence: 0,
      detectedFeatures: {
        colorShift: false,
        metallicReflection: false,
        geometricPattern: false,
        textureComplexity: 0
      },
      requiresMultipleAngles: false,
      processingTime: Date.now() - startTime,
      interpretation: "Hologram analysis unavailable",
      nextSteps: { action: 'continue', message: 'Proceed with standard processing' },
      analysisDetails: null
    };
  }
}

//OCR PIPELINE: Independent processing with error isolation  
async function runOCRPipeline(inputPath: string, processedPath: string): Promise<OCRPipelineResult> {
  const startTime = Date.now();
  
  try {
    // Standard OCR processing chain
    await preprocessImage(inputPath, processedPath);
    const text = await runOCR(processedPath);
    const parsedData: ParsedStudentData = await geminiService.parseStudentData(text);
    
    return {
      parsedData,
      rawText: text,
      processingTime: Date.now() - startTime,
      success: true
    };
  } catch (error) {
    console.error('OCR pipeline error:', error);

    return {
      parsedData: {
        student_info: {
          name: null,
          institution: null,
          registration_no: null,
          date_of_birth: null,
          blood_group: null,
          programme: null,
          department: null,
          valid_until: null
        }
      },
      rawText: "",
      processingTime: Date.now() - startTime,
      success: false,
      error: error instanceof Error ? error.message : 'OCR processing failed'
    };
  }
}

function buildEnhancedResponse(
  baseMessage: string,
  parsedData: ParsedStudentData,
  hologramResult: EnhancedHologramResult,
  blockchainData?: { certHash?: string; blockchainAdded: boolean },
  additionalFeatures?: Record<string, any> //For future features
) {
  return {
    message: enhanceMessageWithHologram(baseMessage, hologramResult),
    parsed: parsedData,
    
    //Security & Hologram Data
    hologramData: hologramResult,
    securityLevel: hologramResult.hasHologram ? 'ENHANCED' : 'STANDARD',
    
    //Blockchain Data (optional)
    ...(blockchainData && {
      certHash: blockchainData.certHash,
      blockchainAdded: blockchainData.blockchainAdded
    }),
    
    //Processing Metrics
    processingMetrics: {
      hologramProcessingTime: hologramResult.processingTime,
      totalFeatures: Object.keys(additionalFeatures || {}).length + 1 // +1 for hologram
    },
    
    //EXTENSIBILITY: Future features can be added here without breaking existing responses
    ...(additionalFeatures && { additionalFeatures })
  };
}

//MESSAGE ENHANCER: Context-aware messaging
function enhanceMessageWithHologram(baseMessage: string, hologramResult: EnhancedHologramResult): string {
  if (!hologramResult.hasHologram) {
    return baseMessage;
  }
  
  return baseMessage.replace(
    "successfully", 
    `successfully with hologram features detected (${hologramResult.confidence}% confidence)`
  );
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

    //PARALLEL PROCESSING: Run hologram detection alongside OCR processing
    const [hologramResult, ocrResult] = await Promise.all([
      // HOLOGRAM PIPELINE: Independent processing
      runHologramPipeline(inputPath),
      
      // OCR PIPELINE: Independent processing  
      runOCRPipeline(inputPath, processedPath)
    ]);

    // HIGH-PRIORITY DECISION: Check if hologram requires multiple angles
    if (hologramResult.hasHologram && hologramResult.requiresMultipleAngles) {
      //SCENARIO C: High-confidence hologram detected → Request multiple angles
      //CACHE OCR RESULT for Phase 2 (to avoid re-processing)
      const sessionId = `hologram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      ocrCache.set(sessionId, ocrResult); // Cache the completed OCR result
      
      return res.status(200).json({
        message: "HOLOGRAM DETECTED! For enhanced security verification, please capture the document from 3-5 different angles",
        hologramDetected: true,
        requiresMultipleAngles: true,
        confidence: hologramResult.confidence,
        detectedFeatures: hologramResult.detectedFeatures,
        nextStep: "multi_angle_upload",
        processingTime: hologramResult.processingTime,
        interpretation: hologramResult.interpretation,
        nextSteps: hologramResult.nextSteps,
        sessionId: sessionId // Frontend needs to include this in Phase 2 request
      });
    }

    //HANDLE OCR PIPELINE FAILURES
    if (!ocrResult.success) {
      return res.status(500).json({ 
        error: "OCR processing failed", 
        details: ocrResult.error,
        hologramData: hologramResult, // Still include hologram data
        securityLevel: hologramResult.hasHologram ? 'ENHANCED' : 'STANDARD'
      });
    }

    // Continue with combined result processing
    const parsedData = ocrResult.parsedData;
    const studentInfo = parsedData.student_info;
    
    if (
      !studentInfo?.name ||
      !studentInfo.registration_no ||
      !studentInfo.department ||
      !studentInfo.programme ||
      !studentInfo.valid_until
    ) {
      return res.status(400).json({ 
        error: "Parsed data missing required fields",
        hologramData: hologramResult, // Include hologram data even on validation failure
        securityLevel: hologramResult.hasHologram ? 'ENHANCED' : 'STANDARD'
      });
    }

    // Generate hash consistently via blockchain util
    const certHash = createCertificateHash({
      name: studentInfo.name as string,
      registration_no: studentInfo.registration_no as string,
      department: studentInfo.department as string,
      programme: studentInfo.programme as string,
      valid_until: studentInfo.valid_until as string,
    });
    const certExists = await checkCertificateExists(certHash);

    if (certExists) {
      return res.status(200).json(
        buildEnhancedResponse(
          "Certificate already exists on the blockchain. No new certificate issued.",
          parsedData,
          hologramResult,
          { blockchainAdded: false, certHash }
        )
      );
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

    // EXTENSIBLE RESPONSE: Easy to add new features
    res.json(
      buildEnhancedResponse(
        " Document processed successfully and certificate issued on blockchain.",
        parsedData,
        hologramResult,
        { certHash: newCertHash, blockchainAdded: true }
      )
    );
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

      // BATCH PARALLEL PROCESSING: Run hologram + OCR simultaneously
      const [hologramResult, ocrResult] = await Promise.all([
        runHologramPipeline(inputPath),
        runOCRPipeline(inputPath, processedPath)
      ]);
      
      // Handle OCR failure in batch
      if (!ocrResult.success) {
        failed++;
        results.push({ 
          filename: file.originalname, 
          success: false, 
          error: ocrResult.error,
          hologramData: hologramResult,
          securityLevel: hologramResult.hasHologram ? 'ENHANCED' : 'STANDARD'
        });
        continue;
      }

      const parsedData = ocrResult.parsedData;

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
        results.push({ 
          filename: file.originalname, 
          success: true, 
          data: parsedData, 
          certHash,
          hologramData: hologramResult,
          securityLevel: hologramResult.hasHologram ? 'ENHANCED' : 'STANDARD'
        });
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
      results.push({ 
        filename: file.originalname, 
        success: true, 
        data: parsedData, 
        certHash: newHash,
        hologramData: hologramResult,
        securityLevel: hologramResult.hasHologram ? 'ENHANCED' : 'STANDARD'
      });

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

//PHASE 2: Multi-Angle Hologram Validation
export const validateHologramMultiAngle = async (req: Request, res: Response) => {
  const uploadedFiles: string[] = [];
  
  try {
    // Validate file uploads
    if (!req.files || !(req.files instanceof Array) || req.files.length < 3) {
      return res.status(400).json({ 
        error: "Minimum 3 different angles required for hologram validation",
        received: req.files ? (req.files instanceof Array ? req.files.length : 1) : 0,
        required: "3-5 images"
      });
    }

    if (req.files.length > 5) {
      return res.status(400).json({ 
        error: "Maximum 5 angles allowed for hologram validation",
        received: req.files.length,
        allowed: "3-5 images"
      });
    }

    const files = req.files as Express.Multer.File[];
    console.log(`Starting multi-angle hologram validation with ${files.length} images`);

    // Collect file paths for processing
    files.forEach(file => {
      uploadedFiles.push(file.path);
    });

    //OPTIMIZED MULTI-ANGLE VALIDATION
    const validator = new MultiAngleHologramValidator();
    
    // Check if we have cached OCR results from Phase 1
    const sessionId = req.body.sessionId;
    let ocrResult: OCRPipelineResult;
    
    if (sessionId && ocrCache.has(sessionId)) {
      //Use cached OCR result from Phase 1 (performance optimization)
      ocrResult = ocrCache.get(sessionId)!;
      ocrCache.delete(sessionId); // Clean up cache
      console.log('Using cached OCR result from Phase 1');
    } else {
      //Run OCR on primary image (fallback)
      console.log('Running fresh OCR analysis');
      ocrResult = await runOCRPipeline(uploadedFiles[0], path.join("uploads", `multiangle-${Date.now()}.png`));
    }
    
    // Run hologram validation independently
    const validationResult = await validator.validateHologramAuthenticity(uploadedFiles);

    // AUTHENTICITY DECISION
    const interpretation = validator.interpretValidationResult(validationResult);
    
    //  HANDLE OCR PIPELINE FAILURES (still process validation results)
    if (!ocrResult.success) {
      return res.status(200).json({
        message: "Multi-angle hologram validation complete (OCR processing failed)",
        hologramAuthenticity: {
          isAuthentic: validationResult.isAuthentic,
          confidence: validationResult.confidence,
          securityLevel: validationResult.securityLevel,
          interpretation,
          validationDetails: validationResult.validationDetails
        },
        ocrError: ocrResult.error,
        processedAngles: files.length,
        recommendation: validationResult.isAuthentic ? 
          "Document shows authentic hologram features" : 
          "Document requires manual verification - hologram authenticity questionable"
      });
    }

    // Success response with both validation and OCR results
    const parsedData = ocrResult.parsedData;
    const studentInfo = parsedData.student_info;

    // Check if we have enough data for blockchain operations
    const hasRequiredData = studentInfo?.name && 
                           studentInfo.registration_no && 
                           studentInfo.department && 
                           studentInfo.programme && 
                           studentInfo.valid_until;

    let blockchainResult = null;
    if (hasRequiredData) {
      // Generate certificate hash and check blockchain
      const certHash = createCertificateHash({
        name: studentInfo.name as string,
        registration_no: studentInfo.registration_no as string,
        department: studentInfo.department as string,
        programme: studentInfo.programme as string,
        valid_until: studentInfo.valid_until as string,
      });
      
      const certExists = await checkCertificateExists(certHash);
      blockchainResult = { certExists, certHash };
    }

    //COMPREHENSIVE VALIDATION RESPONSE
    res.json({
      message: `Multi-angle hologram validation complete: ${validationResult.isAuthentic ? 'AUTHENTIC' : 'SUSPICIOUS'}`,
      
      // Phase 2 Validation Results
      hologramAuthenticity: {
        isAuthentic: validationResult.isAuthentic,
        confidence: validationResult.confidence,
        securityLevel: validationResult.securityLevel,
        interpretation,
        validationDetails: validationResult.validationDetails
      },
      
      // OCR Results
      ocrResults: {
        parsed: parsedData,
        processingTime: ocrResult.processingTime,
        hasRequiredFields: hasRequiredData
      },
      
      //Blockchain Verification (if available)
      ...(blockchainResult && {
        blockchainVerification: {
          certificateExists: blockchainResult.certExists,
          certificateHash: blockchainResult.certHash
        }
      }),
      
      // Processing Metrics
      processingMetrics: {
        anglesProcessed: files.length,
        validationTime: Date.now(),
        totalProcessingTime: ocrResult.processingTime
      },
      
      // Final Recommendation
      recommendation: generateSecurityRecommendation(validationResult, blockchainResult),

      // Next Steps
      nextSteps: validationResult.isAuthentic ? 
        "Document passed multi-angle validation - proceed with confidence" :
        "Manual verification recommended - document shows inconsistent hologram patterns"
    });

  } catch (error) {
    console.error(' Multi-angle validation error:', error);
    res.status(500).json({ 
      error: "Multi-angle hologram validation failed",
      details: error instanceof Error ? error.message : 'Unknown error',
      processedAngles: uploadedFiles.length
    });
  } finally {
    // Cleanup uploaded files
    uploadedFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }
};

//SECURITY RECOMMENDATION GENERATOR
function generateSecurityRecommendation(
  validationResult: any, 
  blockchainResult: any
): string {
  if (!validationResult.isAuthentic) {
    return "HIGH RISK: Document failed multi-angle hologram validation. Manual inspection required.";
  }
  
  if (blockchainResult?.certExists) {
    return " VERIFIED: Document has authentic hologram AND exists on blockchain. High confidence.";
  }
  
  switch (validationResult.securityLevel) {
    case 'HIGH':
      return "AUTHENTIC: High-confidence hologram validation passed. Document appears genuine.";
    case 'MEDIUM':
      return " MODERATE: Hologram appears authentic but with minor inconsistencies. Consider additional verification.";
    case 'LOW':
      return "LOW CONFIDENCE: Hologram validation passed but with concerns. Manual verification recommended.";
    default:
      return " Multi-angle validation complete.";
  }
}
