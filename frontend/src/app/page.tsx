"use client";
import React, { useState } from "react";
import axios from "axios";
import { apiBase } from "@/utils/apiRoute";
import { ParsedStudentData, OCRResponse } from "@/types/student";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [parsed, setParsed] = useState<ParsedStudentData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setRawText("");
      setParsed(null);

      const res = await axios.post<OCRResponse>(`${apiBase}/ocr/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log(res.data);

      // Set the OCR text and parsed data
      setRawText(res.data.rawText);
      setParsed(res.data.parsed);

    } catch (err) {
      console.error(err);
      alert("Error uploading file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <h1 className="text-3xl font-extrabold mb-6 text-blue-300 drop-shadow">📝 Document Verifier</h1>

      <div
        className="flex flex-col items-center justify-center border-2 border-dashed border-blue-700 rounded-xl bg-gray-900 shadow-lg p-8 w-full max-w-md transition hover:border-blue-400 cursor-pointer"
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
          }
        }}
      >
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          className="mb-4 w-full text-gray-200 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-gray-400 mb-2">Drag & drop or select a file</span>
        {file && <span className="text-blue-400 font-medium">Selected: {file.name}</span>}
      </div>

      <button
        onClick={handleUpload}
        className="mt-6 bg-blue-700 hover:bg-blue-600 text-white px-6 py-2 rounded-lg shadow transition disabled:opacity-50"
        disabled={!file || loading}
      >
        {loading ? "Processing..." : "Verify"}
      </button>

      {/* Loader animation */}
      {loading && (
        <div className="mt-6 flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="ml-3 text-blue-400 font-medium">Processing...</span>
        </div>
      )}

      {/* Results card */}
      {(rawText || parsed) && !loading && (
        <div className="mt-8 bg-gray-900 border border-blue-700 rounded-xl shadow-lg w-full max-w-2xl p-6">
          <h2 className="text-xl font-semibold text-blue-300 mb-2">📄 OCR Extracted Text</h2>
          <pre className="whitespace-pre-wrap text-gray-200 bg-gray-800 rounded p-4 max-h-64 overflow-auto mb-6">
            {rawText}
          </pre>

          <h2 className="text-xl font-semibold text-green-300 mb-2">✅ Parsed Student Details</h2>
          <div className="bg-gray-800 rounded p-4 text-gray-200">
            {parsed?.student_info ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold text-blue-300">Name:</span>
                    <span className="ml-2">{parsed.student_info.name || 'Not found'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-300">Institution:</span>
                    <span className="ml-2">{parsed.student_info.institution || 'Not found'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-300">Registration No:</span>
                    <span className="ml-2">{parsed.student_info.registration_no || 'Not found'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-300">Date of Birth:</span>
                    <span className="ml-2">{parsed.student_info.date_of_birth || 'Not found'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold text-blue-300">Blood Group:</span>
                    <span className="ml-2">{parsed.student_info.blood_group || 'Not found'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-300">Programme:</span>
                    <span className="ml-2">{parsed.student_info.programme || 'Not found'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-300">Department:</span>
                    <span className="ml-2">{parsed.student_info.department || 'Not found'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-300">Valid Until:</span>
                    <span className="ml-2">{parsed.student_info.valid_until || 'Not found'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap max-h-64 overflow-auto">
                {JSON.stringify(parsed, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}