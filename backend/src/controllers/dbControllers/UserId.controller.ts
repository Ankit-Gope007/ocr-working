import prisma from "../../models/prismaClient"; 

type UserDetails = {
    name?: string | null;
    institution?: string | null;
    registration_no?: string | null;
    date_of_birth?: string | null;
    blood_group?: string | null;
    programme?: string | null;
    department?: string | null;
    valid_until?: string | null;
};

// {
//   "student_info": {
//     "name": "ANKIT GOPE",
//     "institution": "NATIONAL INSTITUTE OF TECHNOLOGY DURGAPUR",
//     "registration_no": "24U10863",
//     "date_of_birth": "07-11-2005",
//     "blood_group": "O",
//     "programme": "B.Tech",
//     "department": "CE",
//     "valid_until": "30.06.2028"
//   }
// }
// Save the userId to the database
export const saveUserId = async (userData: UserDetails) => {
    try {
        const newUser = await prisma.userIDCard.create({
            data: {
                name: userData.name || "Unknown",
                institution: userData.institution || "Unknown",
                registrationNo: userData.registration_no || "Unknown",
                dateOfBirth: userData.date_of_birth || "Unknown",
                bloodGroup: userData.blood_group || "Unknown",
                programme: userData.programme || "Unknown",
                department: userData.department || "Unknown",
                validUntil: userData.valid_until || "Unknown"
            }
        });
        return newUser;
    } catch (error) {
        console.error("Error saving userId:", error);
        throw error;
    }
};
