import jwt from "jsonwebtoken";

export const generateAccessToken = (user: any) => jwt.sign(
  { role: user.role, _id: user._id },
  process.env.JWT_SECRET!,
  { expiresIn: '6h' }
);
