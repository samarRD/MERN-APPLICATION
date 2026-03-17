import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import "../styles/bookingWidget.css";

export default function BookingWidget({ listing }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  // ---- Fetch booked dates ----
  const { data: bookedData } = useQuery({
    queryKey: ["bookedDates", listing._id],
    queryFn: () =>
      api.get(`/listings/${listing._id}/booked-dates`).then((r) => r.data),
  });

  const bookedDates = bookedData?.bookedDates || [];

  // ---- Propriétaire ? ----
  const isOwner =
    user && (listing.host?._id === user._id || listing.host?._id === user.id);

  // ---- Calculs ----
  const nights =
    startDate && endDate
      ? Math.ceil(
          (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24),
        )
      : 0;

  const totalPrice = nights > 0 ? nights * listing.price : 0;

  // ---- Vérification dates ----
  const isDateBooked = (dateStr) => bookedDates.includes(dateStr);

  const hasConflict = (start, end) => {
    if (!start || !end) return false;
    const current = new Date(start);
    const endD = new Date(end);
    while (current <= endD) {
      const str = current.toISOString().split("T")[0];
      if (isDateBooked(str)) return true;
      current.setDate(current.getDate() + 1);
    }
    return false;
  };

  const conflict = hasConflict(startDate, endDate);
  const startBooked = startDate && isDateBooked(startDate);
  const endBooked = endDate && isDateBooked(endDate);
  const today = new Date().toISOString().split("T")[0];
  const datesValid = startDate && endDate && nights > 0 && !conflict;

  // ---- Mode instantané → Checkout → Stripe ----
  const handleInstantBook = () => {
    if (!user) return navigate("/login");
    if (!datesValid) return toast.error("Choisissez des dates valides !");

    navigate("/checkout", {
      state: { listing, startDate, endDate, nights, totalPrice },
    });
  };

  // ---- Mode manuel → réservation pending → hôte confirme ----
  const handleManualBook = async () => {
    if (!user) return navigate("/login");
    if (!datesValid) return toast.error("Choisissez des dates valides !");

    setManualLoading(true);
    try {
      await api.post("/bookings", {
        listing: listing._id,
        startDate,
        endDate,
        totalPrice,
      });

      queryClient.invalidateQueries({ queryKey: ["myBookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookedDates", listing._id] });

      toast.success("Demande de réservation envoyée ! ⏳", {
        duration: 3000,
        style: {
          background: "#1a1a2e",
          color: "#fff",
          fontWeight: "600",
          borderRadius: "12px",
          padding: "14px 20px",
        },
      });

      navigate("/bookings");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Erreur lors de la réservation",
      );
    } finally {
      setManualLoading(false);
    }
  };

  // ---- Vue propriétaire ----
  if (isOwner) {
    return (
      <div className="bw-card">
        <div className="bw-owner">
          <p className="bw-owner-icon">🏠</p>
          <p className="bw-owner-text">C'est votre logement</p>
          <div className="bw-owner-mode">
            {listing.instantBook ? (
              <span className="bw-mode-badge instant">
                ⚡ Réservation instantanée
              </span>
            ) : (
              <span className="bw-mode-badge manual">
                📋 Confirmation manuelle
              </span>
            )}
          </div>
          <button
            className="bw-owner-btn"
            onClick={() => navigate(`/edit-listing/${listing._id}`)}
          >
            ✏️ Modifier l'annonce
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bw-card">
      {/* Badge mode */}
      <div className="bw-mode-header">
        {listing.instantBook ? (
          <span className="bw-mode-badge instant">
            ⚡ Réservation instantanée
          </span>
        ) : (
          <span className="bw-mode-badge manual">
            📋 Confirmation par l'hôte
          </span>
        )}
      </div>

      {/* Prix */}
      <div className="bw-price-header">
        <span className="bw-price-amount">{listing.price} €</span>
        <span className="bw-price-night">/ nuit</span>
      </div>

      {/* Dates */}
      <div className="bw-dates">
        <div className="bw-date-field">
          <label className="bw-label">Arrivée</label>
          <input
            type="date"
            value={startDate}
            min={today}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (endDate && e.target.value >= endDate) setEndDate("");
            }}
            className={`bw-input ${startBooked ? "bw-input-error" : ""}`}
          />
          {startBooked && (
            <p className="bw-error-msg">❌ Date non disponible</p>
          )}
        </div>

        <div className="bw-date-field">
          <label className="bw-label">Départ</label>
          <input
            type="date"
            value={endDate}
            min={startDate || today}
            onChange={(e) => setEndDate(e.target.value)}
            className={`bw-input ${endBooked ? "bw-input-error" : ""}`}
          />
          {endBooked && <p className="bw-error-msg">❌ Date non disponible</p>}
        </div>
      </div>

      {/* Conflit */}
      {conflict && !startBooked && !endBooked && (
        <div className="bw-booked-info">
          ❌ Certaines dates de cette période sont déjà réservées
        </div>
      )}

      {/* Résumé */}
      {nights > 0 && !conflict && (
        <div className="bw-summary">
          <div className="bw-summary-row">
            <span>
              {listing.price} € × {nights} nuit{nights > 1 ? "s" : ""}
            </span>
            <span>{totalPrice} €</span>
          </div>
          <div className="bw-summary-divider" />
          <div className="bw-summary-row bw-summary-total">
            <span>Total</span>
            <span>{totalPrice} €</span>
          </div>
        </div>
      )}

      {/* ✅ BOUTON selon le mode */}
      {listing.instantBook ? (
        // ⚡ Mode instantané → Checkout → Stripe
        <>
          <button
            className={`bw-reserve-btn ${!datesValid ? "bw-btn-disabled" : ""}`}
            onClick={handleInstantBook}
            disabled={!datesValid}
          >
            {user ? "⚡ Réserver" : "Connectez-vous pour réserver"}
          </button>
          {user && <p className="bw-secure">Vous ne serez pas encore débité</p>}
        </>
      ) : (
        // 📋 Mode manuel → demande → hôte confirme
        <>
          <button
            className={`bw-reserve-btn manual ${!datesValid ? "bw-btn-disabled" : ""} ${manualLoading ? "loading" : ""}`}
            onClick={handleManualBook}
            disabled={!datesValid || manualLoading}
          >
            {manualLoading ? (
              <span className="bw-spinner" />
            ) : user ? (
              "Envoyer une demande"
            ) : (
              "Connectez-vous pour réserver"
            )}
          </button>
          {user && (
            <p className="bw-secure">
              L'hôte doit confirmer votre demande avant le paiement
            </p>
          )}
        </>
      )}
    </div>
  );
}
