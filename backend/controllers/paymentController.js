const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Booking = require("../models/Booking");
const Listing = require("../models/Listing");
const Notification = require("../models/Notification");
const PDFDocument = require("pdfkit");

//  Créer une session Stripe Checkout
const createCheckoutSession = async (req, res) => {
  try {
    const { listingId, startDate, endDate, totalPrice, bookingId } = req.body;

    const listing = await Listing.findById(listingId);
    if (!listing)
      return res.status(404).json({ message: "Logement introuvable" });

    const nights = Math.ceil(
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24),
    );

    let booking;
    if (bookingId) {
      booking = await Booking.findById(bookingId);
      if (!booking)
        return res.status(404).json({ message: "Réservation introuvable" });
      if (booking.guest.toString() !== req.user._id.toString())
        return res.status(403).json({ message: "Non autorisé" });
    } else {
      booking = await Booking.create({
        listing: listingId,
        guest: req.user._id,
        startDate,
        endDate,
        totalPrice,
        status: "pending",
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?booking_id=${booking._id}`,
      metadata: {
        bookingId: booking._id.toString(),
        userId: req.user._id.toString(),
      },
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: Math.round(totalPrice * 100),
            product_data: {
              name: listing.title,
              description: `${nights} nuit${nights > 1 ? "s" : ""} · ${listing.location}`,
              images: listing.images?.[0] ? [listing.images[0]] : [],
            },
          },
          quantity: 1,
        },
      ],
    });

    res.json({ url: session.url, bookingId: booking._id });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ message: error.message });
  }
};

//  Webhook Stripe
const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      const booking = await Booking.findByIdAndUpdate(
        bookingId,
        { status: "confirmed", paymentId: session.payment_intent },
        { new: true },
      )
        .populate("listing", "title host")
        .populate("guest", "_id");

      //  Notifier l'hôte que le paiement est reçu
      if (booking?.listing?.host) {
        await Notification.create({
          user: booking.listing.host,
          type: "booking_paid",
          message: `💰 Paiement reçu pour "${booking.listing.title}" !`,
          booking: booking._id,
        });
      }
    }
  }

  res.json({ received: true });
};

//  Vérifier session après redirection Stripe (fallback sans webhook)
const verifySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      const bookingId = session.metadata?.bookingId;

      const booking = await Booking.findByIdAndUpdate(
        bookingId,
        { status: "confirmed", paymentId: session.payment_intent },
        { new: true },
      )
        .populate("listing", "title location price images host")
        .populate("guest", "name email _id");

      //  Notifier l'hôte que le paiement est reçu
      if (booking?.listing?.host) {
        const alreadyNotified = await Notification.findOne({
          booking: booking._id,
          type: "booking_paid",
        });
        if (!alreadyNotified) {
          await Notification.create({
            user: booking.listing.host,
            type: "booking_paid",
            message: `💰 Paiement reçu pour "${booking.listing.title}" ! La réservation est confirmée.`,
            booking: booking._id,
          });
        }
      }

      return res.json({ success: true, booking });
    }

    res.json({ success: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//  Annuler réservation non payée (page cancel Stripe)
const cancelPendingBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking)
      return res.status(404).json({ message: "Réservation introuvable" });

    if (booking.guest.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Non autorisé" });

    // Ne pas annuler si déjà confirmée manuellement par l'hôte
    if (booking.status === "confirmed")
      return res.json({ message: "Réservation conservée (déjà confirmée)" });

    booking.status = "cancelled";
    await booking.save();

    res.json({ message: "Réservation annulée" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//  Générer facture PDF
const generateInvoice = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate("listing", "title location price")
      .populate("guest", "name email");

    if (!booking)
      return res.status(404).json({ message: "Réservation introuvable" });

    if (booking.guest._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Non autorisé" });

    if (booking.status !== "confirmed")
      return res.status(400).json({ message: "Réservation non confirmée" });

    const nights = Math.ceil(
      (new Date(booking.endDate) - new Date(booking.startDate)) /
        (1000 * 60 * 60 * 24),
    );

    const formatDate = (d) =>
      new Date(d).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="facture-${booking._id}.pdf"`,
    );
    doc.pipe(res);

    doc
      .fontSize(24)
      .fillColor("#e63946")
      .text("StayHub", 50, 50)
      .fontSize(10)
      .fillColor("#888888")
      .text("Plateforme de location de logements", 50, 80);

    doc
      .fontSize(20)
      .fillColor("#222222")
      .text("FACTURE", 400, 50, { align: "right" })
      .fontSize(10)
      .fillColor("#888888")
      .text(`N° ${booking._id.toString().slice(-8).toUpperCase()}`, 400, 78, {
        align: "right",
      })
      .text(`Date : ${formatDate(new Date())}`, 400, 92, { align: "right" });

    doc
      .moveTo(50, 115)
      .lineTo(545, 115)
      .strokeColor("#e63946")
      .lineWidth(2)
      .stroke();

    doc
      .fontSize(11)
      .fillColor("#444444")
      .text("Facturé à :", 50, 135)
      .fontSize(13)
      .fillColor("#222222")
      .font("Helvetica-Bold")
      .text(booking.guest.name, 50, 152)
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#666666")
      .text(booking.guest.email, 50, 168);

    doc
      .roundedRect(50, 200, 495, 140, 8)
      .fillColor("#fafafa")
      .fill()
      .strokeColor("#eeeeee")
      .lineWidth(1)
      .stroke();

    doc
      .fontSize(12)
      .fillColor("#e63946")
      .font("Helvetica-Bold")
      .text("Détails de la réservation", 70, 216)
      .font("Helvetica");

    const col1 = 70,
      col2 = 300;
    doc
      .fontSize(10)
      .fillColor("#888888")
      .text("Logement", col1, 244)
      .text("Localisation", col1, 262)
      .text("Arrivée", col2, 244)
      .text("Départ", col2, 262)
      .text("Durée", col1, 280)
      .text("Statut", col2, 280);

    doc
      .fontSize(11)
      .fillColor("#222222")
      .font("Helvetica-Bold")
      .text(booking.listing.title, col1, 256, { width: 200 })
      .font("Helvetica")
      .text(booking.listing.location, col1, 274, { width: 200 })
      .font("Helvetica-Bold")
      .text(formatDate(booking.startDate), col2, 256)
      .text(formatDate(booking.endDate), col2, 274)
      .text(`${nights} nuit${nights > 1 ? "s" : ""}`, col1, 294)
      .fillColor("#22c55e")
      .text("✓ Confirmée", col2, 294)
      .fillColor("#222222")
      .font("Helvetica");

    doc
      .fontSize(12)
      .fillColor("#444444")
      .font("Helvetica-Bold")
      .text("Récapitulatif", 50, 365)
      .font("Helvetica");

    doc.rect(50, 385, 495, 28).fillColor("#e63946").fill();
    doc
      .fontSize(10)
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .text("Description", 70, 394)
      .text("Qté", 330, 394)
      .text("Prix unitaire", 390, 394)
      .text("Total", 490, 394)
      .font("Helvetica");

    doc
      .rect(50, 413, 495, 28)
      .fillColor("#fff5f5")
      .fill()
      .strokeColor("#eeeeee")
      .lineWidth(1)
      .stroke();

    doc
      .fontSize(10)
      .fillColor("#222222")
      .text(`${booking.listing.title} — ${booking.listing.location}`, 70, 422, {
        width: 250,
      })
      .text(`${nights}`, 345, 422)
      .text(`${booking.listing.price} €`, 390, 422)
      .text(`${booking.totalPrice} €`, 490, 422);

    doc.rect(350, 455, 195, 35).fillColor("#1a1a2e").fill();
    doc
      .fontSize(13)
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .text("TOTAL", 370, 465)
      .text(`${booking.totalPrice} €`, 470, 465);

    doc
      .moveTo(50, 650)
      .lineTo(545, 650)
      .strokeColor("#eeeeee")
      .lineWidth(1)
      .stroke();
    doc
      .fontSize(9)
      .fillColor("#aaaaaa")
      .font("Helvetica")
      .text("Merci d'avoir choisi StayHub.", 50, 662, {
        align: "center",
        width: 495,
      })
      .text("© 2026 StayHub — Tous droits réservés", 50, 676, {
        align: "center",
        width: 495,
      });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCheckoutSession,
  stripeWebhook,
  verifySession,
  cancelPendingBooking,
  generateInvoice,
};
