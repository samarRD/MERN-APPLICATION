import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import "../styles/dashboard.css";

const STATUS_CONFIG = {
  pending: { label: "En attente", color: "#f97316", bg: "#fff7ed", icon: "⏳" },
  confirmed: { label: "Confirmé", color: "#22c55e", bg: "#f0fdf4", icon: "✅" },
  cancelled: { label: "Annulé", color: "#ef4444", bg: "#fef2f2", icon: "❌" },
  completed: { label: "Terminé", color: "#888", bg: "#f5f5f5", icon: "🏁" },
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const calcNights = (start, end) =>
  Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("bookings");
  const [filterStatus, setFilterStatus] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null); // ✅ supprimer réservation annulée
  const [togglingId, setTogglingId] = useState(null);
  const [optimisticBooks, setOptimisticBooks] = useState({});

  // ---- Fetch réservations hôte ----
  const { data: bookings = [], isLoading: bLoading } = useQuery({
    queryKey: ["hostBookings"],
    queryFn: () => api.get("/bookings/host-bookings").then((r) => r.data),
  });

  // ---- Fetch listings ----
  const { data: allListings = [], isLoading: lLoading } = useQuery({
    queryKey: ["listings"],
    queryFn: () => api.get("/listings").then((r) => r.data),
  });

  const myListings = allListings.filter(
    (l) => l.host?._id === user?._id || l.host?._id === user?.id,
  );

  const filteredBookings =
    filterStatus === "all"
      ? bookings
      : bookings.filter((b) => b.status === filterStatus);

  // ✅ Stats corrigées
  const stats = {
    listings: myListings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,

    // 💰 Revenus encaissés = confirmed + paymentId (argent reçu)
    revenue: bookings
      .filter((b) => b.status === "confirmed" && b.paymentId)
      .reduce((sum, b) => sum + b.totalPrice, 0),

    // ⏳ En attente de paiement = confirmed + !paymentId (confirmé manuellement, pas encore payé)
    awaitingPayment: bookings.filter(
      (b) => b.status === "confirmed" && !b.paymentId,
    ).length,
  };

  // ---- Changer statut réservation ----
  const handleStatus = async (bookingId, status) => {
    setUpdatingId(bookingId);
    try {
      await api.put(`/bookings/${bookingId}/status`, { status });
      queryClient.invalidateQueries({ queryKey: ["hostBookings"] });
      const label = status === "confirmed" ? "confirmée ✅" : "annulée ❌";
      toast.success(`Réservation ${label}`, {
        style: {
          background: status === "confirmed" ? "#22c55e" : "#ef4444",
          color: "#fff",
          fontWeight: "600",
          borderRadius: "12px",
          padding: "14px 20px",
        },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur");
    } finally {
      setUpdatingId(null);
    }
  };

  // ✅ Supprimer une réservation annulée
  const handleDelete = async (bookingId) => {
    setDeletingId(bookingId);
    try {
      await api.delete(`/bookings/${bookingId}`);
      queryClient.invalidateQueries({ queryKey: ["hostBookings"] });
      toast.success("Réservation supprimée 🗑️", {
        style: {
          background: "#1a1a2e",
          color: "#fff",
          fontWeight: "600",
          borderRadius: "12px",
          padding: "14px 20px",
        },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur");
    } finally {
      setDeletingId(null);
    }
  };

  // ---- Toggle instantBook ----
  const handleToggleInstantBook = async (listing) => {
    const newValue = !(optimisticBooks[listing._id] ?? listing.instantBook);
    setOptimisticBooks((prev) => ({ ...prev, [listing._id]: newValue }));
    setTogglingId(listing._id);
    try {
      await api.put(`/listings/${listing._id}`, {
        ...listing,
        instantBook: newValue,
      });
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      await queryClient.refetchQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing", listing._id] });
      toast.success(
        newValue
          ? "⚡ Réservation instantanée activée !"
          : "📋 Confirmation manuelle activée !",
        {
          style: {
            background: "#1a1a2e",
            color: "#fff",
            fontWeight: "600",
            borderRadius: "12px",
            padding: "14px 20px",
          },
        },
      );
    } catch (err) {
      setOptimisticBooks((prev) => ({ ...prev, [listing._id]: !newValue }));
      toast.error(err.response?.data?.message || "Erreur");
    } finally {
      setTogglingId(null);
    }
  };

  if (user?.role !== "host") {
    return (
      <div className="db-unauthorized">
        <p>🔒</p>
        <h2>Accès réservé aux hôtes</h2>
        <button onClick={() => navigate("/")}>← Retour</button>
      </div>
    );
  }

  return (
    <div className="db-page">
      <div className="db-container">
        {/* HEADER */}
        <div className="db-header">
          <div>
            <h1 className="db-title">Dashboard hôte</h1>
            <p className="db-subtitle">
              Bonjour {user.name} 👋 — gérez vos logements et réservations
            </p>
          </div>
          <button
            className="db-add-btn"
            onClick={() => navigate("/create-listing")}
          >
            ➕ Nouveau logement
          </button>
        </div>

        {/* ✅ STATS — 5 cartes */}
        <div className="db-stats">
          <div className="db-stat-card">
            <div
              className="db-stat-icon"
              style={{ background: "#fff5f5", color: "#e63946" }}
            >
              🏠
            </div>
            <div>
              <p className="db-stat-value">{stats.listings}</p>
              <p className="db-stat-label">Logements</p>
            </div>
          </div>

          <div className="db-stat-card">
            <div
              className="db-stat-icon"
              style={{ background: "#fff7ed", color: "#f97316" }}
            >
              ⏳
            </div>
            <div>
              <p className="db-stat-value">{stats.pending}</p>
              <p className="db-stat-label">Demandes en attente</p>
            </div>
          </div>

          <div className="db-stat-card">
            <div
              className="db-stat-icon"
              style={{ background: "#f0fdf4", color: "#22c55e" }}
            >
              ✅
            </div>
            <div>
              <p className="db-stat-value">{stats.confirmed}</p>
              <p className="db-stat-label">Confirmées</p>
            </div>
          </div>

          {/* ✅ En attente de paiement (confirmé sans paymentId) */}
          <div
            className={`db-stat-card ${stats.awaitingPayment > 0 ? "db-stat-awaiting" : ""}`}
          >
            <div
              className="db-stat-icon"
              style={{ background: "#f0f9ff", color: "#0284c7" }}
            >
              💳
            </div>
            <div>
              <p className="db-stat-value">{stats.awaitingPayment}</p>
              <p className="db-stat-label">En attente de paiement</p>
            </div>
          </div>

          {/* ✅ Revenus encaissés = payé uniquement */}
          <div className="db-stat-card db-stat-revenue">
            <div
              className="db-stat-icon"
              style={{ background: "#fefce8", color: "#ca8a04" }}
            >
              💰
            </div>
            <div>
              <p className="db-stat-value">{stats.revenue} €</p>
              <p className="db-stat-label">Revenus encaissés</p>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="db-tabs">
          <button
            className={`db-tab ${activeTab === "bookings" ? "active" : ""}`}
            onClick={() => setActiveTab("bookings")}
          >
            🗓️ Réservations
            {stats.pending > 0 && (
              <span className="db-tab-badge">{stats.pending}</span>
            )}
          </button>
          <button
            className={`db-tab ${activeTab === "listings" ? "active" : ""}`}
            onClick={() => setActiveTab("listings")}
          >
            🏠 Mes logements
            <span className="db-tab-count">{stats.listings}</span>
          </button>
        </div>

        {/* ==========================================
            ONGLET RÉSERVATIONS
        ========================================== */}
        {activeTab === "bookings" && (
          <div className="db-section">
            <div className="db-filters">
              {["all", "pending", "confirmed", "cancelled"].map((s) => (
                <button
                  key={s}
                  className={`db-filter-btn ${filterStatus === s ? "active" : ""}`}
                  onClick={() => setFilterStatus(s)}
                >
                  {s === "all" ? "Toutes" : ""}
                  {s === "pending" ? "⏳ En attente" : ""}
                  {s === "confirmed" ? "✅ Confirmées" : ""}
                  {s === "cancelled" ? "❌ Annulées" : ""}
                </button>
              ))}
            </div>

            {bLoading && (
              <div className="db-grid">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="db-skeleton" />
                ))}
              </div>
            )}

            {!bLoading && filteredBookings.length === 0 && (
              <div className="db-empty">
                <p className="db-empty-icon">📭</p>
                <p className="db-empty-title">Aucune réservation</p>
                <p className="db-empty-sub">
                  {filterStatus === "all"
                    ? "Vous n'avez pas encore reçu de réservation."
                    : "Aucune réservation avec ce statut."}
                </p>
              </div>
            )}

            {!bLoading && filteredBookings.length > 0 && (
              <div className="db-bookings-list">
                {filteredBookings.map((booking) => {
                  const status =
                    STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
                  const nights = calcNights(booking.startDate, booking.endDate);
                  const listing = booking.listing;
                  const guest = booking.guest;
                  const isUpdating = updatingId === booking._id;

                  // ✅ Confirmé manuellement, pas encore payé
                  const awaitingPayment =
                    booking.status === "confirmed" && !booking.paymentId;

                  return (
                    <div
                      key={booking._id}
                      className={`db-booking-card ${awaitingPayment ? "db-booking-awaiting" : ""}`}
                    >
                      <div className="db-booking-img-wrap">
                        <img
                          src={
                            listing?.images?.[0] ||
                            "https://via.placeholder.com/120x90?text=No+Image"
                          }
                          alt={listing?.title}
                          className="db-booking-img"
                        />
                      </div>

                      <div className="db-booking-info">
                        <div className="db-booking-top">
                          <div>
                            <h3 className="db-booking-listing">
                              {listing?.title || "Logement supprimé"}
                            </h3>
                            <p className="db-booking-location">
                              📍 {listing?.location}
                            </p>
                          </div>
                          <div className="db-booking-badges">
                            <div
                              className="db-booking-status"
                              style={{
                                color: status.color,
                                background: status.bg,
                              }}
                            >
                              {status.icon} {status.label}
                            </div>
                            {/* ✅ Badge paiement en attente */}
                            {awaitingPayment && (
                              <div className="db-booking-payment-badge">
                                💳 Paiement en attente
                              </div>
                            )}
                            {/* ✅ Badge payé */}
                            {booking.status === "confirmed" &&
                              booking.paymentId && (
                                <div className="db-booking-paid-badge">
                                  💰 Payé
                                </div>
                              )}
                          </div>
                        </div>

                        <div className="db-booking-guest">
                          <div className="db-guest-avatar">
                            {guest?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="db-guest-name">{guest?.name}</p>
                            <p className="db-guest-email">{guest?.email}</p>
                          </div>
                        </div>

                        <div className="db-booking-meta">
                          <div className="db-booking-dates">
                            <span>📅 {formatDate(booking.startDate)}</span>
                            <span className="db-booking-arrow">→</span>
                            <span>{formatDate(booking.endDate)}</span>
                            <span className="db-booking-nights">
                              🌙 {nights} nuit{nights > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="db-booking-price">
                            {booking.totalPrice} €
                          </div>
                        </div>
                      </div>

                      {booking.status === "pending" && (
                        <div className="db-booking-actions">
                          <button
                            className="db-confirm-btn"
                            onClick={() =>
                              handleStatus(booking._id, "confirmed")
                            }
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <span className="db-spinner" />
                            ) : (
                              "✅ Confirmer"
                            )}
                          </button>
                          <button
                            className="db-cancel-btn"
                            onClick={() =>
                              handleStatus(booking._id, "cancelled")
                            }
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <span className="db-spinner" />
                            ) : (
                              "❌ Annuler"
                            )}
                          </button>
                        </div>
                      )}

                      {booking.status === "confirmed" && (
                        <div className="db-booking-actions">
                          <button
                            className="db-cancel-btn"
                            onClick={() =>
                              handleStatus(booking._id, "cancelled")
                            }
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <span className="db-spinner" />
                            ) : (
                              "❌ Annuler"
                            )}
                          </button>
                        </div>
                      )}

                      {/* ✅ Bouton supprimer — réservations annulées uniquement */}
                      {booking.status === "cancelled" && (
                        <div className="db-booking-actions">
                          <button
                            className="db-delete-btn"
                            onClick={() => handleDelete(booking._id)}
                            disabled={deletingId === booking._id}
                          >
                            {deletingId === booking._id ? (
                              <span className="db-spinner" />
                            ) : (
                              "🗑️ Supprimer"
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            ONGLET LOGEMENTS
        ========================================== */}
        {activeTab === "listings" && (
          <div className="db-section">
            {lLoading && (
              <div className="db-grid">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="db-skeleton" />
                ))}
              </div>
            )}

            {!lLoading && myListings.length === 0 && (
              <div className="db-empty">
                <p className="db-empty-icon">🏠</p>
                <p className="db-empty-title">Aucun logement publié</p>
                <p className="db-empty-sub">
                  Commencez par publier votre premier logement.
                </p>
                <button
                  className="db-empty-btn"
                  onClick={() => navigate("/create-listing")}
                >
                  ➕ Publier un logement
                </button>
              </div>
            )}

            {!lLoading && myListings.length > 0 && (
              <div className="db-listings-grid">
                {myListings.map((listing) => (
                  <div key={listing._id} className="db-listing-card">
                    <div className="db-listing-img-wrap">
                      <img
                        src={
                          listing.images?.[0] ||
                          "https://via.placeholder.com/300x180?text=No+Image"
                        }
                        alt={listing.title}
                        className="db-listing-img"
                      />
                      <div className="db-listing-price">
                        {listing.price} € / nuit
                      </div>
                    </div>

                    <div className="db-listing-body">
                      <h3 className="db-listing-title">{listing.title}</h3>
                      <p className="db-listing-location">
                        📍 {listing.location}
                      </p>

                      {/* TOGGLE INSTANT BOOK */}
                      {(() => {
                        const isInstant =
                          optimisticBooks[listing._id] ?? listing.instantBook;
                        return (
                          <div className="db-instant-toggle">
                            <div className="db-instant-info">
                              <span className="db-instant-label">
                                {isInstant
                                  ? "⚡ Réservation instantanée"
                                  : "📋 Confirmation manuelle"}
                              </span>
                              <span className="db-instant-desc">
                                {isInstant
                                  ? "Les voyageurs paient directement"
                                  : "Vous acceptez les demandes manuellement"}
                              </span>
                            </div>
                            <button
                              className={`db-toggle-btn ${isInstant ? "on" : "off"}`}
                              onClick={() => handleToggleInstantBook(listing)}
                              disabled={togglingId === listing._id}
                            >
                              {togglingId === listing._id ? (
                                <span className="db-toggle-spinner" />
                              ) : (
                                <span className="db-toggle-circle" />
                              )}
                            </button>
                          </div>
                        );
                      })()}

                      <div className="db-listing-actions">
                        <button
                          className="db-listing-view"
                          onClick={() => navigate(`/listing/${listing._id}`)}
                        >
                          👁️ Voir
                        </button>
                        <button
                          className="db-listing-edit"
                          onClick={() =>
                            navigate(`/edit-listing/${listing._id}`)
                          }
                        >
                          ✏️ Modifier
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
