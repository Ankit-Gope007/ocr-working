// Mathematical utilities for hologram detection

/**
 * Calculate variance of an array of numbers
 */
export function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
export function calculateStandardDeviation(values: number[]): number {
  return Math.sqrt(calculateVariance(values));
}

/**
 * Calculate entropy of an array (measure of randomness/complexity)
 */
export function calculateEntropy(values: number[]): number {
  const histogram: { [key: number]: number } = {};
  const total = values.length;
  
  // Build histogram
  values.forEach(val => {
    const bucket = Math.floor(val / 10) * 10; // Group into buckets of 10
    histogram[bucket] = (histogram[bucket] || 0) + 1;
  });
  
  // Calculate entropy
  let entropy = 0;
  Object.values(histogram).forEach(count => {
    const probability = count / total;
    if (probability > 0) {
      entropy -= probability * Math.log2(probability);
    }
  });
  
  return entropy;
}

/**
 * Normalize value to 0-100 range
 */
export function normalizeToPercentage(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

/**
 * Calculate weighted average
 */
export function calculateWeightedAverage(values: number[], weights: number[]): number {
  if (values.length !== weights.length) {
    throw new Error('Values and weights arrays must have the same length');
  }
  
  const weightedSum = values.reduce((sum, val, i) => sum + (val * weights[i]), 0);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Find local maxima in an array (peaks)
 */
export function findLocalMaxima(values: number[], threshold: number = 0): number[] {
  const peaks: number[] = [];
  
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] > values[i - 1] && 
        values[i] > values[i + 1] && 
        values[i] > threshold) {
      peaks.push(i);
    }
  }
  
  return peaks;
}

/**
 * Calculate correlation between two arrays
 */
export function calculateCorrelation(arr1: number[], arr2: number[]): number {
  if (arr1.length !== arr2.length || arr1.length === 0) return 0;
  
  const mean1 = arr1.reduce((sum, val) => sum + val, 0) / arr1.length;
  const mean2 = arr2.reduce((sum, val) => sum + val, 0) / arr2.length;
  
  let numerator = 0;
  let sum1Sq = 0;
  let sum2Sq = 0;
  
  for (let i = 0; i < arr1.length; i++) {
    const diff1 = arr1[i] - mean1;
    const diff2 = arr2[i] - mean2;
    
    numerator += diff1 * diff2;
    sum1Sq += diff1 * diff1;
    sum2Sq += diff2 * diff2;
  }
  
  const denominator = Math.sqrt(sum1Sq * sum2Sq);
  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Smooth an array using moving average
 */
export function smoothArray(values: number[], windowSize: number = 3): number[] {
  if (windowSize <= 1) return values;
  
  const smoothed: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);
  
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(values.length, i + halfWindow + 1);
    const window = values.slice(start, end);
    const average = window.reduce((sum, val) => sum + val, 0) / window.length;
    smoothed.push(average);
  }
  
  return smoothed;
}
