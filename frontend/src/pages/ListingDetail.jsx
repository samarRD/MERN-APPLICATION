import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import BookingWidget from "../components/BookingWidget"; // ✅
import ReviewSection from "../components/ReviewSection"; // ✅
import "../styles/listingDetail.css";

const AMENITY_ICONS = {
  wifi: "📶",
  piscine: "🏊",
  parking: "🚗",
  climatisation: "❄️",
  terrasse: "🌿",
  jardin: "🌳",
  barbecue: "🔥",
  jacuzzi: "🛁",
  cheminée: "🪵",
  rooftop: "🏙️",
  "plage privée": "🏖️",
  "petit déjeuner inclus": "🍳",
  "cuisine équipée": "🍽️",
  patio: "🏡",
};

const getAmenityIcon = (amenity) =>
  AMENITY_ICONS[amenity.toLowerCase()] || "✨";

const TYPE_ICONS = {
  appartement: "🏢",
  villa: "🏡",
  maison: "🏠",
  studio: "🛋️",
  chambre: "🛏️",
  chalet: "🏔️",
};

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  // ---- Fetch listing ----
  const {
    data: listing,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => api.get(`/listings/${id}`).then((res) => res.data),
  });

  // ---- Propriétaire ? ----
  const isOwner =
    user &&
    listing &&
    (listing.host?._id === user._id || listing.host?._id === user.id);

  // ---- Supprimer ----
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/listings/${id}`);
      queryClient.invalidateQueries({ queryKey: ["listings"] });

      toast.success("Logement supprimé ! 🗑️", {
        duration: 2000,
        style: {
          background: "#1a1a2e",
          color: "#fff",
          fontWeight: "600",
          borderRadius: "12px",
          padding: "14px 20px",
        },
      });

      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Erreur lors de la suppression",
      );
    } finally {
      setDeleteLoading(false);
      setShowConfirm(false);
    }
  };

  // ---- Loading ----
  if (isLoading)
    return (
      <div className="detail-loading">
        <div className="detail-skeleton-hero" />
        <div className="detail-skeleton-body">
          <div className="detail-skeleton-left">
            <div className="detail-skeleton-line w60" />
            <div className="detail-skeleton-line w40" />
            <div className="detail-skeleton-line w80" />
            <div className="detail-skeleton-line w50" />
          </div>
          <div className="detail-skeleton-right" />
        </div>
      </div>
    );

  // ---- Erreur ----
  if (isError)
    return (
      <div className="detail-error">
        <p className="detail-error-icon">😕</p>
        <p>Impossible de charger ce logement.</p>
        <button onClick={() => navigate("/")}>← Retour</button>
      </div>
    );

  return (
    <div className="detail-page">
      <div className="detail-container">
        {/* BREADCRUMB */}
        <div className="detail-breadcrumb">
          <span onClick={() => navigate("/")} className="detail-back">
            ← Retour
          </span>
          <span className="detail-bc-sep">/</span>
          <span className="detail-bc-current">{listing.title}</span>
        </div>

        {/* HEADER */}
        <div className="detail-header">
          <div className="detail-header-left">
            <div className="detail-badges">
              {listing.type && (
                <span className="detail-type-badge">
                  {TYPE_ICONS[listing.type] || "🏠"} {listing.type}
                </span>
              )}
            </div>
            <h1 className="detail-title">{listing.title}</h1>
            <p className="detail-location">📍 {listing.location}</p>
          </div>

          <div className="detail-header-right">
            <div className="detail-price-tag">
              <span className="detail-price-amount">{listing.price} €</span>
              <span className="detail-price-night">/ nuit</span>
            </div>

            {/* Boutons propriétaire */}
            {isOwner && (
              <div className="detail-owner-actions">
                <button
                  className="detail-edit-btn"
                  onClick={() => navigate(`/edit-listing/${id}`)}
                >
                  ✏️ Modifier
                </button>
                <button
                  className="detail-delete-btn"
                  onClick={() => setShowConfirm(true)}
                >
                  🗑️ Supprimer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* GALERIE */}
        <div className="detail-gallery">
          <div className="detail-gallery-main">
            <img
              src={
                listing.images?.[activeImg] ||
                "https://via.placeholder.com/800x500?text=No+Image"
              }
              alt={listing.title}
              className="detail-gallery-main-img"
            />
            {listing.images?.length > 1 && (
              <div className="detail-gallery-counter">
                📷 {activeImg + 1} / {listing.images.length}
              </div>
            )}
          </div>

          {listing.images?.length > 1 && (
            <div className="detail-gallery-thumbs">
              {listing.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Vue ${i + 1}`}
                  className={`detail-gallery-thumb ${activeImg === i ? "active" : ""}`}
                  onClick={() => setActiveImg(i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* CONTENU */}
        <div className="detail-content">
          {/* GAUCHE */}
          <div className="detail-left">
            {/* Hôte */}
            <div className="detail-host">
              <div className="detail-host-avatar">
                {listing.host?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="detail-host-info">
                <p className="detail-host-label">Logement proposé par</p>
                <p className="detail-host-name">{listing.host?.name}</p>
                <p className="detail-host-email">{listing.host?.email}</p>
              </div>
            </div>

            <div className="detail-divider" />

            {/* Stats */}
            <div className="detail-stats">
              <div className="detail-stat-item">
                <span className="detail-stat-icon">🛏️</span>
                <div>
                  <p className="detail-stat-value">{listing.bedrooms || 1}</p>
                  <p className="detail-stat-label">
                    Chambre{listing.bedrooms > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="detail-stat-divider" />
              <div className="detail-stat-item">
                <span className="detail-stat-icon">
                  {TYPE_ICONS[listing.type] || "🏠"}
                </span>
                <div>
                  <p className="detail-stat-value capitalize">
                    {listing.type || "Appartement"}
                  </p>
                  <p className="detail-stat-label">Type</p>
                </div>
              </div>
              <div className="detail-stat-divider" />
              <div className="detail-stat-item">
                <span className="detail-stat-icon">💰</span>
                <div>
                  <p className="detail-stat-value">{listing.price} €</p>
                  <p className="detail-stat-label">Par nuit</p>
                </div>
              </div>
            </div>

            <div className="detail-divider" />

            {/* Description */}
            <div className="detail-section">
              <h2 className="detail-section-title">À propos de ce logement</h2>
              <p className="detail-description">{listing.description}</p>
            </div>

            <div className="detail-divider" />

            {/* Équipements */}
            {listing.amenities?.length > 0 && (
              <div className="detail-section">
                <h2 className="detail-section-title">
                  Équipements{" "}
                  <span className="detail-amenity-count">
                    ({listing.amenities.length})
                  </span>
                </h2>
                <div className="detail-amenities">
                  {listing.amenities.map((amenity, i) => (
                    <div key={i} className="detail-amenity-item">
                      <span className="detail-amenity-icon">
                        {getAmenityIcon(amenity)}
                      </span>
                      <span className="detail-amenity-label capitalize">
                        {amenity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="detail-divider" />

            {/* Localisation */}
            <div className="detail-section">
              <h2 className="detail-section-title">Localisation</h2>
              <div className="detail-location-box">
                <span>📍</span>
                <span className="detail-location-text">{listing.location}</span>
              </div>
            </div>

            <div className="detail-divider" />

            {/* ✅ AVIS */}
            <ReviewSection listingId={id} />
          </div>

          {/* DROITE — BookingWidget */}
          <div className="detail-right">
            <BookingWidget listing={listing} />
          </div>
        </div>
      </div>

      {/* MODAL SUPPRESSION */}
      {showConfirm && (
        <div className="detail-confirm-overlay">
          <div className="detail-confirm-modal">
            <p className="detail-confirm-icon">🗑️</p>
            <h3 className="detail-confirm-title">Supprimer ce logement ?</h3>
            <p className="detail-confirm-sub">
              Cette action est irréversible. Toutes les données associées seront
              perdues.
            </p>
            <div className="detail-confirm-actions">
              <button
                className="detail-confirm-cancel"
                onClick={() => setShowConfirm(false)}
              >
                Annuler
              </button>
              <button
                className="detail-confirm-delete"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <span className="detail-spinner" />
                ) : (
                  "Oui, supprimer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
