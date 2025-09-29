import express from "express";
import cors from "cors";
import ocrRoutes from "./routes/ocrRoute";


const app = express();

app.use(cors(
  {
  origin: "*",
  allowedHeaders: "Content-Type",
}
));
app.use(express.json());

// Routes
app.use("/api/ocr", ocrRoutes);


export default app;
