const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  createCheckoutSession,
  stripeWebhook,
  verifySession,
  cancelPendingBooking,
  generateInvoice,
} = require("../controllers/paymentController");

// ✅ Créer une session Stripe Checkout
router.post("/create-checkout", protect, createCheckoutSession);

// ✅Webhook Stripe — RAW body obligatoire (pas de JSON middleware)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

// ✅ Vérifier le statut après redirection Stripe
router.get("/verify/:sessionId", protect, verifySession);

// ✅ Annuler une réservation non payée (page cancel)
router.put("/cancel/:bookingId", protect, cancelPendingBooking);

// ✅ Télécharger la facture PDF
router.get("/invoice/:bookingId", protect, generateInvoice);

module.exports = router;
