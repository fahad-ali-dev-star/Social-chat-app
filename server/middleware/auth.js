import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
};

export const protect = async (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.id).select("accountStatus suspendedUntil");
    if (!user) return res.status(401).json({ message: "User not found" });
    if (user.accountStatus === "banned") return res.status(403).json({ message: "Account is banned" });
    if (user.accountStatus === "suspended" && (!user.suspendedUntil || user.suspendedUntil > new Date())) {
      return res.status(403).json({ message: "Account is suspended" });
    }
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
