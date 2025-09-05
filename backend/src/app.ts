import express from "express";
import cors from "cors";
import ocrRoutes from "./routes/ocrRoute";

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/ocr", ocrRoutes);

app.listen(8000, () => {
  console.log("Backend running at http://localhost:8000");
});

export default app;
