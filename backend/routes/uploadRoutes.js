const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");
const {
  uploadImages,
  deleteImage,
} = require("../controllers/uploadController");

// ✅ Upload jusqu'à 5 images (host connecté)
router.post("/", protect, upload.array("images", 5), uploadImages);

// ✅ Supprimer une image
router.delete("/", protect, deleteImage);

module.exports = router;
