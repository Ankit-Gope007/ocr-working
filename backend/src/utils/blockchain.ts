import Web3 from "web3";
import CertificateABI from "../../build/contracts/Certificate.json";

const web3 = new Web3("http://127.0.0.1:8545"); // Ganache RPC
const contractAddress = process.env.CONTRACT_ID; // your deployed contract
const contract = new web3.eth.Contract(CertificateABI.abi as any, contractAddress);

const account = process.env.ACCOUNT; // unlocked Ganache account

// ---------------- Types ----------------
interface CertificateData {
  studentName: string;
  regNo: string;
  department: string;
  programme: string;
  validUntil: string; // solidity uint256 comes as string
  issuedOn: string;
  issuer: string;
}

// ---------------- Functions ----------------

// Issue new certificate
export async function issueCertificate(
  studentName: string,
  regNo: string,
  department: string,
  programme: string,
  validUntil: number // Pass as a number/timestamp from your logic
) {
  const tx = await contract.methods
    .issueCertificate(studentName, regNo, department, programme, validUntil)
    .send({ from: account, gas: "3000000" });

  if (!tx.events || !tx.events.CertificateIssued) {
    throw new Error("No CertificateIssued event found in transaction");
  }

  const certHash = tx.events.CertificateIssued.returnValues.certHash;
  return certHash;
}

// Verify certificate
export async function verifyCertificate(certHash: string) {
  const cert = (await contract.methods.verifyCertificate(certHash).call()) as CertificateData;

  return {
    studentName: cert.studentName,
    regNo: cert.regNo,
    department: cert.department,
    programme: cert.programme,
    validUntil: Number(cert.validUntil),
    issuedOn: Number(cert.issuedOn),
    issuer: cert.issuer,
  };
}