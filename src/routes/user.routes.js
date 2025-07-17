const express = require("express");
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUser,
} = require("../controllers/user.controller.js");
// const AuthController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// Seul l'admin peut accéder à ces routes
// router.use(AuthController(["ADMIN"]));

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser, authMiddleware);
router.post("/", createUser); // Ajouter à la suite des autres routes

module.exports = router;
