export interface ParsedResult {
  rollNo?: string;
  candidateName?: string;
  motherName?: string;
  fatherName?: string;
  dob?: string;
  subjects?: Record<string, number>;
  result?: string;
}

export function parseCBSECertificate(ocrText: string): ParsedResult {
  const data: ParsedResult = {
    subjects: {}
  };

  // Roll number
  const rollMatch = ocrText.match(/Roll\s*No[:\s]*([0-9]+)/i);
  if (rollMatch) data.rollNo = rollMatch[1];

  // Candidate Name
  const nameMatch = ocrText.match(/Name[:\s]*([A-Z\s]+)/i);
  if (nameMatch) data.candidateName = nameMatch[1].trim();

  // Mother’s Name
  const motherMatch = ocrText.match(/Mother[’'`s ]*Name[:\s]*([A-Z\s]+)/i);
  if (motherMatch) data.motherName = motherMatch[1].trim();

  // Father/Guardian Name
  const fatherMatch = ocrText.match(/Father[’'`s \/Guardian]*Name[:\s]*([A-Z\s]+)/i);
  if (fatherMatch) data.fatherName = fatherMatch[1].trim();

  // DOB
  const dobMatch = ocrText.match(/(\d{2}[-/]\d{2}[-/]\d{4})/);
  if (dobMatch) data.dob = dobMatch[1];

  // Subjects (look for lines like "ENGLISH ... 71")
  const subjectRegex = /(ENGLISH|HINDI|MATHEMATICS|SCIENCE|SOCIAL\s*SCIENCE|INFORMATION\s*TECHNOLOGY).*?(\d{2,3})/gi;
  let match;
  while ((match = subjectRegex.exec(ocrText)) !== null) {
    const subject = match[1].trim();
    const marks = parseInt(match[2], 10);
    data.subjects![subject] = marks;
  }

  // Result
  const resultMatch = ocrText.match(/Result[:\s]*(PASS|FAIL)/i);
  if (resultMatch) data.result = resultMatch[1].toUpperCase();

  return data;
}