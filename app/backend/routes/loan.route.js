import express from "express";
import loanController from "../controllers/loan.controller.js";
import verifyToken from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/submit/:id", verifyToken, loanController.submitLoan);

export default router;