export interface ParsedCollegeID {
  name?: string;
  dob?: string;
  regnNo?: string;
  bloodGroup?: string;
  programme?: string;
  department?: string;
  validUpto?: string;
}

export function parseCollegeIDCard(ocrText: string): ParsedCollegeID {
  const data: ParsedCollegeID = {};

  // Name
  const nameMatch = ocrText.match(/Name\s*:?([A-Z\s]+)/i);
  if (nameMatch) data.name = nameMatch[1].trim();

  // DOB
  const dobMatch = ocrText.match(/DOB\s*:?(\d{2}[-/]\d{2}[-/]\d{4})/i);
  if (dobMatch) data.dob = dobMatch[1];

  // Registration Number
  const regnMatch = ocrText.match(/Regn\s*No\.?\s*:?([A-Z0-9]+)/i);
  if (regnMatch) data.regnNo = regnMatch[1];

  // Blood Group
  const bloodMatch = ocrText.match(/Blood\s*Gr\.?\s*:?([A-Z0-9+\-]+)/i);
  if (bloodMatch) data.bloodGroup = bloodMatch[1];

  // Programme
  const progMatch = ocrText.match(/Programme\s*:?([A-Za-z0-9\s]+)/i);
  if (progMatch) data.programme = progMatch[1].trim();

  // Department
  const deptMatch = ocrText.match(/Department\s*:?([A-Za-z0-9\s]+)/i);
  if (deptMatch) data.department = deptMatch[1].trim();

  // Valid Upto
  const validMatch = ocrText.match(/Valid\s*upto\s*:?(\d{2}[-/]\d{2}[-/]\d{4})/i);
  if (validMatch) data.validUpto = validMatch[1];

  return data;
}