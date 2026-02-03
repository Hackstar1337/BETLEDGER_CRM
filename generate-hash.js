import bcrypt from "bcryptjs";

const password = "admin123";
const hashedPassword = await bcrypt.hash(password, 10);
console.log("Hashed password:", hashedPassword);
