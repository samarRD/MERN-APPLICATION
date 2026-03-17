import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../styles/reviewSection.css";

const StarRating = ({ value, onChange, readonly = false }) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="rs-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`rs-star ${
            star <= (readonly ? value : hovered || value) ? "filled" : ""
          } ${readonly ? "readonly" : "interactive"}`}
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function ReviewSection({ listingId }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ---- Fetch avis ----
  const { data, isLoading } = useQuery({
    queryKey: ["reviews", listingId],
    queryFn: () =>
      api.get(`/listings/${listingId}/reviews`).then((r) => r.data),
  });

  const reviews = data?.reviews || [];
  const average = data?.average || 0;
  const total = data?.total || 0;

  // ---- A-t-il déjà laissé un avis ? ----
  const userReview = user
    ? reviews.find((r) => r.user?._id === user._id || r.user?._id === user.id)
    : null;

  // ---- Soumettre un avis ----
  const handleSubmit = async () => {
    if (!user) return navigate("/login");
    if (rating === 0) return toast.error("Choisissez une note !");
    if (!comment.trim()) return toast.error("Écrivez un commentaire !");

    setSubmitting(true);
    try {
      await api.post(`/listings/${listingId}/reviews`, { rating, comment });

      queryClient.invalidateQueries({ queryKey: ["reviews", listingId] });

      toast.success("Avis publié ! ⭐", {
        style: {
          background: "#22c55e",
          color: "#fff",
          fontWeight: "600",
          borderRadius: "12px",
        },
      });

      setRating(0);
      setComment("");
      setShowForm(false);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Erreur lors de la publication",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Supprimer son avis ----
  const handleDelete = async (reviewId) => {
    setDeletingId(reviewId);
    try {
      await api.delete(`/listings/${listingId}/reviews/${reviewId}`);
      queryClient.invalidateQueries({ queryKey: ["reviews", listingId] });
      toast.success("Avis supprimé !");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rs-section">
      {/* ---- HEADER ---- */}
      <div className="rs-header">
        <h2 className="rs-title">
          Avis des voyageurs
          {total > 0 && <span className="rs-total">({total})</span>}
        </h2>

        {/* Moyenne globale */}
        {total > 0 && (
          <div className="rs-average">
            <StarRating value={Math.round(average)} readonly />
            <span className="rs-average-value">{average}</span>
            <span className="rs-average-label">/ 5</span>
          </div>
        )}
      </div>

      {/* ---- BOUTON LAISSER UN AVIS ---- */}
      {user && !userReview && !showForm && (
        <button className="rs-write-btn" onClick={() => setShowForm(true)}>
          ✏️ Laisser un avis
        </button>
      )}

      {/* ---- FORMULAIRE ---- */}
      {showForm && (
        <div className="rs-form">
          <h3 className="rs-form-title">Votre avis</h3>

          <div className="rs-form-rating">
            <label className="rs-form-label">Note *</label>
            <StarRating value={rating} onChange={setRating} />
            {rating > 0 && (
              <span className="rs-rating-label">
                {
                  ["", "Mauvais", "Passable", "Bien", "Très bien", "Excellent"][
                    rating
                  ]
                }
              </span>
            )}
          </div>

          <div className="rs-form-field">
            <label className="rs-form-label">Commentaire *</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Partagez votre expérience..."
              className="rs-form-textarea"
              rows={4}
              maxLength={500}
            />
            <span className="rs-char-count">{comment.length}/500</span>
          </div>

          <div className="rs-form-actions">
            <button
              className="rs-form-cancel"
              onClick={() => {
                setShowForm(false);
                setRating(0);
                setComment("");
              }}
            >
              Annuler
            </button>
            <button
              className="rs-form-submit"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <span className="rs-spinner" /> : "Publier l'avis"}
            </button>
          </div>
        </div>
      )}

      {/* ---- PAS CONNECTÉ ---- */}
      {!user && (
        <p className="rs-login-hint">
          <span onClick={() => navigate("/login")}>Connectez-vous</span> pour
          laisser un avis
        </p>
      )}

      {/* ---- LOADING ---- */}
      {isLoading && (
        <div className="rs-loading">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rs-skeleton" />
          ))}
        </div>
      )}

      {/* ---- AUCUN AVIS ---- */}
      {!isLoading && reviews.length === 0 && (
        <div className="rs-empty">
          <p className="rs-empty-icon">💬</p>
          <p className="rs-empty-text">Aucun avis pour l'instant</p>
        </div>
      )}

      {/* ---- LISTE DES AVIS ---- */}
      {!isLoading && reviews.length > 0 && (
        <div className="rs-list">
          {reviews.map((review) => {
            const isOwner =
              user &&
              (review.user?._id === user._id || review.user?._id === user.id);

            return (
              <div key={review._id} className="rs-review-card">
                <div className="rs-review-header">
                  <div className="rs-reviewer">
                    <div className="rs-reviewer-avatar">
                      {review.user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="rs-reviewer-name">{review.user?.name}</p>
                      <p className="rs-review-date">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="rs-review-right">
                    <StarRating value={review.rating} readonly />
                    {isOwner && (
                      <button
                        className="rs-delete-btn"
                        onClick={() => handleDelete(review._id)}
                        disabled={deletingId === review._id}
                      >
                        {deletingId === review._id ? (
                          <span className="rs-spinner-sm" />
                        ) : (
                          "🗑️"
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <p className="rs-review-comment">{review.comment}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
