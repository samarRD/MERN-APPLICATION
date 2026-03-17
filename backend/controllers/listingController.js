const Listing = require("../models/Listing");
const Booking = require("../models/Booking");

// ✅ GET all listings with advanced filters
const getListings = async (req, res) => {
  try {
    const { location, type, minPrice, maxPrice, bedrooms, amenities } =
      req.query;

    const filter = {};

    if (location) filter.location = { $regex: location, $options: "i" };

    if (type && type !== "all") filter.type = type;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (bedrooms && bedrooms !== "all")
      filter.bedrooms = bedrooms === "4+" ? { $gte: 4 } : Number(bedrooms);

    if (amenities) {
      const list = amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      if (list.length) filter.amenities = { $all: list };
    }

    const listings = await Listing.find(filter).populate("host", "name email");
    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ GET single listing by ID
const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate(
      "host",
      "name email",
    );
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    res.json(listing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ CREATE listing — reçoit lat/lng géocodés depuis le frontend
const createListing = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      location,
      images,
      type,
      bedrooms,
      amenities,
      instantBook,
      lat,
      lng, // ✅ coordonnées envoyées par le frontend
    } = req.body;

    const listing = await Listing.create({
      title,
      description,
      price,
      location,
      images,
      type,
      bedrooms,
      amenities,
      instantBook: instantBook ?? false,
      host: req.user._id,
      lat: lat ?? null,
      lng: lng ?? null,
    });

    res.status(201).json(listing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ UPDATE listing — met à jour lat/lng si la localisation change
const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (listing.host.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Non autorisé" });

    const {
      title,
      description,
      price,
      location,
      images,
      type,
      bedrooms,
      amenities,
      instantBook,
      lat,
      lng, // ✅
    } = req.body;

    listing.title = title ?? listing.title;
    listing.description = description ?? listing.description;
    listing.price = price ?? listing.price;
    listing.location = location ?? listing.location;
    listing.images = images ?? listing.images;
    listing.type = type ?? listing.type;
    listing.bedrooms = bedrooms ?? listing.bedrooms;
    listing.amenities = amenities ?? listing.amenities;
    listing.instantBook = instantBook ?? listing.instantBook;
    listing.lat = lat ?? listing.lat; // ✅
    listing.lng = lng ?? listing.lng; // ✅

    const updated = await listing.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ DELETE listing
const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (listing.host.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Non autorisé" });

    await listing.deleteOne();
    res.json({ message: "Logement supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ GET booked dates
const getBookedDates = async (req, res) => {
  try {
    const bookings = await Booking.find({
      listing: req.params.id,
      status: { $in: ["pending", "confirmed"] },
    }).select("startDate endDate");

    const bookedDates = [];
    bookings.forEach((b) => {
      const current = new Date(b.startDate);
      const end = new Date(b.endDate);
      while (current <= end) {
        bookedDates.push(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
    });

    res.json({ bookedDates: [...new Set(bookedDates)] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getBookedDates,
};
