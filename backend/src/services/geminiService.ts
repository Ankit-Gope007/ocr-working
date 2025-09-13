import { GoogleGenerativeAI } from '@google/generative-ai';

// Interface for the parsed student data structure
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

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    // Initialize the Gemini AI client
    this.genAI = new GoogleGenerativeAI(apiKey);

    // Use the gemini-1.5-flash model (you can change this to gemini-pro if needed)
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  /**
   * Parse OCR text using Gemini AI to extract structured student data
   * @param ocrText - Raw text extracted from OCR
   * @returns Promise<ParsedStudentData> - Structured student data
   */
  async parseStudentData(ocrText: string): Promise<ParsedStudentData> {
    try {
      // Create the prompt for Gemini
      const prompt = this.createParsingPrompt(ocrText);

      // Send request to Gemini
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log("[GEMINI RESPONSE]:");
      console.log(text);
      console.log("=====================");

      // Parse the JSON response from Gemini
      const parsedData = this.parseGeminiResponse(text);

      return parsedData;
    } catch (error) {
      console.error('Error parsing student data with Gemini:', error);
      throw new Error(`Failed to parse student data: ${error}`);
    }
  }

  /**
   * Create the structured prompt for Gemini AI
   * @param ocrText - Raw OCR text
   * @returns string - Formatted prompt
   */
  private createParsingPrompt(ocrText: string): string {
    return `
    You are an expert document parser specializing in student ID cards. 
Your job is to parse OCR-extracted text, correct obvious OCR mistakes, and enforce strict formats for specific fields when possible.

Return ONLY a valid JSON object in this EXACT format (no extra text):

{
  "student_info": {
    "name": "string - Student's full name with proper spacing",
    "institution": "string - Institution name cleaned (no filler words like 'say')", 
    "registration_no": "string - Registration/Roll number (alphanumeric only, no trailing/extra text)",
    "date_of_birth": "string - Date of birth in DD-MM-YYYY format or null",
    "blood_group": "string - Blood group EXACTLY as written (trimmed) or null",
    "programme": "string - Programme EXACTLY as written (trimmed) or null",
    "department": "string - Department code/abbrev (letters only, normalized) or null", 
    "valid_until": "string - Validity date in DD-MM-YYYY format or null"
  }
}

CRITICAL RULES:
1. Return ONLY the JSON object, nothing else.
2. Name:
   - If OCR concatenates words (e.g. "SDAKSHROHIT"), insert spaces using common name heuristics (e.g., "S DAKSH ROHIT").
   - Normalize spacing; use Title Case.
3. Registration No:
   - Extract the first contiguous alphanumeric token that looks like a roll number.
   - Remove trailing noise (e.g., "24U10894 PY" → "24U10894").
   - Return uppercase; if none, set to null.
4. Dates (DOB, Valid Until):
   - Normalize to DD-MM-YYYY with leading zeros.
   - Accept formats like YYYY/MM/DD, DD/MM/YY, DD.MM.YY and convert.
   - If digits missing/unclear → null.
5. Valid Until Date:
   - Normalize to DD.MM.YYYY format (note: use DOTS, not dashes) with leading zeros.
   - Accept formats like YYYY/MM/DD, DD/MM/YY, DD-MM-YYYY, DD.MM.YY and convert to DD.MM.YYYY.
   - Examples: "30-06-2028" → "30.06.2028", "2028/06/30" → "30.06.2028"
   - If digits missing/unclear → null.
6. Institution:
   - Keep the full proper name, but **remove accidental filler words** like "say", "ins", "institute of" duplication, or random prefixes.
   - Example: "say National Institute of Technology Durgapur" → "National Institute of Technology Durgapur".
7. Programme, Blood Group:
   - Keep exactly as OCR wrote, but trim extra spaces and fix obvious spacing.
8. Department — NORMALIZATION:
   - Goal: return a **clean, uppercase department abbreviation** only (letters only).
   - Trim whitespace, convert to uppercase.
   - Remove digits, punctuation, and stray characters (e.g., "CS 4", "CS-1", "C S" → "CS").
   - If nothing valid remains, set null.
9. If any field is completely missing, set it to null.
10. Do not hallucinate or add fields beyond the specified JSON structure.

OCR Text to parse:
${ocrText}

JSON Response:
    `;
  }

  /**
   * Parse and validate the response from Gemini
   * @param geminiResponse - Raw response text from Gemini
   * @returns ParsedStudentData - Validated and typed student data
   */
  private parseGeminiResponse(geminiResponse: string): ParsedStudentData {
    try {
      // Clean the response - remove any markdown formatting or extra text
      let cleanedResponse = geminiResponse.trim();

      // Remove markdown code blocks if present
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      cleanedResponse = cleanedResponse.trim();

      // Find the JSON object in the response
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('No JSON object found in Gemini response');
      }

      const jsonString = cleanedResponse.substring(jsonStart, jsonEnd);
      const parsedData = JSON.parse(jsonString);

      // Validate the structure and provide defaults for missing fields
      return this.validateAndCleanData(parsedData);

    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      console.error('Raw response:', geminiResponse);
      throw new Error(`Failed to parse Gemini response as JSON: ${error}`);
    }
  }

  /**
   * Validate and clean the parsed data, providing defaults where necessary
   * @param data - Raw parsed data from JSON
   * @returns ParsedStudentData - Validated student data
   */
  private validateAndCleanData(data: any): ParsedStudentData {
    const studentInfo = data.student_info || {};

    return {
      student_info: {
        name: this.cleanName(studentInfo.name) || null,
        institution: studentInfo.institution || null,
        registration_no: studentInfo.registration_no || null,
        date_of_birth: studentInfo.date_of_birth || null,
        blood_group: this.cleanBloodGroup(studentInfo.blood_group) || null,
        programme: studentInfo.programme || null,
        department: studentInfo.department || null, // Keep exact as on ID card
        valid_until: studentInfo.valid_until || null,
      }
    };
  }

  /**
   * Clean and fix common OCR errors in names
   * @param name - Raw name from OCR
   * @returns string - Cleaned name
   */
  private cleanName(name: string | null): string | null {
    if (!name) return null;

    let cleanedName = name.trim();

    // For now, return as-is but we could add specific fixes here
    // The main issue should be fixed in the Gemini prompt
    return cleanedName;
  }

  /**
   * Clean blood group field
   * @param bloodGroup - Raw blood group from OCR
   * @returns string - Cleaned blood group
   */
  private cleanBloodGroup(bloodGroup: string | null): string | null {
    if (!bloodGroup) return null;

    let cleaned = bloodGroup.trim();

    // Fix common OCR errors in blood groups
    cleaned = cleaned.replace(/O4/g, 'O+');
    cleaned = cleaned.replace(/04/g, 'O+');
    cleaned = cleaned.replace(/A4/g, 'A+');
    cleaned = cleaned.replace(/B4/g, 'B+');
    cleaned = cleaned.replace(/AB4/g, 'AB+');

    return cleaned;
  }

  /**
   * Test the Gemini connection
   * @returns Promise<boolean> - True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent("Say 'Hello' if you can read this.");
      const response = await result.response;
      const text = response.text();
      return text.toLowerCase().includes('hello');
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const geminiService = new GeminiService();
export default geminiService;
