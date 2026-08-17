import jwt from "jsonwebtoken";
import User from "../models/User.js";

const signToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign({ id: String(id) }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const getAdminEmails = () =>
  String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter(Boolean);

const ensureAdminRole = async (user) => {
  const adminEmails = getAdminEmails();
  if (adminEmails.includes(normalizeEmail(user.email)) && user.role !== "admin") {
    user.role = "admin";
    await user.save();
  }
  return user;
};

export const register = async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ $or: [{ email: normalizedEmail }, { username }] });
    if (existing) {
      return res.status(409).json({ message: "Username or email already in use" });
    }

    const adminEmails = getAdminEmails();
    const user = await User.create({ username, email: normalizedEmail, password, displayName, role: adminEmails.includes(normalizedEmail) ? "admin" : "user" });
    const token = signToken(user._id);
    res.cookie("token", token, cookieOptions);

    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, email: user.email, displayName: user.displayName, isPrivate: user.isPrivate, isVerified: user.isVerified, role: user.role, accountStatus: user.accountStatus },
    });
  } catch (err) {
    console.error("Registration failed:", err);
    res.status(500).json({ message: "Registration failed" });
  }
};

export const login = async (req, res) => {
  try {
    const identifier = req.body.email || req.body.username || req.body.emailOrUsername;
    const normalizedIdentifier = String(identifier || "").trim();
    const normalizedEmail = normalizeEmail(identifier);

    const user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { username: normalizedIdentifier },
        { username: normalizedEmail },
      ],
    }).select("+password");

    if (!user || !(await user.comparePassword(req.body.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.accountStatus === "banned") return res.status(403).json({ message: "Account is banned" });
    if (user.accountStatus === "suspended" && (!user.suspendedUntil || user.suspendedUntil > new Date())) {
      return res.status(403).json({ message: "Account is suspended" });
    }

    const updatedUser = await ensureAdminRole(user);
    const token = signToken(updatedUser._id);
    res.cookie("token", token, cookieOptions);

    res.json({
      token,
      user: { id: updatedUser._id, username: updatedUser.username, email: updatedUser.email, displayName: updatedUser.displayName, isPrivate: updatedUser.isPrivate, isVerified: updatedUser.isVerified, role: updatedUser.role, accountStatus: updatedUser.accountStatus },
    });
  } catch (err) {
    console.error("Login failed:", err);
    res.status(500).json({ message: "Login failed" });
  }
};

export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.json({ message: "Logged out" });
};

export const getMe = async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  const updatedUser = await ensureAdminRole(user);
  res.json({ user: updatedUser });
};
