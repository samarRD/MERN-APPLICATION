import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import "../styles/myBookings.css";

const STATUS_CONFIG = {
  pending: { label: "En attente", color: "#f97316", bg: "#fff7ed", icon: "⏳" },
  confirmed: { label: "Confirmé", color: "#22c55e", bg: "#f0fdf4", icon: "✅" },
  cancelled: { label: "Annulé", color: "#ef4444", bg: "#fff5f5", icon: "❌" },
  completed: { label: "Terminé", color: "#888", bg: "#f5f5f5", icon: "🏁" },
};

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const calcNights = (start, end) =>
  Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));

export default function MyBookings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [cancelId, setCancelId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null); // ✅ facture en cours

  const { data, isLoading, isError } = useQuery({
    queryKey: ["myBookings"],
    queryFn: () => api.get("/bookings/my-bookings").then((res) => res.data),
  });

  const bookings = Array.isArray(data)
    ? data.filter((b) => b.status !== "cancelled")
    : [];

  // ---- Annuler ----
  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelLoading(true);
    try {
      await api.put(`/bookings/${cancelId}/cancel`);
      queryClient.invalidateQueries({ queryKey: ["myBookings"] });
      toast.success("Réservation annulée !", {
        duration: 2000,
        style: {
          background: "#1a1a2e",
          color: "#fff",
          fontWeight: "600",
          borderRadius: "12px",
          padding: "14px 20px",
        },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'annulation");
    } finally {
      setCancelLoading(false);
      setCancelId(null);
    }
  };

  // ---- Payer une réservation confirmée manuellement ----
  const handlePayNow = async (booking) => {
    setPayingId(booking._id);
    try {
      const res = await api.post("/payments/create-checkout", {
        listingId: booking.listing._id,
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalPrice: booking.totalPrice,
        bookingId: booking._id,
      });
      window.location.href = res.data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors du paiement");
      setPayingId(null);
    }
  };

  // ✅ Télécharger la facture PDF
  const handleDownloadInvoice = async (bookingId) => {
    setDownloadingId(bookingId);
    try {
      const res = await api.get(`/payments/invoice/${bookingId}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `facture-${bookingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Facture téléchargée ✅");
    } catch (err) {
      toast.error("Erreur lors du téléchargement");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="bookings-page">
      <div className="bookings-container">
        {/* HEADER */}
        <div className="bookings-header">
          <div>
            <h1 className="bookings-title">Mes réservations</h1>
            <p className="bookings-subtitle">
              Retrouvez toutes vos réservations ici
            </p>
          </div>
          <button
            className="bookings-explore-btn"
            onClick={() => navigate("/")}
          >
            🔍 Explorer des logements
          </button>
        </div>

        {/* LOADING */}
        {isLoading && (
          <div className="bookings-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bookings-skeleton" />
            ))}
          </div>
        )}

        {/* ERREUR */}
        {isError && (
          <div className="bookings-empty">
            <p className="bookings-empty-icon">😕</p>
            <p className="bookings-empty-title">Erreur de chargement</p>
            <p className="bookings-empty-sub">
              Impossible de récupérer vos réservations.
            </p>
          </div>
        )}

        {/* VIDE */}
        {!isLoading && !isError && bookings.length === 0 && (
          <div className="bookings-empty">
            <p className="bookings-empty-icon">🏠</p>
            <p className="bookings-empty-title">Aucune réservation</p>
            <p className="bookings-empty-sub">
              Vous n'avez pas encore effectué de réservation.
            </p>
            <button
              className="bookings-empty-btn"
              onClick={() => navigate("/")}
            >
              Découvrir les logements →
            </button>
          </div>
        )}

        {/* LISTE */}
        {!isLoading && !isError && bookings.length > 0 && (
          <>
            <p className="bookings-count">
              {bookings.length} réservation{bookings.length > 1 ? "s" : ""}
            </p>

            <div className="bookings-grid">
              {bookings.map((booking) => {
                const status =
                  STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
                const nights = calcNights(booking.startDate, booking.endDate);
                const listing = booking.listing;
                const canCancel = ["pending", "confirmed"].includes(
                  booking.status,
                );

                // ✅ 3 états possibles pour une réservation confirmée
                const isPaid =
                  booking.status === "confirmed" && !!booking.paymentId;
                const needsPayment =
                  booking.status === "confirmed" && !booking.paymentId;

                return (
                  <div
                    key={booking._id}
                    className={`booking-card
                      ${isPaid ? "booking-card-paid" : ""}
                      ${needsPayment ? "booking-card-needs-payment" : ""}
                    `}
                  >
                    {/* Image */}
                    <div className="booking-card-img-wrap">
                      <img
                        src={
                          listing?.images?.[0] ||
                          "https://via.placeholder.com/400x200?text=No+Image"
                        }
                        alt={listing?.title || "Logement"}
                        className="booking-card-img"
                      />
                      {/* Status badge */}
                      <div
                        className="booking-card-status"
                        style={{ color: status.color, background: status.bg }}
                      >
                        {status.icon} {status.label}
                      </div>

                      {/* ✅ Badge PAYÉ en overlay sur l'image */}
                      {isPaid && (
                        <div className="booking-paid-overlay">💳 Payé</div>
                      )}
                    </div>

                    {/* Infos */}
                    <div className="booking-card-body">
                      <h3 className="booking-card-title">
                        {listing?.title || "Logement supprimé"}
                      </h3>

                      {listing?.location && (
                        <p className="booking-card-location">
                          📍 {listing.location}
                        </p>
                      )}

                      {/* ✅ Bannière PAYÉ */}
                      {isPaid && (
                        <div className="booking-paid-banner">
                          ✅ Réservation confirmée et payée
                          <span>Votre séjour est entièrement finalisé.</span>
                        </div>
                      )}

                      {/* Bannière paiement requis */}
                      {needsPayment && (
                        <div className="booking-pay-banner">
                          🎉 Votre demande a été acceptée par l'hôte !
                          <br />
                          <span>
                            Finalisez votre réservation en effectuant le
                            paiement.
                          </span>
                        </div>
                      )}

                      {/* Dates */}
                      <div className="booking-card-dates">
                        <div className="booking-card-date">
                          <span className="booking-card-date-label">
                            Arrivée
                          </span>
                          <span className="booking-card-date-value">
                            {formatDate(booking.startDate)}
                          </span>
                        </div>
                        <div className="booking-card-date-arrow">→</div>
                        <div className="booking-card-date">
                          <span className="booking-card-date-label">
                            Départ
                          </span>
                          <span className="booking-card-date-value">
                            {formatDate(booking.endDate)}
                          </span>
                        </div>
                      </div>

                      <div className="booking-card-divider" />

                      {/* Footer */}
                      <div className="booking-card-footer">
                        <div className="booking-card-nights">
                          🌙 {nights} nuit{nights > 1 ? "s" : ""}
                        </div>
                        <div className="booking-card-price">
                          <span className="booking-card-price-amount">
                            {booking.totalPrice} €
                          </span>
                          <span className="booking-card-price-label">
                            {isPaid ? "payé ✅" : "total"}
                          </span>
                        </div>
                      </div>

                      {/* ✅ Actions */}
                      <div className="booking-card-actions">
                        {/* 💳 Payer — uniquement si confirmé sans paiement */}
                        {needsPayment && (
                          <button
                            className="booking-pay-now-btn"
                            onClick={() => handlePayNow(booking)}
                            disabled={payingId === booking._id}
                          >
                            {payingId === booking._id ? (
                              <span className="bookings-spinner" />
                            ) : (
                              "💳 Payer maintenant"
                            )}
                          </button>
                        )}

                        {/* 📄 Télécharger facture — uniquement si payé */}
                        {isPaid && (
                          <button
                            className="booking-invoice-btn"
                            onClick={() => handleDownloadInvoice(booking._id)}
                            disabled={downloadingId === booking._id}
                          >
                            {downloadingId === booking._id ? (
                              <span className="bookings-spinner" />
                            ) : (
                              "📄 Télécharger la facture"
                            )}
                          </button>
                        )}

                        {/* Voir le logement */}
                        {!needsPayment && listing?._id && (
                          <button
                            className="booking-card-btn"
                            onClick={() => navigate(`/listing/${listing._id}`)}
                          >
                            Voir le logement →
                          </button>
                        )}

                        {/* ❌ Annuler */}
                        {canCancel && (
                          <button
                            className="booking-card-cancel-btn"
                            onClick={() => setCancelId(booking._id)}
                          >
                            ❌ Annuler
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* MODAL ANNULATION */}
      {cancelId && (
        <div className="bookings-confirm-overlay">
          <div className="bookings-confirm-modal">
            <p className="bookings-confirm-icon">❌</p>
            <h3 className="bookings-confirm-title">
              Annuler cette réservation ?
            </h3>
            <p className="bookings-confirm-sub">
              Cette action est irréversible. Votre réservation sera
              définitivement annulée.
            </p>
            <div className="bookings-confirm-actions">
              <button
                className="bookings-confirm-back"
                onClick={() => setCancelId(null)}
              >
                Garder la réservation
              </button>
              <button
                className="bookings-confirm-cancel"
                onClick={handleCancel}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <span className="bookings-spinner" />
                ) : (
                  "Oui, annuler"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
