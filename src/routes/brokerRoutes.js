const express = require("express");
const {
  createBroker,
  getAllBrokers,
  getBroker,
  updateBroker,
  deleteBroker,
} = require("../controllers/brokerController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { checkRole } = require("../middlewares/roleMiddleware");
const router = express.Router();
const allowedRoles = ["SuperAdmin", "Developer", "Assistant"];

router.post("/create", verifyToken, checkRole(allowedRoles), createBroker);
router.get("/get-all", verifyToken, checkRole(allowedRoles), getAllBrokers);
router.get("/get/:id", verifyToken, checkRole(allowedRoles), getBroker);
router.put("/update/:id", verifyToken, checkRole(allowedRoles), updateBroker);
router.delete(
  "/delete/:id",
  verifyToken,
  checkRole(allowedRoles),
  deleteBroker
);

module.exports = router;
