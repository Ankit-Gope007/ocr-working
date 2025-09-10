import { GoogleGenerativeAI } from '@google/generative-ai';

// Interface for the parsed student data structure
export interface ParsedStudentData {
  student_info: {
    name: string;
    institution: string;
    registration_no: string;
    date_of_birth: string;
    blood_group: string;
    programme: string;
    department: string;
    valid_until: string;
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
You are an expert document parser specializing in student ID cards and institutional documents. 

Parse the following OCR text from a student ID card or institutional document and return ONLY a valid JSON object in this EXACT format:

{
  "student_info": {
    "name": "string - Student's full name",
    "institution": "string - Institution/College/University name",
    "registration_no": "string - Registration/Roll/Student number",
    "date_of_birth": "string - Date of birth (any format found in document)",
    "blood_group": "string - Blood group (e.g., A+, B-, O+, AB-)",
    "programme": "string - Programme/Course name (e.g., B.Tech, M.Sc, etc.)",
    "department": "string - Department name (e.g., Computer Science, Electronics)",
    "valid_until": "string - Validity date of the ID card"
  }
}

IMPORTANT RULES:
1. Return ONLY the JSON object, no additional text or explanations
2. If any information is not found or unclear, use null for that field
3. Extract information accurately from the context
4. Handle OCR errors intelligently (e.g., 'O' might be '0', 'S' might be '5')
5. The response must be valid JSON that can be parsed
6. Look for variations in field names (e.g., "Regn No", "Roll No", "Student ID" for registration_no)

OCR Text to parse:
${ocrText}

JSON Response:`;
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
    return {
      student_info: {
        name: data.student_info?.name || null,
        institution: data.student_info?.institution || null,
        registration_no: data.student_info?.registration_no || null,
        date_of_birth: data.student_info?.date_of_birth || null,
        blood_group: data.student_info?.blood_group || null,
        programme: data.student_info?.programme || null,
        department: data.student_info?.department || null,
        valid_until: data.student_info?.valid_until || null,
      }
    };
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
