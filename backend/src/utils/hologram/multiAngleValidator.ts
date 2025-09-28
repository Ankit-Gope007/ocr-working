// Multi-angle hologram validation for Phase 2 authentication

import { HologramDetectionResult, HologramValidationResult } from './types';
import { 
  MIN_ANGLES_REQUIRED, 
  MAX_ANGLES_ALLOWED, 
  AUTHENTICITY_THRESHOLD,
  SECURITY_LEVELS 
} from './constants';
import { calculateCorrelation, calculateWeightedAverage, calculateVariance } from './mathUtils';
import { analyzeColors } from './colorAnalysis';
import { analyzeTexture } from './textureAnalysis';
import { analyzeReflection } from './reflectionAnalysis';

/**
 * Multi-Angle Hologram Validator - Phase 2 System
 * Validates hologram authenticity by analyzing consistency across multiple viewing angles
 */
export class MultiAngleHologramValidator {

  /**
   * Main validation function - analyzes multiple angles for authenticity
   */
  async validateHologramAuthenticity(imagePaths: string[]): Promise<HologramValidationResult> {
    console.log(`Starting multi-angle hologram validation with ${imagePaths.length} images`);
    
    // Validate input
    if (imagePaths.length < MIN_ANGLES_REQUIRED) {
      throw new Error(`Minimum ${MIN_ANGLES_REQUIRED} angles required for validation`);
    }
    
    if (imagePaths.length > MAX_ANGLES_ALLOWED) {
      throw new Error(`Maximum ${MAX_ANGLES_ALLOWED} angles allowed for validation`);
    }

    try {
      // Step 1: Analyze each angle individually
      const angleAnalyses = await this.analyzeAllAngles(imagePaths);
      
      // Step 2: Cross-validate consistency between angles
      const consistencyResults = await this.validateConsistency(angleAnalyses);
      
      // Step 3: Calculate overall authenticity score
      const authenticityScore = this.calculateAuthenticityScore(consistencyResults);
      
      // Step 4: Determine final verdict
      const isAuthentic = authenticityScore >= AUTHENTICITY_THRESHOLD;
      const securityLevel = this.determineSecurityLevel(authenticityScore);
      
      console.log(`Multi-angle validation complete: ${isAuthentic ? 'AUTHENTIC' : 'SUSPICIOUS'} (${authenticityScore}% confidence)`);
      
      return {
        isAuthentic,
        confidence: authenticityScore,
        securityLevel,
        validationDetails: {
          colorConsistency: consistencyResults.colorConsistency,
          patternMatching: consistencyResults.patternMatching,
          reflectionAnalysis: consistencyResults.reflectionAnalysis,
          angleConsistency: consistencyResults.angleConsistency
        }
      };
      
    } catch (error) {
      console.error('Multi-angle validation error:', error);
      
      // Return safe default on error
      return {
        isAuthentic: false,
        confidence: 0,
        securityLevel: 'LOW',
        validationDetails: {
          colorConsistency: 0,
          patternMatching: 0,
          reflectionAnalysis: 0,
          angleConsistency: 0
        }
      };
    }
  }

  /**
   * Analyze each angle individually to get baseline hologram data
   */
  private async analyzeAllAngles(imagePaths: string[]): Promise<HologramDetectionResult[]> {
    console.log('Analyzing individual angles...');
    
    // Run hologram detection on all angles in parallel
    const analyses = await Promise.all(
      imagePaths.map(async (imagePath, index) => {
        console.log(`Analyzing angle ${index + 1}: ${imagePath}`);
        
        // Run the three analysis components in parallel for each angle
        const [colorResult, textureResult, reflectionResult] = await Promise.all([
          analyzeColors(imagePath),
          analyzeTexture(imagePath),
          analyzeReflection(imagePath)
        ]);
        
        // Create hologram detection result for this angle
        return {
          hasHologram: true, // We only get here if Phase 1 detected hologram
          confidence: (colorResult.confidence + textureResult.confidence + reflectionResult.confidence) / 3,
          detectedFeatures: {
            colorShift: colorResult.hasIridescence,
            metallicReflection: reflectionResult.hasSpecularHighlights,
            geometricPattern: textureResult.hasHolographicPattern,
            textureComplexity: textureResult.textureComplexity
          },
          requiresMultipleAngles: true,
          processingTime: 0, // Not relevant for individual analysis
          analysisDetails: {
            colorAnalysis: colorResult,
            textureAnalysis: textureResult,
            reflectionAnalysis: reflectionResult
          }
        };
      })
    );
    
    console.log(`Individual angle analysis complete for ${analyses.length} angles`);
    return analyses;
  }

  /**
   * Validate consistency between different angles
   */
  private async validateConsistency(angleAnalyses: HologramDetectionResult[]): Promise<{
    colorConsistency: number;
    patternMatching: number;
    reflectionAnalysis: number;
    angleConsistency: number;
  }> {
    console.log('Validating cross-angle consistency...');
    
    // Extract analysis data for comparison
    const colorData = angleAnalyses.map(analysis => analysis.analysisDetails.colorAnalysis);
    const textureData = angleAnalyses.map(analysis => analysis.analysisDetails.textureAnalysis);
    const reflectionData = angleAnalyses.map(analysis => analysis.analysisDetails.reflectionAnalysis);
    const confidenceScores = angleAnalyses.map(analysis => analysis.confidence);
    
    // Validate color consistency across angles
    const colorConsistency = this.validateColorConsistency(colorData);
    
    // Validate pattern/texture consistency
    const patternMatching = this.validatePatternConsistency(textureData);
    
    // Validate reflection behavior consistency  
    const reflectionAnalysis = this.validateReflectionConsistency(reflectionData);
    
    // Validate overall confidence consistency
    const angleConsistency = this.validateAngleConsistency(confidenceScores);
    
    console.log('Consistency validation results:', {
      colorConsistency,
      patternMatching,
      reflectionAnalysis,
      angleConsistency
    });
    
    return {
      colorConsistency,
      patternMatching,
      reflectionAnalysis,
      angleConsistency
    };
  }

  /**
   * Validate color consistency across different viewing angles
   */
  private validateColorConsistency(colorData: any[]): number {
    if (colorData.length < 2) return 0;
    
    // Check if all angles show similar iridescence behavior
    const iridescenceCount = colorData.filter(data => data.hasIridescence).length;
    const iridescenceConsistency = (iridescenceCount / colorData.length) * 100;
    
    // Check metallic signature consistency
    const metallicCount = colorData.filter(data => data.metallicSignature).length;
    const metallicConsistency = (metallicCount / colorData.length) * 100;
    
    // Check color variance consistency (should be similar across angles)
    const variances = colorData.map(data => data.colorVariance);
    const varianceConsistency = 100 - (calculateVariance(variances) / Math.max(...variances)) * 100;
    
    // Combined color consistency score
    return (iridescenceConsistency + metallicConsistency + varianceConsistency) / 3;
  }

  /**
   * Validate pattern/texture consistency across angles
   */
  private validatePatternConsistency(textureData: any[]): number {
    if (textureData.length < 2) return 0;
    
    // Check holographic pattern detection consistency
    const patternCount = textureData.filter(data => data.hasHolographicPattern).length;
    const patternConsistency = (patternCount / textureData.length) * 100;
    
    // Check geometric pattern consistency
    const geometricCount = textureData.filter(data => data.geometricPattern).length;
    const geometricConsistency = (geometricCount / textureData.length) * 100;
    
    // Check texture complexity similarity (should be similar for authentic holograms)
    const complexities = textureData.map(data => data.textureComplexity);
    const complexityVariance = calculateVariance(complexities);
    const complexityConsistency = 100 - Math.min(100, complexityVariance / 10); // Normalize variance
    
    // Combined pattern consistency score
    return (patternConsistency + geometricConsistency + complexityConsistency) / 3;
  }

  /**
   * Validate reflection behavior consistency across angles
   */
  private validateReflectionConsistency(reflectionData: any[]): number {
    if (reflectionData.length < 2) return 0;
    
    // Check specular highlight consistency
    const highlightCount = reflectionData.filter(data => data.hasSpecularHighlights).length;
    const highlightConsistency = (highlightCount / reflectionData.length) * 100;
    
    // Check surface type consistency (should be similar)
    const surfaceTypes = reflectionData.map(data => data.surfaceType);
    const uniqueTypes = [...new Set(surfaceTypes)];
    const surfaceConsistency = ((surfaceTypes.length - uniqueTypes.length + 1) / surfaceTypes.length) * 100;
    
    // Check reflection intensity correlation across angles
    const intensities = reflectionData.map(data => data.reflectionIntensity);
    const intensityVariance = calculateVariance(intensities);
    const intensityConsistency = 100 - Math.min(100, intensityVariance / 50); // Normalize variance
    
    // Combined reflection consistency score
    return (highlightConsistency + surfaceConsistency + intensityConsistency) / 3;
  }

  /**
   * Validate overall confidence consistency across angles
   */
  private validateAngleConsistency(confidenceScores: number[]): number {
    if (confidenceScores.length < 2) return 0;
    
    // Calculate how consistent the confidence scores are
    const variance = calculateVariance(confidenceScores);
    const meanConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
    
    // Higher consistency = lower variance relative to mean
    const consistencyScore = 100 - Math.min(100, (variance / meanConfidence) * 100);
    
    return Math.max(0, consistencyScore);
  }

  /**
   * Calculate overall authenticity score based on all consistency metrics
   */
  private calculateAuthenticityScore(consistencyResults: {
    colorConsistency: number;
    patternMatching: number;
    reflectionAnalysis: number;
    angleConsistency: number;
  }): number {
    
    // Weighted scoring for different consistency aspects
    const weights = [0.3, 0.25, 0.25, 0.2]; // Color, Pattern, Reflection, Angle
    const scores = [
      consistencyResults.colorConsistency,
      consistencyResults.patternMatching,
      consistencyResults.reflectionAnalysis,
      consistencyResults.angleConsistency
    ];
    
    const weightedScore = calculateWeightedAverage(scores, weights);
    
    return Math.round(weightedScore * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Determine security level based on authenticity score
   */
  private determineSecurityLevel(authenticityScore: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (authenticityScore >= SECURITY_LEVELS.HIGH) {
      return 'HIGH';
    } else if (authenticityScore >= SECURITY_LEVELS.MEDIUM) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Get human-readable interpretation of validation results
   */
  interpretValidationResult(result: HologramValidationResult): string {
    if (!result.isAuthentic) {
      if (result.confidence < 30) {
        return `COUNTERFEIT DETECTED: Multi-angle analysis shows inconsistent hologram patterns (${result.confidence}% authenticity)`;
      } else {
        return `SUSPICIOUS DOCUMENT: Hologram shows some inconsistencies across angles (${result.confidence}% authenticity)`;
      }
    }
    
    switch (result.securityLevel) {
      case 'HIGH':
        return `AUTHENTIC HOLOGRAM: High confidence multi-angle validation passed (${result.confidence}% authenticity)`;
      case 'MEDIUM':
        return `LIKELY AUTHENTIC: Moderate confidence in hologram authenticity (${result.confidence}% authenticity)`;
      case 'LOW':
        return `LOW CONFIDENCE: Hologram appears authentic but with some inconsistencies (${result.confidence}% authenticity)`;
      default:
        return `Hologram validation complete (${result.confidence}% authenticity)`;
    }
  }
}
