// Color analysis for hologram detection using Sharp and color-convert

import sharp from 'sharp';
import convert from 'color-convert';
import { ColorAnalysisResult, PixelData } from './types';
import { 
  IRIDESCENCE_THRESHOLD, 
  HUE_VARIANCE_THRESHOLD, 
  METALLIC_SATURATION_THRESHOLD,
  RAINBOW_HUE_RANGE 
} from './constants';
import { calculateVariance, calculateEntropy, normalizeToPercentage } from './mathUtils';

/**
 * Main color analysis function
 */
export async function analyzeColors(imagePath: string): Promise<ColorAnalysisResult> {
  try {
    // Extract pixel data using Sharp
    const pixelData = await extractPixelData(imagePath);
    
    // Convert RGB pixels to HSV for better color analysis
    const hsvPixels = convertRGBToHSV(pixelData);
    
    // Perform various color analyses
    const hueVariance = calculateHueVariance(hsvPixels);
    const hasRainbowEffect = detectRainbowPattern(hsvPixels);
    const metallicColors = detectMetallicSignature(hsvPixels);
    const iridescence = detectIridescence(hsvPixels);
    const hueShiftPattern = extractHuePattern(hsvPixels);
    
    // Calculate confidence score
    const confidence = calculateColorConfidence({
      hueVariance,
      hasRainbowEffect,
      metallicColors,
      iridescence
    });
    
    return {
      hasIridescence: iridescence || hasRainbowEffect,
      colorVariance: hueVariance,
      metallicSignature: metallicColors,
      hueShiftPattern,
      confidence
    };
    
  } catch (error) {
    console.error('Color analysis error:', error);
    return {
      hasIridescence: false,
      colorVariance: 0,
      metallicSignature: false,
      hueShiftPattern: [],
      confidence: 0
    };
  }
}

/**
 * Extract pixel data using Sharp's built-in pixel extractor
 */
async function extractPixelData(imagePath: string): Promise<PixelData> {
  const image = sharp(imagePath);
  const { data, info } = await image
    .resize(800, 600, { fit: 'inside', withoutEnlargement: true }) // Optimize for processing
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  return {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels
  };
}

/**
 * Convert RGB pixel data to HSV color space
 */
function convertRGBToHSV(pixelData: PixelData): Array<[number, number, number]> {
  const { data, channels } = pixelData;
  const hsvPixels: Array<[number, number, number]> = [];
  
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1] || 0;
    const b = data[i + 2] || 0;
    
    // Convert RGB to HSV using color-convert
    const [h, s, v] = convert.rgb.hsv(r, g, b);
    hsvPixels.push([h, s, v]);
  }
  
  return hsvPixels;
}

/**
 * Calculate hue variance (measure of color diversity)
 */
function calculateHueVariance(hsvPixels: Array<[number, number, number]>): number {
  const hues = hsvPixels.map(([h]) => h);
  return calculateVariance(hues);
}

/**
 * Detect rainbow/iridescent patterns typical of holograms
 */
function detectRainbowPattern(hsvPixels: Array<[number, number, number]>): boolean {
  const hues = hsvPixels.map(([h]) => h);
  
  // Create hue histogram
  const hueHistogram = new Array(36).fill(0); // 36 bins for 360 degrees (10 degrees per bin)
  hues.forEach(hue => {
    const bin = Math.floor(hue / 10);
    if (bin >= 0 && bin < 36) {
      hueHistogram[bin]++;
    }
  });
  
  // Count how many different hue ranges are represented
  const activeRanges = hueHistogram.filter(count => count > hsvPixels.length * 0.01).length;
  
  // Rainbow effect: significant presence across multiple hue ranges
  return activeRanges >= 6; // At least 6 different hue ranges
}

/**
 * Detect metallic color signatures
 */
function detectMetallicSignature(hsvPixels: Array<[number, number, number]>): boolean {
  let metallicPixels = 0;
  
  for (const [h, s, v] of hsvPixels) {
    // Metallic surfaces typically have:
    // - Low saturation (greyish)
    // - High value (bright)
    // - Or specific metallic hues (gold, silver, copper)
    const isMetallicGrey = s < METALLIC_SATURATION_THRESHOLD && v > 60;
    const isMetallicHue = (h >= 35 && h <= 65) || // Gold range
                          (h >= 0 && h <= 30) ||   // Silver/white range
                          (h >= 15 && h <= 35);    // Copper range
    
    if (isMetallicGrey || (isMetallicHue && v > 40)) {
      metallicPixels++;
    }
  }
  
  // If more than 10% of pixels show metallic characteristics
  return (metallicPixels / hsvPixels.length) > 0.1;
}

/**
 * Detect overall iridescence
 */
function detectIridescence(hsvPixels: Array<[number, number, number]>): boolean {
  const hues = hsvPixels.map(([h]) => h);
  const saturations = hsvPixels.map(([, s]) => s);
  
  // Iridescent surfaces show high color variance and varying saturation
  const hueVariance = calculateVariance(hues);
  const saturationVariance = calculateVariance(saturations);
  
  return hueVariance > IRIDESCENCE_THRESHOLD && saturationVariance > 15;
}

/**
 * Extract hue shift pattern for analysis
 */
function extractHuePattern(hsvPixels: Array<[number, number, number]>): number[] {
  const { width } = { width: Math.sqrt(hsvPixels.length) }; // Approximate width
  const pattern: number[] = [];
  
  // Sample hues from different regions of the image
  const sampleSize = Math.min(20, Math.floor(hsvPixels.length / 100));
  const step = Math.floor(hsvPixels.length / sampleSize);
  
  for (let i = 0; i < hsvPixels.length; i += step) {
    if (hsvPixels[i]) {
      pattern.push(hsvPixels[i][0]); // Hue value
    }
  }
  
  return pattern;
}

/**
 * Calculate overall color analysis confidence
 */
function calculateColorConfidence(results: {
  hueVariance: number;
  hasRainbowEffect: boolean;  
  metallicColors: boolean;
  iridescence: boolean;
}): number {
  let confidence = 0;
  
  // Hue variance contribution (0-40 points)
  confidence += normalizeToPercentage(results.hueVariance, 0, 100) * 0.4;
  
  // Rainbow effect contribution (0-30 points)
  if (results.hasRainbowEffect) confidence += 30;
  
  // Metallic signature contribution (0-20 points)  
  if (results.metallicColors) confidence += 20;
  
  // Iridescence contribution (0-10 points)
  if (results.iridescence) confidence += 10;
  
  return Math.min(100, confidence);
}
