import mongoose from "mongoose";

export const cleanString = (value, { max = 2000, trim = true } = {}) => {
  if (typeof value !== "string") return "";
  const normalized = trim ? value.trim() : value;
  return normalized.slice(0, max);
};

export const validateObjectIdParam = (name) => (req, res, next) => {
  const value = req.params[name];
  if (!mongoose.isValidObjectId(value)) {
    return res.status(400).json({ message: `Invalid ${name}` });
  }
  next();
};

export const validateBody = (rules) => (req, res, next) => {
  for (const [field, rule] of Object.entries(rules)) {
    const value = req.body?.[field];
    if (rule.required && (value === undefined || value === null || value === "")) {
      return res.status(400).json({ message: `${field} is required` });
    }
    if (value === undefined || value === null) continue;
    if (rule.type && typeof value !== rule.type) {
      return res.status(400).json({ message: `${field} must be ${rule.type}` });
    }
    if (rule.max && typeof value === "string" && value.length > rule.max) {
      return res.status(400).json({ message: `${field} is too long` });
    }
    if (rule.pattern && typeof value === "string" && !rule.pattern.test(value)) {
      return res.status(400).json({ message: `${field} has an invalid format` });
    }
  }
  next();
};

export const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const sanitizeQueryText = (value, max = 100) =>
  cleanString(String(value || "").replace(/[.$]/g, ""), { max });
