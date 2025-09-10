import "dotenv/config";
import app from "./app";
const PORT = process.env.PORT || 8000;
import { connectDB } from "./utils/connectDb";

// Connect to DB
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ OCR server running at http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error("❌ Failed to start server:", err);

});