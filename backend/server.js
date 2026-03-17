const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
app.use(cors());

// ⚠️ WEBHOOK STRIPE — raw body UNIQUEMENT pour cette route
// Doit être déclaré AVANT express.json()
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  require("./controllers/paymentController").stripeWebhook,
);

// ✅ JSON middleware pour toutes les autres routes
app.use(express.json());

// ✅ ROUTES
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const listingRoutes = require("./routes/listingRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const notificationRoutes = require("./routes/notificationRoutes"); // ✅

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes); // ✅

// ✅ ROUTE DE TEST
app.post("/api/test", (req, res) => res.send("API TEST OK"));
app.get("/", (req, res) => res.send("API is running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
