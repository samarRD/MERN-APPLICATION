import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/paymentResult.css";

const formatDate = (d) =>
  new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setError(true);
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const res = await api.get(`/payments/verify/${sessionId}`);
        if (res.data.success) {
          setBooking(res.data.booking);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [sessionId]);

  // ---- Télécharger la facture PDF ----
  const handleDownloadInvoice = async () => {
    if (!booking?._id) return;
    setDownloading(true);
    try {
      const res = await api.get(`/payments/invoice/${booking._id}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `facture-${booking._id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Erreur lors du téléchargement de la facture");
    } finally {
      setDownloading(false);
    }
  };

  // ---- Loading ----
  if (loading)
    return (
      <div className="pr-page">
        <div className="pr-card">
          <div className="pr-spinner-wrap">
            <span className="pr-spinner-lg" />
          </div>
          <p className="pr-loading-text">Vérification du paiement...</p>
        </div>
      </div>
    );

  // ---- Erreur ----
  if (error || !booking)
    return (
      <div className="pr-page">
        <div className="pr-card">
          <p className="pr-icon">😕</p>
          <h1 className="pr-title">Paiement introuvable</h1>
          <p className="pr-sub">Impossible de vérifier votre paiement.</p>
          <button className="pr-home-btn" onClick={() => navigate("/")}>
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    );

  const nights = Math.ceil(
    (new Date(booking.endDate) - new Date(booking.startDate)) /
      (1000 * 60 * 60 * 24),
  );

  return (
    <div className="pr-page">
      <div className="pr-card pr-success">
        {/* Icône succès */}
        <div className="pr-success-circle">
          <span className="pr-success-check">✓</span>
        </div>

        <h1 className="pr-title">Paiement confirmé !</h1>
        <p className="pr-sub">
          Votre réservation a été confirmée avec succès. 🎉
        </p>

        {/* Détails réservation */}
        <div className="pr-booking-card">
          {booking.listing?.images?.[0] && (
            <img
              src={booking.listing.images[0]}
              alt={booking.listing.title}
              className="pr-booking-img"
            />
          )}

          <div className="pr-booking-info">
            <h3 className="pr-booking-title">{booking.listing?.title}</h3>
            <p className="pr-booking-location">
              📍 {booking.listing?.location}
            </p>

            <div className="pr-booking-dates">
              <div className="pr-booking-date">
                <span className="pr-booking-date-label">Arrivée</span>
                <span className="pr-booking-date-value">
                  {formatDate(booking.startDate)}
                </span>
              </div>
              <span className="pr-booking-arrow">→</span>
              <div className="pr-booking-date">
                <span className="pr-booking-date-label">Départ</span>
                <span className="pr-booking-date-value">
                  {formatDate(booking.endDate)}
                </span>
              </div>
            </div>

            <div className="pr-booking-footer">
              <span className="pr-booking-nights">
                🌙 {nights} nuit{nights > 1 ? "s" : ""}
              </span>
              <span className="pr-booking-price">{booking.totalPrice} €</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pr-actions">
          <button
            className="pr-invoice-btn"
            onClick={handleDownloadInvoice}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <span className="pr-spinner-sm" /> Téléchargement...
              </>
            ) : (
              "📄 Télécharger la facture PDF"
            )}
          </button>

          <button
            className="pr-bookings-btn"
            onClick={() => navigate("/bookings")}
          >
            📋 Voir mes réservations
          </button>

          <button className="pr-home-btn" onClick={() => navigate("/")}>
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}
