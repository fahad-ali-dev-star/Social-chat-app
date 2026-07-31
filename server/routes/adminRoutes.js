import express from "express";
import { protect } from "../middleware/auth.js";
import { requireRole } from "../middleware/admin.js";
import { getStats, listReports, updateReport, listUsers, updateUser, deleteContent } from "../controllers/adminController.js";

const router = express.Router();
router.use(protect, requireRole("admin", "moderator"));
router.get("/stats", getStats);
router.get("/reports", listReports);
router.patch("/reports/:id", updateReport);
router.get("/users", listUsers);
router.patch("/users/:id", updateUser);
router.delete("/content/:type/:id", requireRole("admin", "moderator"), deleteContent);
export default router;
