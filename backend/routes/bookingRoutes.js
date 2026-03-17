const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  createBooking,
  getBookingsByUser,
  getBookingsByHost,
  updateBookingStatus,
  cancelBooking,
  deleteBooking,
} = require("../controllers/bookingController");

router.post("/", protect, createBooking);
router.get("/my-bookings", protect, getBookingsByUser);
router.get("/host-bookings", protect, getBookingsByHost);
router.put("/:id/status", protect, updateBookingStatus);
router.put("/:id/cancel", protect, cancelBooking);
router.delete("/:id", protect, deleteBooking); // ✅

module.exports = router;
