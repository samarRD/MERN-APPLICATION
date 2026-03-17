const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "booking_confirmed", // hôte a confirmé → notif voyageur
        "booking_cancelled", // hôte a annulé  → notif voyageur
        "booking_paid", // voyageur a payé → notif hôte
        "new_booking", // nouvelle demande → notif hôte
      ],
      required: true,
    },
    message: { type: String, required: true },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
