import app from "./app";
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`✅ OCR server running at http://localhost:${PORT}`);
});