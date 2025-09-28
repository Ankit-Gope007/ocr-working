// Hologram detection constants and thresholds

// Detection thresholds
export const HOLOGRAM_DETECTION_THRESHOLD = 30; // 30% confidence to detect hologram
export const MULTI_ANGLE_THRESHOLD = 70; // 70% confidence to require multiple angles

// Color analysis thresholds
export const IRIDESCENCE_THRESHOLD = 25;
export const HUE_VARIANCE_THRESHOLD = 20;
export const METALLIC_SATURATION_THRESHOLD = 15;
export const RAINBOW_HUE_RANGE = 60; // degrees in HSV color space

// Texture analysis thresholds
export const TEXTURE_COMPLEXITY_THRESHOLD = 60;
export const PATTERN_REGULARITY_THRESHOLD = 0.3;
export const GEOMETRIC_PATTERN_THRESHOLD = 0.4;

// Reflection analysis thresholds
export const SPECULAR_HIGHLIGHT_THRESHOLD = 5;
export const REFLECTION_INTENSITY_THRESHOLD = 180; // 0-255 scale
export const BRIGHT_SPOT_THRESHOLD = 200;

// Confidence calculation weights
export const CONFIDENCE_WEIGHTS = {
  COLOR_ANALYSIS: 0.4,
  TEXTURE_ANALYSIS: 0.3,
  REFLECTION_ANALYSIS: 0.3
};

// Multi-angle validation thresholds
export const MIN_ANGLES_REQUIRED = 3;
export const MAX_ANGLES_ALLOWED = 5;
export const AUTHENTICITY_THRESHOLD = 70;

// Security level thresholds
export const SECURITY_LEVELS = {
  HIGH: 85,
  MEDIUM: 60,
  LOW: 0
};

// Image processing constants
export const MAX_IMAGE_SIZE = 2048; // Max width/height for processing
export const SAMPLE_REGION_SIZE = 100; // Pixel region size for analysis
