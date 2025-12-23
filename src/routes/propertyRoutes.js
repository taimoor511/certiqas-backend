const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/multer");
const {
  createProperty,
  getAllProperties,
  getPropertyById,
  mintPendingProperty,
} = require("../controllers/propertyController");
const { checkRole } = require("../middlewares/roleMiddleware");

const router = express.Router();
const allowedRoles = ["SuperAdmin", "Developer"];
router.post(
  "/create-property",
  verifyToken,
  checkRole(allowedRoles),
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  createProperty
);
router.post(
  "/mint-property/:id",
  verifyToken,
  checkRole(["SuperAdmin"]),
  mintPendingProperty
);
router.get(
  "/all-property",
  verifyToken,
  checkRole(allowedRoles),
  getAllProperties
);
router.get(
  "/property/:id",
  verifyToken,
  checkRole(allowedRoles),
  getPropertyById
);
module.exports = router;
