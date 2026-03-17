const express = require("express");
const router = express.Router({ mergeParams: true }); // ✅ pour accéder à :listingId
const { protect } = require("../middlewares/authMiddleware");
const {
  getReviews,
  createReview,
  deleteReview,
} = require("../controllers/reviewController");

// GET  /api/listings/:listingId/reviews  ← tous les avis
router.get("/", getReviews);

// POST /api/listings/:listingId/reviews  ← créer un avis
router.post("/", protect, createReview);

// DELETE /api/listings/:listingId/reviews/:id  ← supprimer son avis
router.delete("/:id", protect, deleteReview);

module.exports = router;
