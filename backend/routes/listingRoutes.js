const express = require("express");
const router = express.Router();
const reviewRoutes = require("./reviewRoutes");
const { protect } = require("../middlewares/authMiddleware");
const {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getBookedDates, // ✅ ajouté
} = require("../controllers/listingController");

// ✅ Routes publiques
router.get("/", getListings);
router.get("/:id", getListingById);
router.get("/:id/booked-dates", getBookedDates); // ✅ ajouté

// ✅ Routes protégées
router.post("/", protect, createListing);
router.put("/:id", protect, updateListing);
router.delete("/:id", protect, deleteListing);
router.use("/:listingId/reviews", reviewRoutes);

module.exports = router;
