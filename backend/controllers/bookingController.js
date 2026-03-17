const Booking = require("../models/Booking");
const Listing = require("../models/Listing");
const Notification = require("../models/Notification");

// ✅ CREATE booking (guest — mode manuel)
const createBooking = async (req, res) => {
  try {
    const { listing, startDate, endDate, totalPrice } = req.body;

    const booking = await Booking.create({
      listing,
      guest: req.user._id,
      startDate,
      endDate,
      totalPrice,
    });

    const listingDoc = await Listing.findById(listing).populate("host", "_id");
    if (listingDoc?.host) {
      await Notification.create({
        user: listingDoc.host._id,
        type: "new_booking",
        message: `📋 Nouvelle demande de réservation pour "${listingDoc.title}"`,
        booking: booking._id,
      });
    }

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ GET bookings of current user (guest)
const getBookingsByUser = async (req, res) => {
  try {
    const bookings = await Booking.find({ guest: req.user._id })
      .populate("listing", "title price location images")
      .populate("guest", "name email");
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ GET all bookings for host's listings
const getBookingsByHost = async (req, res) => {
  try {
    const hostListings = await Listing.find({ host: req.user._id }).select(
      "_id",
    );
    const listingIds = hostListings.map((l) => l._id);

    const bookings = await Booking.find({ listing: { $in: listingIds } })
      .populate("listing", "title price location images")
      .populate("guest", "name email")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ UPDATE booking status (host — confirmed / cancelled)
const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["confirmed", "cancelled"].includes(status))
      return res.status(400).json({ message: "Statut invalide." });

    const booking = await Booking.findById(req.params.id)
      .populate("listing")
      .populate("guest", "_id name");

    if (!booking)
      return res.status(404).json({ message: "Réservation introuvable" });

    if (booking.listing.host.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Non autorisé" });

    booking.status = status;
    await booking.save();

    if (status === "confirmed") {
      await Notification.create({
        user: booking.guest._id,
        type: "booking_confirmed",
        message: `🎉 Votre demande pour "${booking.listing.title}" a été acceptée ! Cliquez pour finaliser le paiement.`,
        booking: booking._id,
      });
    }

    if (status === "cancelled") {
      await Notification.create({
        user: booking.guest._id,
        type: "booking_cancelled",
        message: `❌ Votre demande pour "${booking.listing.title}" a été refusée par l'hôte.`,
        booking: booking._id,
      });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ CANCEL booking (guest)
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking)
      return res.status(404).json({ message: "Réservation introuvable" });

    if (booking.guest.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Non autorisé" });

    if (!["pending", "confirmed"].includes(booking.status))
      return res.status(400).json({
        message: `Impossible d'annuler une réservation avec le statut "${booking.status}"`,
      });

    booking.status = "cancelled";
    await booking.save();

    res.json({ message: "Réservation annulée avec succès", booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ DELETE booking (hôte — réservations annulées uniquement)
const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("listing");

    if (!booking)
      return res.status(404).json({ message: "Réservation introuvable" });

    if (booking.listing.host.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Non autorisé" });

    if (booking.status !== "cancelled")
      return res.status(400).json({
        message: "Seules les réservations annulées peuvent être supprimées",
      });

    await booking.deleteOne();
    res.json({ message: "Réservation supprimée" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBooking,
  getBookingsByUser,
  getBookingsByHost,
  updateBookingStatus,
  cancelBooking,
  deleteBooking, // ✅
};
