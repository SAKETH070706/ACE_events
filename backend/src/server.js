import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import eventRoutes from "./routes/eventRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import errorMiddleware from "./middleware/errorMiddleware.js";
import templateRoutes from "./routes/templateRoutes.js";
import connectDB from "./config/db.js";
import dns from "dns"
import automationRoutes from "./routes/automationRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import marketingRoutes from "./routes/marketingRoutes.js";
import checkInRoutes from "./routes/checkInRoutes.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
  }));
app.use(express.json({ limit: "2mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/checkin", checkInRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/marketing", marketingRoutes);

app.use(errorMiddleware);



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});