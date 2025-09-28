// Texture analysis for hologram detection using Jimp and ml-matrix

import { Jimp } from 'jimp';
import { Matrix } from 'ml-matrix';
import { TextureAnalysisResult } from './types';
import { 
  TEXTURE_COMPLEXITY_THRESHOLD, 
  PATTERN_REGULARITY_THRESHOLD,
  GEOMETRIC_PATTERN_THRESHOLD 
} from './constants';
import { calculateEntropy, calculateVariance, normalizeToPercentage } from './mathUtils';

/**
 * Main texture analysis function
 */
export async function analyzeTexture(imagePath: string): Promise<TextureAnalysisResult> {
  try {
    // Load image with Jimp and convert to grayscale
    const image = await Jimp.read(imagePath);
    const grayImage = image.resize({ w: 400, h: 300 }).greyscale(); // Optimize size for processing
    
    // Extract pixel matrix
    const pixelMatrix = extractPixelMatrix(grayImage);
    
    // Perform texture analyses
    const complexity = calculateTextureComplexity(pixelMatrix);
    const patterns = detectHolographicPatterns(pixelMatrix);
    const regularity = measurePatternRegularity(pixelMatrix);
    const geometric = detectGeometricPatterns(pixelMatrix);
    
    // Calculate confidence
    const confidence = calculateTextureConfidence({
      complexity,
      patterns,
      regularity,
      geometric
    });
    
    return {
      textureComplexity: complexity,
      hasHolographicPattern: patterns,
      geometricPattern: geometric,
      patternRegularity: regularity,
      confidence
    };
    
  } catch (error) {
    console.error('Texture analysis error:', error);
    return {
      textureComplexity: 0,
      hasHolographicPattern: false,
      geometricPattern: false,
      patternRegularity: 0,
      confidence: 0
    };
  }
}

/**
 * Extract pixel matrix from Jimp image
 */
function extractPixelMatrix(image: typeof Jimp.prototype): Matrix {
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const matrix = new Matrix(height, width);
  
  // Fill matrix with grayscale pixel values
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = image.getPixelColor(x, y);
      // Extract red component (since it's grayscale, R=G=B)
      const gray = (pixel >> 16) & 0xFF;
      matrix.set(y, x, gray);
    }
  }
  
  return matrix;
}

/**
 * Calculate texture complexity using entropy and variance
 */
function calculateTextureComplexity(matrix: Matrix): number {
  const data = matrix.to1DArray();
  
  // Calculate entropy (measure of randomness/complexity)
  const entropy = calculateEntropy(data);
  
  // Calculate local variance (measure of texture variation)
  const localVariances = calculateLocalVariances(matrix, 5); // 5x5 windows
  const averageVariance = localVariances.reduce((sum, val) => sum + val, 0) / localVariances.length;
  
  // Combine entropy and variance for overall complexity score
  const entropyScore = normalizeToPercentage(entropy, 0, 8); // Entropy typically ranges 0-8
  const varianceScore = normalizeToPercentage(averageVariance, 0, 10000); // Variance range
  
  return (entropyScore + varianceScore) / 2;
}

/**
 * Calculate local variances using sliding window
 */
function calculateLocalVariances(matrix: Matrix, windowSize: number): number[] {
  const variances: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);
  const rows = matrix.rows;
  const cols = matrix.columns;
  
  for (let y = halfWindow; y < rows - halfWindow; y += windowSize) {
    for (let x = halfWindow; x < cols - halfWindow; x += windowSize) {
      // Extract window values
      const windowValues: number[] = [];
      for (let dy = -halfWindow; dy <= halfWindow; dy++) {
        for (let dx = -halfWindow; dx <= halfWindow; dx++) {
          if (y + dy >= 0 && y + dy < rows && x + dx >= 0 && x + dx < cols) {
            windowValues.push(matrix.get(y + dy, x + dx));
          }
        }
      }
      
      if (windowValues.length > 0) {
        variances.push(calculateVariance(windowValues));
      }
    }
  }
  
  return variances;
}

/**
 * Detect holographic patterns using edge detection and pattern analysis
 */
function detectHolographicPatterns(matrix: Matrix): boolean {
  // Apply simple edge detection (Sobel-like)
  const edges = detectEdges(matrix);
  
  // Count edge pixels
  const edgeData = edges.to1DArray();
  const strongEdges = edgeData.filter(val => val > 100).length;
  const totalPixels = edgeData.length;
  const edgeRatio = strongEdges / totalPixels;
  
  // Holographic patterns typically have many fine edges/details
  return edgeRatio > 0.1; // More than 10% edge pixels
}

/**
 * Simple edge detection
 */
function detectEdges(matrix: Matrix): Matrix {
  const rows = matrix.rows;
  const cols = matrix.columns;
  const edges = new Matrix(rows, cols);
  
  // Sobel operators
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      let gx = 0, gy = 0;
      
      // Apply Sobel operators
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const pixel = matrix.get(y + dy, x + dx);
          gx += pixel * sobelX[dy + 1][dx + 1];
          gy += pixel * sobelY[dy + 1][dx + 1];
        }
      }
      
      // Calculate edge magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges.set(y, x, magnitude);
    }
  }
  
  return edges;
}

/**
 * Measure pattern regularity using autocorrelation
 */
function measurePatternRegularity(matrix: Matrix): number {
  // Sample smaller regions for efficiency
  const sampleSize = Math.min(100, Math.floor(Math.sqrt(matrix.rows * matrix.columns / 4)));
  
  if (sampleSize < 10) return 0;
  
  // Extract a sample region from the center
  const centerY = Math.floor(matrix.rows / 2);
  const centerX = Math.floor(matrix.columns / 2);
  const halfSample = Math.floor(sampleSize / 2);
  
  const sample: number[] = [];
  for (let y = centerY - halfSample; y < centerY + halfSample && y < matrix.rows; y++) {
    for (let x = centerX - halfSample; x < centerX + halfSample && x < matrix.columns; x++) {
      if (y >= 0 && x >= 0) {
        sample.push(matrix.get(y, x));
      }
    }
  }
  
  if (sample.length < 4) return 0;
  
  // Calculate regularity using variance of differences
  const differences: number[] = [];
  for (let i = 1; i < sample.length; i++) {
    differences.push(Math.abs(sample[i] - sample[i - 1]));
  }
  
  const variance = calculateVariance(differences);
  return normalizeToPercentage(variance, 0, 10000);
}

/**
 * Detect geometric patterns (circles, lines, regular shapes)
 */
function detectGeometricPatterns(matrix: Matrix): boolean {
  // Simple geometric pattern detection using line detection
  const edges = detectEdges(matrix);
  const edgeData = edges.to1DArray();
  
  // Look for consistent edge patterns
  const strongEdges = edgeData.filter(val => val > 120);
  const moderateEdges = edgeData.filter(val => val > 60 && val <= 120);
  
  // Geometric patterns have both strong and moderate edges in specific ratios
  const strongRatio = strongEdges.length / edgeData.length;
  const moderateRatio = moderateEdges.length / edgeData.length;
  
  return strongRatio > 0.05 && moderateRatio > 0.15;
}

/**
 * Calculate overall texture analysis confidence
 */
function calculateTextureConfidence(results: {
  complexity: number;
  patterns: boolean;
  regularity: number;
  geometric: boolean;
}): number {
  let confidence = 0;
  
  // Complexity contribution (0-40 points)
  confidence += Math.min(40, results.complexity * 0.4);
  
  // Pattern detection contribution (0-25 points)
  if (results.patterns) confidence += 25;
  
  // Regularity contribution (0-20 points) - inverse relationship for holograms
  confidence += Math.max(0, 20 - (results.regularity * 0.2));
  
  // Geometric patterns contribution (0-15 points)
  if (results.geometric) confidence += 15;
  
  return Math.min(100, confidence);
}
