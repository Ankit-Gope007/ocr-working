import sharp from "sharp";

export async function preprocessImage(inputPath: string, outputPath: string) {
  await sharp(inputPath)
    .grayscale()
    .normalize()
    .toFile(outputPath);
}