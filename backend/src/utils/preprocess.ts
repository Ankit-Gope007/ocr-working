// import sharp from "sharp";

// export async function preprocessImage(inputPath: string, outputPath: string) {
//   await sharp(inputPath)
//     .grayscale()
//     .normalize()
//     .toFile(outputPath);
// }

import sharp from "sharp";
// import cv from "opencv4nodejs"; // optional for deskew
// import fs from "fs";

export async function preprocessImage(inputPath: string, outputPath: string) {
  // Step 1: Grayscale + normalize + sharpen
  let image = sharp(inputPath)
    .grayscale()
    .normalize()
    .threshold(130) // increase if needed
    .sharpen(1); // increase if needed

  // Step 2: Threshold / Binarize
  // Using a fixed threshold (you can experiment or use adaptive)
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const threshold = 150;
  // for (let i = 0; i < data.length; i++) {
  //   data[i] = data[i] > threshold ? 255 : 0;
  // }

  await sharp(data, { raw: info }).toFile(outputPath);

  // Optional Step 3: Deskew using OpenCV
  // This requires converting the image to OpenCV Mat
  // You can skip this if skew is not significant
  /*
  const mat = cv.imread(outputPath, cv.IMREAD_GRAYSCALE);
  const coords = cv.findNonZero(mat);
  const rect = cv.minAreaRect(coords);
  const angle = rect.angle < -45 ? rect.angle + 90 : rect.angle;

  const center = new cv.Point2(mat.cols / 2, mat.rows / 2);
  const M = cv.getRotationMatrix2D(center, angle, 1);
  const rotated = mat.warpAffine(M, new cv.Size(mat.cols, mat.rows), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Vec(255, 255, 255));
  cv.imwrite(outputPath, rotated);
  */
}