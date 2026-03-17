import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import "../styles/checkout.css";

const formatDate = (d) =>
  new Date(d).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Si accès direct sans state → retour accueil
  if (!state?.listing) {
    navigate("/");
    return null;
  }

  const { listing, startDate, endDate, nights, totalPrice } = state;

  const serviceFee = Math.round(totalPrice * 0.12); // 12% frais service
  const grandTotal = totalPrice + serviceFee;

  // ---- Confirmer et payer → Stripe ----
  const handleConfirmPay = async () => {
    setLoading(true);
    try {
      const res = await api.post("/payments/create-checkout", {
        listingId: listing._id,
        startDate,
        endDate,
        totalPrice: grandTotal,
      });

      window.location.href = res.data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors du paiement");
      setLoading(false);
    }
  };

  return (
    <div className="co-page">
      <div className="co-container">
        {/* HEADER */}
        <div className="co-header">
          <button className="co-back" onClick={() => navigate(-1)}>
            ← Retour
          </button>
          <h1 className="co-title">Confirmez et payez</h1>
        </div>

        <div className="co-content">
          {/* ---- GAUCHE ---- */}
          <div className="co-left">
            {/* Votre voyage */}
            <div className="co-section">
              <h2 className="co-section-title">Votre voyage</h2>

              <div className="co-trip-row">
                <div>
                  <p className="co-trip-label">Dates</p>
                  <p className="co-trip-value">
                    {formatDate(startDate)} – {formatDate(endDate)}
                  </p>
                </div>
                <button className="co-edit-btn" onClick={() => navigate(-1)}>
                  Modifier
                </button>
              </div>

              <div className="co-trip-row">
                <div>
                  <p className="co-trip-label">Durée</p>
                  <p className="co-trip-value">
                    {nights} nuit{nights > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="co-divider" />

            {/* Infos voyageur */}
            <div className="co-section">
              <h2 className="co-section-title">Vos informations</h2>
              <div className="co-guest-card">
                <div className="co-guest-avatar">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="co-guest-name">{user?.name}</p>
                  <p className="co-guest-email">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="co-divider" />

            {/* Politique annulation */}
            <div className="co-section">
              <h2 className="co-section-title">Politique d'annulation</h2>
              <p className="co-policy-text">
                Annulation gratuite avant l'arrivée. Après cela, les frais de la
                première nuit et les frais de service ne sont pas remboursés.
              </p>
            </div>

            <div className="co-divider" />

            {/* Règles */}
            <div className="co-section">
              <h2 className="co-section-title">Règles de la maison</h2>
              <ul className="co-rules">
                <li>🕙 Arrivée après 15h00</li>
                <li>🕙 Départ avant 11h00</li>
                <li>🚭 Non-fumeur</li>
                <li>🐾 Animaux non admis</li>
              </ul>
            </div>

            <div className="co-divider" />

            {/* Bouton confirmer */}
            <button
              className={`co-pay-btn ${loading ? "loading" : ""}`}
              onClick={handleConfirmPay}
              disabled={loading}
            >
              {loading ? <span className="co-spinner" /> : "Confirmer et payer"}
            </button>

            <p className="co-terms">
              En cliquant, vous acceptez les{" "}
              <span className="co-terms-link">Conditions générales</span> et la{" "}
              <span className="co-terms-link">
                Politique de confidentialité
              </span>
              .
            </p>
          </div>

          {/* ---- DROITE — Recap logement ---- */}
          <div className="co-right">
            <div className="co-listing-card">
              {/* Image */}
              <div className="co-listing-img-wrap">
                <img
                  src={
                    listing.images?.[0] ||
                    "https://via.placeholder.com/300x200?text=No+Image"
                  }
                  alt={listing.title}
                  className="co-listing-img"
                />
              </div>

              {/* Infos */}
              <div className="co-listing-info">
                <p className="co-listing-type">{listing.type}</p>
                <p className="co-listing-title">{listing.title}</p>
                <p className="co-listing-location">📍 {listing.location}</p>
              </div>

              <div className="co-divider" />

              {/* Détail prix */}
              <div className="co-price-detail">
                <h3 className="co-price-title">Détail du prix</h3>

                <div className="co-price-row">
                  <span>
                    {listing.price} € × {nights} nuit{nights > 1 ? "s" : ""}
                  </span>
                  <span>{totalPrice} €</span>
                </div>

                <div className="co-price-row">
                  <span>
                    Frais de service
                    <span className="co-price-info"> ℹ️</span>
                  </span>
                  <span>{serviceFee} €</span>
                </div>

                <div className="co-price-divider" />

                <div className="co-price-row co-price-total">
                  <span>Total (EUR)</span>
                  <span>{grandTotal} €</span>
                </div>
              </div>

              {/* Badge sécurité */}
              <div className="co-secure-badge">
                🔒 Paiement sécurisé par Stripe
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
