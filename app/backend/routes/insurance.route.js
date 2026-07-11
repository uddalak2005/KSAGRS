import express from "express";
import insuranceController from "../controllers/insurance.controller.js";
import upload from "../middlewares/upload.middleware.js";
import verifyToken from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/create",
    upload.fields([
        { name: "policyDoc", maxCount: 1 },
        { name: "damageImage", maxCount: 1 },
        { name: "fieldImage", maxCount: 1 }
    ]),
    verifyToken,
    insuranceController.createInsurance
);

export default router;