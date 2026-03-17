const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");

// Route protégée : récupérer profil utilisateur
router.get("/profile", protect, (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  });
});

module.exports = router;
