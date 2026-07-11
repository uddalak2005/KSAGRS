import express from "express";
import cropController from "../controllers/crop.controller.js";
import verifyToken from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/addNewCrop", verifyToken, cropController.addNewCrop);
router.get("/getPredictions/:id", verifyToken, cropController.getPredictionOnCrop);
router.get("/getAllCrops/:uid", verifyToken, cropController.getPastRecords);

export default router;