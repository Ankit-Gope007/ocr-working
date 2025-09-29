"use client";
import React, { useState } from "react";
import axios from "axios";
import { apiBase } from "@/utils/apiRoute";
import { ParsedStudentData } from "@/types/student";

interface BatchUploadResponse {
  message: string;
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Array<{
    filename: string;
    success: boolean;
    data?: ParsedStudentData;
    error?: string;
    certHash?: string;
  }>;
}

export default function HomePage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [documentType, setDocumentType] = useState<string>("id-card");
  const [institution, setInstitution] = useState<string>("nit-durgapur");
  const [results, setResults] = useState<BatchUploadResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // This function is simplified and corrected to handle multiple files.
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Direct assignment works correctly.
      setFiles(e.target.files);
    }
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) return alert("Please select at least one file");

    const formData = new FormData();
    
    // Append all files using the correct field name "files", as configured on the backend.
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });
    
    // Append metadata
    formData.append("documentType", documentType);
    formData.append("institution", institution);

    try {
      setLoading(true);
      setResults(null);

      const res = await axios.post<BatchUploadResponse>(`${apiBase}/ocr/batch-upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log(res.data);
      setResults(res.data);

    } catch (err) {
      console.error(err);
      alert("Error uploading files");
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Academia Document Validator</h1>
              <p className="text-text-secondary text-sm">Institutional Document Processing System</p>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Upload Form */}
        <div className="bg-surface border border-border rounded-2xl shadow-soft-xl p-8 mb-8 animate-fade-in-up">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-text-primary">Document Upload for INSTITUTIONS</h2>
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
                  <option value="id-card" className="bg-background"> Student ID Card</option>
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
                  <option value="nit-durgapur" className="bg-background"> NIT Durgapur</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* File Upload Area */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-3">
              Upload Documents (Maximum 4 files)
            </label>
            <div
              className="relative border-2 border-dashed border-border rounded-xl bg-background/50 hover:bg-background/80 hover:border-primary/50 transition-all duration-300 cursor-pointer group"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                if (e.dataTransfer.files) {
                  setFiles(e.dataTransfer.files);
                }
              }}
            >
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                max={4}
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l3 3m3-3l-3-3m3 3v6" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-text-primary mb-2">
                  Drag & drop your documents here
                </p>
                <p className="text-text-secondary mb-4">
                  or click to browse files
                </p>
                <div className="flex items-center justify-center space-x-4 text-sm text-text-secondary">
                  <span>Images / .pdf</span>
                  <span>- Max 4 files</span>
                </div>
              </div>
              {files && files.length > 0 && (
                <div className="border-t border-border bg-surface/50 p-4 rounded-b-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-primary font-medium">
                      {files.length} file{files.length > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Array.from(files).slice(0, 4).map((file, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm text-text-primary bg-background/50 rounded-lg p-2">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate">{file.name}</span>
                      </div>
                    ))}
                    {files.length > 4 && (
                      <div className="text-sm text-text-secondary bg-background/50 rounded-lg p-2">
                        ... and {files.length - 4} more files
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleUpload}
            disabled={!files || files.length === 0 || loading}
            className="w-full bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary disabled:from-text-secondary disabled:to-text-secondary text-white font-semibold py-4 px-6 rounded-xl shadow-soft-lg hover:shadow-glow-primary transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span>Processing {files?.length || 0} documents...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Process {files?.length || 0} Documents</span>
              </>
            )}
          </button>
        </div>

        {/* Processing Results */}
        {results && !loading && (
          <div className="bg-surface border border-border rounded-2xl shadow-soft-xl p-8 animate-fade-in-up">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-text-primary">Processing Results</h2>
            </div>
            
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-background/50 border border-border rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">{results.totalProcessed}</div>
                <div className="text-sm text-text-secondary">Total Processed</div>
              </div>
              <div className="bg-background/50 border border-border rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">{results.successful}</div>
                <div className="text-sm text-text-secondary">Successfully Saved</div>
              </div>
              <div className="bg-background/50 border border-border rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-400 mb-1">{results.failed}</div>
                <div className="text-sm text-text-secondary">Failed</div>
              </div>
            </div>

            {/* Individual Results */}
            <div className="space-y-6">
              {results.results.map((result, index) => (
                <div
                  key={index}
                  className={`bg-background/30 rounded-xl border-l-4 ${
                    result.success ? 'border-primary' : 'border-red-500'
                  } p-6 transition-all hover:bg-background/50`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        result.success ? 'bg-primary/20' : 'bg-red-500/20'
                      }`}>
                        {result.success ? (
                          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-text-primary">{result.filename}</h3>
                        <p className="text-sm text-text-secondary">
                          {result.success ? 'Successfully processed and saved to database' : 'Processing failed'}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      result.success 
                        ? 'bg-primary/10 text-primary border-primary/30' 
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                      {result.success ? 'SUCCESS' : 'FAILED'}
                    </div>
                  </div>
                  
                  {result.success && result.data?.student_info ? (
                    <div className="bg-surface/50 border border-border rounded-lg p-4">
                      <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center space-x-2">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Extracted & Saved Data</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Name</label>
                          <p className="text-text-primary font-medium">{result.data.student_info.name || 'Not found'}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Registration No</label>
                          <p className="text-text-primary font-medium">{result.data.student_info.registration_no || 'Not found'}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Department</label>
                          <p className="text-text-primary font-medium">{result.data.student_info.department || 'Not found'}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Programme</label>
                          <p className="text-text-primary font-medium">{result.data.student_info.programme || 'Not found'}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Date of Birth</label>
                          <p className="text-text-primary font-medium">{result.data.student_info.date_of_birth || 'Not found'}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Blood Group</label>
                          <p className="text-text-primary font-medium">{result.data.student_info.blood_group || 'Not found'}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Valid Until</label>
                          <p className="text-text-primary font-medium">{result.data.student_info.valid_until || 'Not found'}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-secondary uppercase tracking-wide font-medium">Institution</label>
                          <p className="text-text-primary font-medium text-xs">{result.data.student_info.institution || 'Not found'}</p>
                        </div>
                      </div>
                      {/* New: Blockchain Transaction Hash */}
                      {result.certHash && (
                        <div className="mt-4 border-t border-border pt-4">
                          <h5 className="text-xs text-text-secondary uppercase tracking-wide font-medium mb-1">Blockchain Transaction Hash</h5>
                          <p className="text-primary font-mono text-sm break-all">{result.certHash}</p>
                        </div>
                      )}
                    </div>
                  ) : result.error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Error Details</span>
                      </h4>
                      <p className="text-red-400 text-sm">{result.error}</p>
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