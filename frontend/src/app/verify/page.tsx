"use client";
import React, { useState } from "react";
import axios from "axios";
import { apiBase } from "@/utils/apiRoute";
import { ParsedStudentData } from "@/types/student";

interface VerificationResponse {
  message: string;
  isValid: boolean;
  studentData?: ParsedStudentData;
  blockchainData?: {
    certHash: string;
    issuedDate: string;
    validUntil: string;
  };
  error?: string;
}

interface BatchVerificationResult {
  file: string;
  isValid: boolean;
  studentData?: ParsedStudentData;
  blockchainData?: {
    certHash: string;
    issuedDate: string;
    validUntil: string;
  };
  error?: string;
}

export default function VerifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]); // For batch
  const [batchMode, setBatchMode] = useState(false); // Batch toggle
  const [documentType, setDocumentType] = useState<string>("id-card");
  const [institution, setInstitution] = useState<string>("nit-durgapur");
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [batchResults, setBatchResults] = useState<BatchVerificationResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Single file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Batch file change
  const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };

  // Single verify
  const handleVerify = async () => {
    if (!file) return alert("Please select a file to verify");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);
    formData.append("institution", institution);

    try {
      setLoading(true);
      setResult(null);
      setBatchResults(null);

      const res = await axios.post<VerificationResponse>(`${apiBase}/ocr/verify`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data);

    } catch (err: unknown) {
      let errorMessage = "Network error occurred";
      if (typeof err === "object" && err !== null && "response" in err) {
        const errorObj = err as { response?: { data?: { error?: string } } };
        errorMessage = errorObj.response?.data?.error || errorMessage;
      }
      setResult({
        message: "Verification failed",
        isValid: false,
        error: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // Batch verify
  const handleBatchVerify = async () => {
    if (!files.length) return alert("Please select files to verify");

    const formData = new FormData();
    files.forEach(f => formData.append("files", f));
    formData.append("documentType", documentType);
    formData.append("institution", institution);

    try {
      setLoading(true);
      setResult(null);
      setBatchResults(null);

      const res = await axios.post<{ message: string; results: BatchVerificationResult[] }>(
        `${apiBase}/ocr/verify/batch`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setBatchResults(res.data.results);

    } catch (err: unknown) {
      let errorMessage = "Network error occurred";
      if (typeof err === "object" && err !== null && "response" in err) {
        const errorObj = err as { response?: { data?: { error?: string } } };
        errorMessage = errorObj.response?.data?.error || errorMessage;
      }
      setBatchResults([
        {
          file: "Batch",
          isValid: false,
          error: errorMessage
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface/50 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-hover rounded-xl flex items-center justify-center shadow-glow-primary">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.414-5.414a2 2 0 00-2.828 0L9 12l-2.828-2.828a2 2 0 00-2.828 2.828l4.243 4.243a2 2 0 002.828 0L19 8.828a2 2 0 00-2.828-2.828z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Document Verification System</h1>
              <p className="text-text-secondary text-sm">Verify Institutional Documents & Certificates</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Verification Form */}
        <div className="bg-surface border border-border rounded-2xl shadow-soft-xl p-8 mb-8 animate-fade-in-up">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-text-primary">Document Verification</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Document Type Selection */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                Document Type
              </label>
              <div className="relative">
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full p-4 bg-background border border-border rounded-xl text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary appearance-none transition-all"
                >
                  <option value="id-card" className="bg-background">Student ID Card</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Institution Selection */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                Institution
              </label>
              <div className="relative">
                <select
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full p-4 bg-background border border-border rounded-xl text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary appearance-none transition-all"
                >
                  <option value="nit-durgapur" className="bg-background">NIT Durgapur</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Batch Mode Toggle */}
          <div className="flex items-center mb-6">
            <input
              id="batchMode"
              type="checkbox"
              checked={batchMode}
              onChange={() => {
                setBatchMode(!batchMode);
                setFile(null);
                setFiles([]);
                setResult(null);
                setBatchResults(null);
              }}
              className="mr-2"
            />
            <label htmlFor="batchMode" className="text-sm text-text-primary font-medium">
              Enable Batch Verification (multiple files)
            </label>
          </div>

          {/* File Upload Area */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-3">
              {batchMode ? "Upload Documents for Batch Verification" : "Upload Document for Verification"}
            </label>
            <div
              className="relative border-2 border-dashed border-border rounded-xl bg-background/50 hover:bg-background/80 hover:border-primary/50 transition-all duration-300 cursor-pointer group"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                if (batchMode) {
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    setFiles(Array.from(e.dataTransfer.files));
                  }
                } else {
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setFile(e.dataTransfer.files[0]);
                  }
                }
              }}
            >
              <input
                type="file"
                accept="image/*,.pdf"
                multiple={batchMode}
                onChange={batchMode ? handleBatchFileChange : handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l3 3m3-3l-3-3m3 3v6" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-text-primary mb-2">
                  Drag & drop your document{batchMode ? "s" : ""} here
                </p>
                <p className="text-text-secondary mb-4">
                  or click to browse files
                </p>
                <div className="flex items-center justify-center space-x-4 text-sm text-text-secondary">
                  <span>Images</span>
                  <span>PDF</span>
                  <span>{batchMode ? "Multiple files allowed" : "Single file only"}</span>
                </div>
              </div>
              {/* Selected file(s) display */}
              {!batchMode && file && (
                <div className="border-t border-border bg-surface/50 p-4 rounded-b-xl">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-primary font-medium">File selected</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-text-primary bg-background/50 rounded-lg p-2 mt-2">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="truncate">{file.name}</span>
                  </div>
                </div>
              )}
              {batchMode && files.length > 0 && (
                <div className="border-t border-border bg-surface/50 p-4 rounded-b-xl">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-primary font-medium">{files.length} files selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {files.map(f => (
                      <span key={f.name} className="text-xs bg-background/50 rounded px-2 py-1 text-text-primary">{f.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Verify Button */}
          <button
            onClick={batchMode ? handleBatchVerify : handleVerify}
            disabled={(batchMode ? files.length === 0 : !file) || loading}
            className="w-full bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary disabled:from-text-secondary disabled:to-text-secondary text-white font-semibold py-4 px-6 rounded-xl shadow-soft-lg hover:shadow-glow-primary transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span>Verifying Document{batchMode ? "s" : ""}...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Verify Document{batchMode ? "s" : ""}</span>
              </>
            )}
          </button>
        </div>

        {/* Single Verification Results */}
        {result && !loading && !batchMode && (
          <div className="bg-surface border border-border rounded-2xl shadow-soft-xl p-8 animate-fade-in-up">
            <div className="flex items-center space-x-3 mb-6">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                result.isValid ? 'bg-primary/20' : 'bg-red-500/20'
              }`}>
                {result.isValid ? (
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <h2 className="text-xl font-semibold text-text-primary">Verification Result</h2>
            </div>
            
            {/* Verification Status */}
            <div className="mb-8">
              <div className={`p-6 rounded-xl border-l-4 ${
                result.isValid 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-red-500/10 border-red-500'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-lg font-semibold mb-2 ${
                      result.isValid ? 'text-primary' : 'text-red-400'
                    }`}>
                      {result.isValid ? 'Document Verified Successfully' : 'Document Verification Failed'}
                    </h3>
                    <p className="text-text-secondary">{result.message}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-medium border ${
                    result.isValid 
                      ? 'bg-primary/10 text-primary border-primary/30' 
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}>
                    {result.isValid ? 'VERIFIED' : 'INVALID'}
                  </div>
                </div>
              </div>
            </div>

            {/* Student Data - Only show if valid */}
            {result.isValid && result.studentData?.student_info && (
              <div className="bg-background/30 rounded-xl p-6 mb-6">
                <h4 className="text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Student Information</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Name</label>
                    <p className="text-text-primary font-medium">{result.studentData.student_info.name || 'Not found'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Registration No</label>
                    <p className="text-text-primary font-medium">{result.studentData.student_info.registration_no || 'Not found'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Department</label>
                    <p className="text-text-primary font-medium">{result.studentData.student_info.department || 'Not found'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Programme</label>
                    <p className="text-text-primary font-medium">{result.studentData.student_info.programme || 'Not found'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Date of Birth</label>
                    <p className="text-text-primary font-medium">{result.studentData.student_info.date_of_birth || 'Not found'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Blood Group</label>
                    <p className="text-text-primary font-medium">{result.studentData.student_info.blood_group || 'Not found'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Valid Until</label>
                    <p className="text-text-primary font-medium">{result.studentData.student_info.valid_until || 'Not found'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Institution</label>
                    <p className="text-text-primary font-medium text-xs">{result.studentData.student_info.institution || 'Not found'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Blockchain Data - Only show if valid and available */}
            {result.isValid && result.blockchainData && (
              <div className="bg-background/30 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.414-5.414a2 2 0 00-2.828 0L9 12l-2.828-2.828a2 2 0 00-2.828 2.828l4.243 4.243a2 2 0 002.828 0L19 8.828a2 2 0 00-2.828-2.828z" />
                  </svg>
                  <span>Blockchain Verification</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Certificate Hash</label>
                    <p className="text-primary font-mono text-sm break-all">{result.blockchainData.certHash}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Issued Date</label>
                    <p className="text-text-primary font-medium">{result.blockchainData.issuedDate}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Valid Until</label>
                    <p className="text-text-primary font-medium">{result.blockchainData.validUntil}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Details - Only show if verification failed */}
            {!result.isValid && result.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-red-400 mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Error Details</span>
                </h4>
                <p className="text-red-400">{result.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Batch Verification Results */}
        {batchResults && !loading && batchMode && (
          <div className="bg-surface border border-border rounded-2xl shadow-soft-xl p-8 animate-fade-in-up">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-text-primary">Batch Verification Results</h2>
            </div>
            <div className="space-y-8">
              {batchResults.map((res, idx) => (
                <div key={res.file + idx} className="border-b border-border pb-8 mb-8 last:border-b-0 last:pb-0 last:mb-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-semibold text-text-primary">{res.file}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${res.isValid ? "bg-primary/10 text-primary" : "bg-red-500/10 text-red-400"}`}>
                      {res.isValid ? "VERIFIED" : "INVALID"}
                    </span>
                  </div>
                  <div className={`p-4 rounded-xl border-l-4 ${res.isValid ? "bg-primary/10 border-primary" : "bg-red-500/10 border-red-500"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`text-lg font-semibold mb-2 ${res.isValid ? "text-primary" : "text-red-400"}`}>
                          {res.isValid ? "Document Verified Successfully" : "Document Verification Failed"}
                        </h3>
                        <p className="text-text-secondary">{res.isValid ? "Verified on blockchain." : res.error || "Verification failed."}</p>
                      </div>
                    </div>
                  </div>
                  {/* Student Data */}
                  {res.isValid && res.studentData?.student_info && (
                    <div className="bg-background/30 rounded-xl p-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Name</label>
                          <p className="text-text-primary font-medium">{res.studentData.student_info.name || 'Not found'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Registration No</label>
                          <p className="text-text-primary font-medium">{res.studentData.student_info.registration_no || 'Not found'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Department</label>
                          <p className="text-text-primary font-medium">{res.studentData.student_info.department || 'Not found'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Programme</label>
                          <p className="text-text-primary font-medium">{res.studentData.student_info.programme || 'Not found'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Date of Birth</label>
                          <p className="text-text-primary font-medium">{res.studentData.student_info.date_of_birth || 'Not found'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Blood Group</label>
                          <p className="text-text-primary font-medium">{res.studentData.student_info.blood_group || 'Not found'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Valid Until</label>
                          <p className="text-text-primary font-medium">{res.studentData.student_info.valid_until || 'Not found'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Institution</label>
                          <p className="text-text-primary font-medium text-xs">{res.studentData.student_info.institution || 'Not found'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}