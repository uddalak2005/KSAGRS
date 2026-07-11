import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "agrisure_jwt_secret");
    req.user = decoded;
    
    // Inject uid into req.body and req.params if they exist to maintain backward compatibility
    if (decoded.uid) {
      if (req.body && !req.body.uid) {
        req.body.uid = decoded.uid;
      }
    }

    next();
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    return res.status(403).json({ message: "Invalid or Expired Token" });
  }
};

export default verifyToken;
