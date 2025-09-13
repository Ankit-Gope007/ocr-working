import Web3 from "web3";
import CertificateABI from "../../build/contracts/Certificate.json";

const web3 = new Web3("http://127.0.0.1:8545"); // Ganache RPC
const contractAddress = process.env.CONTRACT_ID as string;
const account = process.env.ACCOUNT as string;

const contract = new web3.eth.Contract(
  CertificateABI.abi as any,
  contractAddress
);

interface CertificateData {
  studentName: string;
  regNo: string;
  department: string;
  programme: string;
  validUntil: string; // from contract, still string
  issuedOn: string;
}

/**
 * Create a certificate hash that exactly matches Solidity's keccak256(abi.encodePacked(...))
 */
export const createCertificateHash = (studentInfo: {
  name: string;
  registration_no: string;
  department: string;
  programme: string;
  valid_until: string; // "DD.MM.YYYY"
}): string => {
  const dateParts = studentInfo.valid_until.split(".");
  if (dateParts.length !== 3) {
    throw new Error("Invalid date format. Expected DD.MM.YYYY");
  }

  // Convert DD.MM.YYYY → YYYY-MM-DD → timestamp (seconds)
  const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
  const validUntilSeconds = Math.floor(Date.parse(formattedDate) / 1000);

  if (isNaN(validUntilSeconds)) {
    throw new Error(`Could not parse date: ${studentInfo.valid_until}`);
  }

  // Must use abi.encodePacked types & order
  const hash = web3.utils.soliditySha3(
    { type: "string", value: studentInfo.name.trim() },
    { type: "string", value: studentInfo.registration_no.trim() },
    { type: "string", value: studentInfo.department.trim() },
    { type: "string", value: studentInfo.programme.trim() },
    { type: "uint256", value: validUntilSeconds.toString() }
  );

  if (!hash) throw new Error("Failed to generate hash");
  return hash;
};

/**
 * Issue a certificate (writes to blockchain)
 */
export async function issueCertificate(
  studentName: string,
  regNo: string,
  department: string,
  programme: string,
  validUntil: number // already in seconds
): Promise<string> {
  const tx = await contract.methods
    .issueCertificate(studentName, regNo, department, programme, validUntil)
    .send({ from: account, gas: "3000000" });

  const event = tx.events?.CertificateIssued;
  if (!event) {
    throw new Error("CertificateIssued event not found");
  }

  return event.returnValues.certHash as string;
}

/**
 * Get full certificate details by hash
 */
export async function verifyCertificate(
  certHash: string
): Promise<{
  studentName: string;
  regNo: string;
  department: string;
  programme: string;
  validUntil: number;
  issuedOn: number;
}> {
  const cert = (await contract.methods
    .verifyCertificate(certHash)
    .call()) as CertificateData;

  if (Number(cert.issuedOn) === 0) {
    throw new Error("Certificate does not exist");
  }

  return {
    studentName: cert.studentName,
    regNo: cert.regNo,
    department: cert.department,
    programme: cert.programme,
    validUntil: Number(cert.validUntil),
    issuedOn: Number(cert.issuedOn),
  };
}

/**
 * Check if certificate exists by hash
 */
export async function checkCertificateExists(
  certHash: string
): Promise<boolean> {
  try {
    const cert = (await contract.methods
      .verifyCertificate(certHash)
      .call()) as CertificateData;

    return Number(cert.issuedOn) > 0;
  } catch {
    return false;
  }
}