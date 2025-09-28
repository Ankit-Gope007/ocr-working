// Main hologram detector that orchestrates all analysis components

import { HologramDetectionResult } from './types';
import { HOLOGRAM_DETECTION_THRESHOLD, MULTI_ANGLE_THRESHOLD, CONFIDENCE_WEIGHTS } from './constants';
import { analyzeColors } from './colorAnalysis';
import { analyzeTexture } from './textureAnalysis';
import { analyzeReflection } from './reflectionAnalysis';
import { calculateWeightedAverage } from './mathUtils';

/**
 * Main HologramDetector class - Phase 1: Single Image Analysis
 */
export class HologramDetector {
  
  /**
   * Detect hologram presence in a single image
   * This is the main entry point for Phase 1 detection
   */
  async detectHologram(imagePath: string): Promise<HologramDetectionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Starting hologram detection on: ${imagePath}`);
      
      // Run all analyses in parallel for better performance
      const [colorResult, textureResult, reflectionResult] = await Promise.all([
        analyzeColors(imagePath),
        analyzeTexture(imagePath),
        analyzeReflection(imagePath)
      ]);
      
      console.log('Analysis results:', {
        color: colorResult.confidence,
        texture: textureResult.confidence,
        reflection: reflectionResult.confidence
      });
      
      // Combine results with weighted scoring
      const combinedResult = this.combineResults(
        colorResult, 
        textureResult, 
        reflectionResult, 
        startTime
      );
      
      console.log(`Hologram detection complete: ${combinedResult.hasHologram ? 'DETECTED' : 'NOT DETECTED'} (${combinedResult.confidence}% confidence)`);
      
      return combinedResult;
      
    } catch (error) {
      console.error('Hologram detection error:', error);
      
      // Return default result on error
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
        analysisDetails: {
          colorAnalysis: {
            hasIridescence: false,
            colorVariance: 0,
            metallicSignature: false,
            hueShiftPattern: [],
            confidence: 0
          },
          textureAnalysis: {
            textureComplexity: 0,
            hasHolographicPattern: false,
            geometricPattern: false,
            patternRegularity: 0,
            confidence: 0
          },
          reflectionAnalysis: {
            hasSpecularHighlights: false,
            reflectionIntensity: 0,
            surfaceType: 'matte',
            highlightCount: 0,
            confidence: 0
          }
        }
      };
    }
  }
  
  /**
   * Combine results from all analysis components
   */
  private combineResults(
    colorResult: any,
    textureResult: any,
    reflectionResult: any,
    startTime: number
  ): HologramDetectionResult {
    
    // Calculate weighted confidence score
    const confidenceScores = [
      colorResult.confidence,
      textureResult.confidence,
      reflectionResult.confidence
    ];
    
    const weights = [
      CONFIDENCE_WEIGHTS.COLOR_ANALYSIS,
      CONFIDENCE_WEIGHTS.TEXTURE_ANALYSIS,
      CONFIDENCE_WEIGHTS.REFLECTION_ANALYSIS
    ];
    
    const overallConfidence = calculateWeightedAverage(confidenceScores, weights);
    
    // DECISION LOGIC - Three possible outcomes:
    // 1. No hologram detected (confidence < 30%)
    // 2. Hologram detected - low confidence (30% <= confidence < 70%)
    // 3. Hologram detected - high confidence (confidence >= 70%) → requires multiple angles
    
    const hasHologram = overallConfidence >= HOLOGRAM_DETECTION_THRESHOLD;
    const requiresMultipleAngles = hasHologram && overallConfidence >= MULTI_ANGLE_THRESHOLD;
    
    // Extract detected features
    const detectedFeatures = {
      colorShift: colorResult.hasIridescence,
      metallicReflection: reflectionResult.hasSpecularHighlights,
      geometricPattern: textureResult.hasHolographicPattern || textureResult.geometricPattern,
      textureComplexity: textureResult.textureComplexity
    };
    
    const processingTime = Date.now() - startTime;
    
    // Log decision logic
    console.log(`Decision Logic:
      - Overall Confidence: ${overallConfidence.toFixed(1)}%
      - Has Hologram: ${hasHologram} (threshold: ${HOLOGRAM_DETECTION_THRESHOLD}%)
      - Requires Multiple Angles: ${requiresMultipleAngles} (threshold: ${MULTI_ANGLE_THRESHOLD}%)
      - Processing Time: ${processingTime}ms`);
    
    return {
      hasHologram,
      confidence: Math.round(overallConfidence * 100) / 100, // Round to 2 decimal places
      detectedFeatures,
      requiresMultipleAngles,
      processingTime,
      analysisDetails: {
        colorAnalysis: colorResult,
        textureAnalysis: textureResult,
        reflectionAnalysis: reflectionResult
      }
    };
  }
  
  /**
   * Get a human-readable interpretation of the detection result
   */
  interpretResult(result: HologramDetectionResult): string {
    if (!result.hasHologram) {
      return "No hologram detected. Document will proceed with standard verification.";
    }
    
    if (result.requiresMultipleAngles) {
      return `High-confidence hologram detected (${result.confidence}%)! Multiple angles required for enhanced security verification.`;
    }
    
    return `Basic hologram features detected (${result.confidence}%). Document will proceed with enhanced metadata.`;
  }
  
  /**
   * Get recommended next steps based on detection result
   */
  getNextSteps(result: HologramDetectionResult): {
    action: 'continue' | 'request_multiple_angles';
    message: string;
    endpoint?: string;
  } {
    if (!result.hasHologram) {
      return {
        action: 'continue',
        message: 'Proceed with normal OCR processing'
      };
    }
    
    if (result.requiresMultipleAngles) {
      return {
        action: 'request_multiple_angles',
        message: 'Request user to upload 3-5 different angles of the document',
        endpoint: '/api/ocr/upload/multi-angle'
      };
    }
    
    return {
      action: 'continue',
      message: 'Proceed with OCR processing and include basic hologram metadata'
    };
  }
}
