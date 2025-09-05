import Tesseract from "tesseract.js";

export async function runOCR(imagePath: string): Promise<string> {
  const result = await Tesseract.recognize(imagePath, "eng", {
    logger: (m) => console.log(m),
  });
  return result.data.text;
}