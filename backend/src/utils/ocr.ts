// import Tesseract from "tesseract.js";

// export async function runOCR(imagePath: string): Promise<string> {
//   const result = await Tesseract.recognize(imagePath, "eng", {
//     logger: (m) => console.log(m),
//   });
//   return result.data.text;
// }

import { createWorker } from "tesseract.js";

export async function runOCR(imagePath: string): Promise<string> {
  const worker = await createWorker("eng", 1, {
    logger: (m: any) => console.log(m),
  });

  await worker.load();
  await worker.reinitialize("eng");

  // Set whitelist here
  await worker.setParameters({
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/:."
  });

  const { data } = await worker.recognize(imagePath);
  await worker.terminate();

  return data.text;
}

