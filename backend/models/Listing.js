const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    images: [{ type: String }],
    type: {
      type: String,
      enum: ["appartement", "villa", "maison", "studio", "chambre", "chalet"],
      default: "appartement",
    },
    bedrooms: { type: Number, default: 1, min: 1 },
    amenities: { type: [String], default: [] },
    instantBook: { type: Boolean, default: false },

    // ✅ Coordonnées GPS (remplies automatiquement via Nominatim)
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Listing", listingSchema);
