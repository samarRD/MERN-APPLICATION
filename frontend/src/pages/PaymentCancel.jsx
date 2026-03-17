import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/paymentResult.css";

export default function PaymentCancel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get("booking_id");

  // Annuler la réservation pending créée avant le paiement
  useEffect(() => {
    if (!bookingId) return;
    api.put(`/payments/cancel/${bookingId}`).catch(() => {});
  }, [bookingId]);

  return (
    <div className="pr-page">
      <div className="pr-card pr-cancel">
        <div className="pr-cancel-circle">
          <span className="pr-cancel-icon">✕</span>
        </div>

        <h1 className="pr-title">Paiement annulé</h1>
        <p className="pr-sub">
          Vous avez annulé le paiement. Votre réservation n'a pas été confirmée.
        </p>

        <div className="pr-cancel-info">
          <p>
            💡 Vous pouvez réessayer à tout moment depuis la page du logement.
          </p>
        </div>

        <div className="pr-actions">
          <button className="pr-retry-btn" onClick={() => navigate(-1)}>
            🔄 Réessayer
          </button>
          <button className="pr-home-btn" onClick={() => navigate("/")}>
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}
