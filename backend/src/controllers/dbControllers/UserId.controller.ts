import prisma from "../../models/prismaClient"; 

type UserDetails = {
    name?: string;
    institution?: string;
    registrationNo?: string;
    dateOfBirth?: string;
    bloodGroup?: string;
    programme?: string;
    department?: string;
    validUntil?: string;
};


// Save the userId to the database
export const saveUserId = async (userData: UserDetails) => {
    try {
        const newUser = await prisma.userIDCard.create({
            data: {
                name: userData.name || "Unknown",
                institution: userData.institution || "Unknown",
                registrationNo: userData.registrationNo || "Unknown",
                dateOfBirth: userData.dateOfBirth || "Unknown",
                bloodGroup: userData.bloodGroup || "Unknown",
                programme: userData.programme || "Unknown",
                department: userData.department || "Unknown",
                validUntil: userData.validUntil || "Unknown"
            }
        });
        return newUser;
    } catch (error) {
        console.error("Error saving userId:", error);
        throw error;
    }
};
