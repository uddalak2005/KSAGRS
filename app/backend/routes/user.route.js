import express from "express";
import userController from "../controllers/user.controller.js";
import verifyToken from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", userController.userRegistration);
router.post("/login", userController.userLogin);
router.get("/me", verifyToken, userController.getCurrentUser);
router.get("/dashboard/:uid", verifyToken, userController.getUserByUID);

export default router;