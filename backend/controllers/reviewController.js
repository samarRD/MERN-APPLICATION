const Review = require("../models/Review");
const Booking = require("../models/Booking");

// GET tous les avis d'un logement
const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ listing: req.params.listingId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    // Calculer la moyenne
    const average =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    res.json({
      reviews,
      average: Math.round(average * 10) / 10, // arrondi à 1 décimale
      total: reviews.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST créer un avis
const createReview = async (req, res) => {
  try {
    const { listingId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    // 1. Vérifier que le user a bien séjourné dans ce logement
    console.log("🔍 listingId:", listingId);
    console.log("🔍 userId:", userId);
    console.log("🔍 maintenant:", new Date());

    // Chercher TOUTES les réservations du guest pour ce logement (debug)
    const allBookings = await Booking.find({
      listing: listingId,
      guest: userId,
    });
    console.log(
      "📋 Toutes les réservations trouvées:",
      JSON.stringify(allBookings, null, 2),
    );

    const validBooking = await Booking.findOne({
      listing: listingId,
      guest: userId,
      status: "confirmed",
      endDate: { $lte: new Date() },
    });

    console.log("validBooking:", validBooking);

    if (!validBooking) {
      return res.status(403).json({
        message:
          "Vous devez avoir séjourné dans ce logement pour laisser un avis.",
      });
    }

    // 2. Vérifier qu'il n'a pas déjà laissé un avis
    const existing = await Review.findOne({ listing: listingId, user: userId });
    if (existing) {
      return res.status(400).json({
        message: "Vous avez déjà laissé un avis pour ce logement.",
      });
    }

    // 3. Créer l'avis
    const review = await Review.create({
      listing: listingId,
      user: userId,
      rating,
      comment,
    });

    const populated = await review.populate("user", "name");
    res.status(201).json(populated);
  } catch (error) {
    // Erreur de clé unique MongoDB
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Vous avez déjà laissé un avis pour ce logement.",
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// DELETE supprimer son avis
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) return res.status(404).json({ message: "Avis introuvable" });

    if (review.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Non autorisé" });

    await review.deleteOne();
    res.json({ message: "Avis supprimé" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getReviews, createReview, deleteReview };
