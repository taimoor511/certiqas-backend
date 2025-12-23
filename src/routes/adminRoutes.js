const express = require("express");

const {
  createAdmin,
  getAdmins,
  updateAdmin,
  deleteAdmin,
  loginUser,
} = require("../controllers/adminController");

const { verifyToken } = require("../middlewares/authMiddleware");
const { checkRole } = require("../middlewares/roleMiddleware");

const { createAdminValidation } = require("../validations/adminValidation");

const { handleValidation } = require("../middlewares/validationMiddleware");

const router = express.Router();

const allowedRoles = ["SuperAdmin", "Developer"];
router.post("/login", loginUser);
router.post(
  "/create",
  verifyToken,
  checkRole(allowedRoles),
  createAdminValidation,
  handleValidation,
  createAdmin
);
router.get("/", verifyToken, checkRole(allowedRoles), getAdmins);
router.put(
  "/update/:id",
  verifyToken,
  checkRole(allowedRoles),
  updateAdmin
);
router.delete(
  "/delete/:id",
  verifyToken,
  checkRole(allowedRoles),
  deleteAdmin
);

module.exports = router;
