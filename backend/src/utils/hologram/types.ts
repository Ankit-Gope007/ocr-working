// Hologram detection types and interfaces

export interface HologramDetectionResult {
  hasHologram: boolean;
  confidence: number; // 0-100
  detectedFeatures: {
    colorShift: boolean;
    metallicReflection: boolean;
    geometricPattern: boolean;
    textureComplexity: number;
  };
  requiresMultipleAngles: boolean; // KEY DECISION POINT
  processingTime: number;
  analysisDetails: {
    colorAnalysis: ColorAnalysisResult;
    textureAnalysis: TextureAnalysisResult;
    reflectionAnalysis: ReflectionAnalysisResult;
  };
}

export interface ColorAnalysisResult {
  hasIridescence: boolean;
  colorVariance: number;
  metallicSignature: boolean;
  hueShiftPattern: number[];
  confidence: number;
}

export interface TextureAnalysisResult {
  textureComplexity: number;
  hasHolographicPattern: boolean;
  geometricPattern: boolean;
  patternRegularity: number;
  confidence: number;
}

export interface ReflectionAnalysisResult {
  hasSpecularHighlights: boolean;
  reflectionIntensity: number;
  surfaceType: 'matte' | 'glossy' | 'metallic' | 'holographic';
  highlightCount: number;
  confidence: number;
}

export interface HologramValidationResult {
  isAuthentic: boolean;
  confidence: number;
  securityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  validationDetails: {
    colorConsistency: number;
    patternMatching: number;
    reflectionAnalysis: number;
    angleConsistency: number;
  };
}

export interface PixelData {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}
