// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Certificate {
    struct Cert {
        string studentName;
        string regNo;         
        string department;    
        string programme;     
        uint256 validUntil;   
        uint256 issuedOn;     // Added this field
    }

    mapping(bytes32 => Cert) private certificates;

    event CertificateIssued(
        bytes32 indexed certHash, 
        string studentName, 
        string regNo, 
        string department, 
        string programme, 
        uint256 validUntil
    );

    // Issue a new certificate with all fields
    function issueCertificate(
        string memory _studentName,
        string memory _regNo,
        string memory _department,
        string memory _programme,
        uint256 _validUntil
    ) public returns (bytes32) {
        // Use abi.encode for a more reliable hash
        bytes32 certHash = keccak256(abi.encode(_studentName, _regNo, _department, _programme, _validUntil));
        
        // Prevent duplicate certificates
        require(certificates[certHash].issuedOn == 0, "Certificate with this hash already exists.");

        certificates[certHash] = Cert({
            studentName: _studentName,
            regNo: _regNo,
            department: _department,
            programme: _programme,
            validUntil: _validUntil,
            issuedOn: block.timestamp // Set the issuance timestamp
        });

        emit CertificateIssued(certHash, _studentName, _regNo, _department, _programme, _validUntil);
        return certHash;
    }

    // Verify a certificate by its hash
    function verifyCertificate(bytes32 _certHash) public view returns (
        string memory studentName,
        string memory regNo,
        string memory department,
        string memory programme,
        uint256 validUntil,
        uint256 issuedOn
    ) {
        Cert memory cert = certificates[_certHash];
        require(cert.issuedOn != 0, "Certificate does not exist");

        return (
            cert.studentName, 
            cert.regNo, 
            cert.department, 
            cert.programme, 
            cert.validUntil,
            cert.issuedOn
        );
    }
}