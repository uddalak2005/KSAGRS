import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

class RegistrationController {
  async userRegistration(req, res) {
    try {
      console.log("Registration payload:", req.body);
      const {
        email,
        password,
        name,
        phone,
        totalLand,
        locationLat,
        locationLong,
        aadhar,
        crops,
      } = req.body;

      if (
        !email ||
        !password ||
        !name ||
        !phone ||
        totalLand == null ||
        !locationLat ||
        !locationLong ||
        !aadhar ||
        !crops
      ) {
        return res.status(400).json({ message: "Missing or invalid fields" });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "User already registered with this email" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const uid = uuidv4();
      const isSmallFarmer = totalLand < 5;

      const newUser = await User.create({
        uid,
        email,
        password: hashedPassword,
        name,
        phone,
        totalLand,
        isSmallFarmer,
        location: {
          lat: locationLat,
          long: locationLong,
        },
        aadhar,
        crops,
      });

      // Generate JWT Token
      const token = jwt.sign(
        { uid, email, id: newUser._id },
        process.env.JWT_SECRET || "agrisure_jwt_secret",
        { expiresIn: "7d" }
      );

      res.status(201).json({
        message: "User registered successfully!",
        token,
        user: {
          uid,
          email,
          name,
          phone,
          totalLand,
          isSmallFarmer,
          location: newUser.location,
          aadhar,
          crops,
        },
      });
    } catch (err) {
      console.error("Registration error:", err.message);
      res.status(400).json({
        message: "Unable to register user",
        error: err.message,
      });
    }
  }

  async userLogin(req, res) {
    try {
      console.log("Login attempt for:", req.body.email);
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      // Generate JWT Token
      const token = jwt.sign(
        { uid: user.uid, email: user.email, id: user._id },
        process.env.JWT_SECRET || "agrisure_jwt_secret",
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        message: "Login successful!",
        token,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          phone: user.phone,
          totalLand: user.totalLand,
          isSmallFarmer: user.isSmallFarmer,
          location: user.location,
          aadhar: user.aadhar,
          crops: user.crops,
        },
      });
    } catch (err) {
      console.error("Login error:", err.message);
      return res.status(500).json({
        message: "Unable to login user",
        error: err.message,
      });
    }
  }

  async getUserByUID(req, res) {
    const { uid } = req.params;
    console.log("Looking for user UID:", uid);

    if (!uid) {
      return res.status(400).json({ message: "UID is required" });
    }

    try {
      const user = await User.findOne({ uid });
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      return res.status(200).json({ user });
    } catch (err) {
      console.error("❌ Error fetching user:", err.message);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async getCurrentUser(req, res) {
    try {
      const user = await User.findOne({ uid: req.user.uid });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.status(200).json({ user });
    } catch (err) {
      console.error("Error fetching current user:", err.message);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
}

const userController = new RegistrationController();
export default userController;