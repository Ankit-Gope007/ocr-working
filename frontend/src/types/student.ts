// Types for the student data returned from the backend
export interface ParsedStudentData {
  student_info: {
    name: string | null;
    institution: string | null;
    registration_no: string | null;
    date_of_birth: string | null;
    blood_group: string | null;
    programme: string | null;
    department: string | null;
    valid_until: string | null;
  };
}

// API response type
export interface OCRResponse {
  message: string;
  processedFile: string;
  rawText: string;
  parsed: ParsedStudentData;
}

// Batch upload response type
export interface BatchUploadResponse {
  message: string;
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Array<{
    filename: string;
    success: boolean;
    data?: ParsedStudentData;
    error?: string;
  }>;
}
