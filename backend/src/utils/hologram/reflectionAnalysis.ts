// Reflection analysis for hologram detection using Sharp

import sharp from 'sharp';
import { ReflectionAnalysisResult, PixelData } from './types';
import { 
  SPECULAR_HIGHLIGHT_THRESHOLD, 
  REFLECTION_INTENSITY_THRESHOLD,
  BRIGHT_SPOT_THRESHOLD 
} from './constants';
import { calculateVariance, calculateEntropy, normalizeToPercentage, findLocalMaxima } from './mathUtils';

/**
 * Main reflection analysis function
 */
export async function analyzeReflection(imagePath: string): Promise<ReflectionAnalysisResult> {
  try {
    // Extract grayscale pixel data for brightness analysis
    const pixelData = await extractGrayscalePixelData(imagePath);
    
    // Perform reflection analyses
    const highlights = detectSpecularHighlights(pixelData);
    const intensity = calculateReflectionIntensity(pixelData);
    const surface = classifySurfaceType(highlights, intensity);
    
    // Calculate confidence
    const confidence = calculateReflectionConfidence({
      highlights,
      intensity,
      surface
    });
    
    return {
      hasSpecularHighlights: highlights.count > SPECULAR_HIGHLIGHT_THRESHOLD,
      reflectionIntensity: intensity,
      surfaceType: surface,
      highlightCount: highlights.count,
      confidence
    };
    
  } catch (error) {
    console.error('Reflection analysis error:', error);
    return {
      hasSpecularHighlights: false,
      reflectionIntensity: 0,
      surfaceType: 'matte',
      highlightCount: 0,
      confidence: 0
    };
  }
}

/**
 * Extract grayscale pixel data using Sharp
 */
async function extractGrayscalePixelData(imagePath: string): Promise<PixelData> {
  const image = sharp(imagePath);
  const { data, info } = await image
    .resize(600, 450, { fit: 'inside', withoutEnlargement: true })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  return {
    data,
    width: info.width,
    height: info.height,
    channels: 1 // Grayscale
  };
}

/**
 * Detect specular highlights (bright spots indicating reflective surfaces)
 */
function detectSpecularHighlights(pixelData: PixelData): { count: number; positions: number[]; intensity: number } {
  const { data, width, height } = pixelData;
  const brightSpots: number[] = [];
  const intensityValues: number[] = [];
  
  // Find bright spots using adaptive threshold
  const pixelArray = Array.from(data);
  const meanBrightness = pixelArray.reduce((sum, val) => sum + val, 0) / pixelArray.length;
  const threshold = Math.max(BRIGHT_SPOT_THRESHOLD, meanBrightness + 50);
  
  for (let i = 0; i < data.length; i++) {
    if (data[i] > threshold) {
      brightSpots.push(i);
      intensityValues.push(data[i]);
    }
  }
  
  // Filter out isolated pixels - look for clusters
  const clusters = findBrightSpotClusters(brightSpots, width, height);
  
  return {
    count: clusters.length,
    positions: brightSpots,
    intensity: intensityValues.length > 0 ? 
      intensityValues.reduce((sum, val) => sum + val, 0) / intensityValues.length : 0
  };
}

/**
 * Find clusters of bright spots (to filter out noise)
 */
function findBrightSpotClusters(brightSpots: number[], width: number, height: number): number[][] {
  const clusters: number[][] = [];
  const visited = new Set<number>();
  
  for (const spot of brightSpots) {
    if (visited.has(spot)) continue;
    
    const cluster: number[] = [];
    const queue = [spot];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      
      visited.add(current);
      cluster.push(current);
      
      // Check neighboring pixels
      const y = Math.floor(current / width);
      const x = current % width;
      
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          const neighborIndex = ny * width + nx;
          
          if (ny >= 0 && ny < height && nx >= 0 && nx < width &&
              brightSpots.includes(neighborIndex) && !visited.has(neighborIndex)) {
            queue.push(neighborIndex);
          }
        }
      }
    }
    
    // Only consider clusters with at least 3 pixels
    if (cluster.length >= 3) {
      clusters.push(cluster);
    }
  }
  
  return clusters;
}

/**
 * Calculate overall reflection intensity
 */
function calculateReflectionIntensity(pixelData: PixelData): number {
  const { data } = pixelData;
  
  // Calculate various intensity metrics
  const pixelArray = Array.from(data);
  const maxIntensity = Math.max(...pixelArray);
  const meanIntensity = pixelArray.reduce((sum, val) => sum + val, 0) / pixelArray.length;
  const variance = calculateVariance(pixelArray);
  
  // High-intensity pixels ratio
  const highIntensityPixels = pixelArray.filter(val => val > 200).length;
  const highIntensityRatio = highIntensityPixels / pixelArray.length;
  
  // Combine metrics for overall intensity score
  const intensityScore = (
    (maxIntensity * 0.3) +
    (meanIntensity * 0.3) +
    (Math.min(100, variance / 10) * 0.2) +
    (highIntensityRatio * 100 * 0.2)
  );
  
  return Math.min(255, intensityScore);
}

/**
 * Classify surface type based on reflection characteristics
 */
function classifySurfaceType(
  highlights: { count: number; intensity: number }, 
  intensity: number
): 'matte' | 'glossy' | 'metallic' | 'holographic' {
  
  // Decision tree based on highlight count and intensity
  if (highlights.count === 0 && intensity < 100) {
    return 'matte';
  }
  
  if (highlights.count < 3 && intensity < 150) {
    return 'glossy';
  }
  
  if (highlights.count >= 3 && intensity > REFLECTION_INTENSITY_THRESHOLD) {
    // High number of highlights with high intensity suggests holographic surface
    if (highlights.count > 8 && highlights.intensity > 220) {
      return 'holographic';
    }
    return 'metallic';
  }
  
  if (intensity > 180) {
    return 'metallic';
  }
  
  return 'glossy';
}

/**
 * Calculate reflection analysis confidence
 */
function calculateReflectionConfidence(results: {
  highlights: { count: number; intensity: number };
  intensity: number;
  surface: 'matte' | 'glossy' | 'metallic' | 'holographic';
}): number {
  let confidence = 0;
  
  // Highlight count contribution (0-30 points)
  confidence += Math.min(30, results.highlights.count * 3);
  
  // Intensity contribution (0-40 points)
  confidence += normalizeToPercentage(results.intensity, 0, 255) * 0.4;
  
  // Surface type contribution (0-30 points)
  switch (results.surface) {
    case 'holographic':
      confidence += 30;
      break;
    case 'metallic':
      confidence += 20;
      break;
    case 'glossy':
      confidence += 10;
      break;
    case 'matte':
      confidence += 0;
      break;
  }
  
  return Math.min(100, confidence);
}
