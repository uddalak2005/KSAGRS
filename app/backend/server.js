import mongoose from "mongoose";
import app from "./app.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((err) => {
      console.log("ERROR CONNECTION WITH MONGODB:", err);
    });

app.listen(PORT, "0.0.0.0", () => {
  console.log(`app is listening to port ${PORT}`);
});