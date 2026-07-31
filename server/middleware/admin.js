import User from "../models/User.js";

export const requireRole = (...roles) => async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("role accountStatus suspendedUntil");
    if (!user) return res.status(401).json({ message: "User not found" });
    if (user.accountStatus === "banned") return res.status(403).json({ message: "Account is banned" });
    if (user.accountStatus === "suspended" && (!user.suspendedUntil || user.suspendedUntil > new Date())) {
      return res.status(403).json({ message: "Account is suspended" });
    }
    if (!roles.includes(user.role)) return res.status(403).json({ message: "Admin access required" });
    req.adminUser = user;
    next();
  } catch (err) {
    console.error("Role check failed:", err);
    res.status(500).json({ message: "Authorization check failed" });
  }
};
