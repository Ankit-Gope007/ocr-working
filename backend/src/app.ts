import express from "express";
import cors from "cors";
import ocrRoutes from "./routes/ocrRoute";


const app = express();

app.use(cors(
  {
  origin: "https://ocr-working-6udoddpxr-ankit-gopes-projects-893eb2f8.vercel.app",
}
));
app.use(express.json());

// Routes
app.use("/api/ocr", ocrRoutes);


export default app;
