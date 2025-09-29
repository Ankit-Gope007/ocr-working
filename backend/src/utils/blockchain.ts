import Web3 from "web3";
import CertificateABI from "../../build/contracts/Certificate.json";
require("dotenv").config();

const web3 = new Web3(process.env.RPC_URL as string);

// Load account from private key
const privateKey = process.env.PRIVATE_KEY as string;
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);

const contractAddress = process.env.CONTRACT_ID as string;

const contract = new web3.eth.Contract(
  CertificateABI.abi as any,
  contractAddress
);

interface CertificateData {
  studentName: string;
  regNo: string;
  department: string;
  programme: string;
  validUntil: string;
  issuedOn: string;
}

/**
 * Create a certificate hash
 */
export const createCertificateHash = (studentInfo: {
  name: string;
  registration_no: string;
  department: string;
  programme: string;
  valid_until: string;
}): string => {
  const dateParts = studentInfo.valid_until.split(".");
  if (dateParts.length !== 3) {
    throw new Error("Invalid date format. Expected DD.MM.YYYY");
  }

  const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
  const validUntilSeconds = Math.floor(Date.parse(formattedDate) / 1000);

  if (isNaN(validUntilSeconds)) {
    throw new Error(`Could not parse date: ${studentInfo.valid_until}`);
  }

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
 * Issue a certificate (writes to blockchain, signed locally)
 */
export async function issueCertificate(
  studentName: string,
  regNo: string,
  department: string,
  programme: string,
  validUntil: number
): Promise<string> {
  const tx = contract.methods.issueCertificate(
    studentName,
    regNo,
    department,
    programme,
    validUntil
  );

  const gas = await tx.estimateGas({ from: account.address });
  const gasPrice = await web3.eth.getGasPrice();

  const receipt = await tx
    .send({
      from: account.address,
      gas: gas.toString(),
      gasPrice: gasPrice.toString(),
    })
    .once("transactionHash", (hash: string) => {
      console.log("Tx hash:", hash);
    });

  const event = receipt.events?.CertificateIssued;
  if (!event) {
    throw new Error("CertificateIssued event not found");
  }

  return event.returnValues.certHash as string;
}

/**
 * Get certificate details
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
 * Check if certificate exists
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
