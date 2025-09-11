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

/**
 * Issues a new certificate on the blockchain.
 * @param studentName The student's name.
 * @param regNo The student's registration number.
 * @param department The student's department.
 * @param programme The student's program.
 * @param validUntil The expiration date timestamp.
 * @returns The hash of the newly issued certificate.
 */
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

/**
 * Checks if a certificate hash already exists on the blockchain.
 * This function uses a simple call to a public getter function on the smart contract.
 * We'll assume your contract has a mapping like `mapping(bytes32 => bool) public certificates;`
 * to track issued certificates.
 * @param certHash The unique hash of the certificate to check.
 * @returns A boolean indicating whether the certificate exists.
 */
export async function checkCertificateExists(certHash: string): Promise<boolean> {
  // If your contract has a public mapping `certificates` you can directly call it.
  // The contract will return `true` if the key exists, and `false` otherwise.
  try {
    const exists = await contract.methods.certificates(certHash).call();
    return Boolean(exists);
  } catch (error) {
    console.error("Error checking certificate existence:", error);
    // If the contract method doesn't exist or throws an error, assume it doesn't exist
    return false;
  }
}

/**
 * Retrieves and verifies certificate data from the blockchain by its hash.
 * @param certHash The unique hash of the certificate.
 * @returns The certificate data.
 */
export async function verifyCertificate(certHash: string) {
  // Check if the certificate exists first to provide a more specific error
  const exists = await checkCertificateExists(certHash);
  if (!exists) {
    throw new Error("Certificate does not exist on the blockchain.");
  }

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