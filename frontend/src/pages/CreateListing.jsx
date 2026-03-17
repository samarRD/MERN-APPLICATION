import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import "../styles/createListing.css";
import { geocodeLocation } from "../utils/geocode"; // ✅

const TYPES = [
  { value: "appartement", label: "Appartement", icon: "🏢" },
  { value: "villa", label: "Villa", icon: "🏡" },
  { value: "maison", label: "Maison", icon: "🏠" },
  { value: "studio", label: "Studio", icon: "🛋️" },
  { value: "chambre", label: "Chambre", icon: "🛏️" },
  { value: "chalet", label: "Chalet", icon: "🏔️" },
];

const AMENITIES_LIST = [
  { value: "wifi", label: "Wifi", icon: "📶" },
  { value: "piscine", label: "Piscine", icon: "🏊" },
  { value: "parking", label: "Parking", icon: "🚗" },
  { value: "climatisation", label: "Climatisation", icon: "❄️" },
  { value: "terrasse", label: "Terrasse", icon: "🌿" },
  { value: "jardin", label: "Jardin", icon: "🌳" },
  { value: "barbecue", label: "Barbecue", icon: "🔥" },
  { value: "jacuzzi", label: "Jacuzzi", icon: "🛁" },
  { value: "cheminée", label: "Cheminée", icon: "🪵" },
  { value: "rooftop", label: "Rooftop", icon: "🏙️" },
  { value: "plage privée", label: "Plage privée", icon: "🏖️" },
  { value: "petit déjeuner inclus", label: "Petit déjeuner", icon: "🍳" },
  { value: "cuisine équipée", label: "Cuisine équipée", icon: "🍽️" },
  { value: "patio", label: "Patio", icon: "🏡" },
];

export default function CreateListing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    location: "",
    type: "appartement",
    bedrooms: 1,
    amenities: [],
    images: [],
  });

  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 3;

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const toggleAmenity = (value) => {
    const exists = formData.amenities.includes(value);
    setFormData({
      ...formData,
      amenities: exists
        ? formData.amenities.filter((a) => a !== value)
        : [...formData.amenities, value],
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const remaining = 5 - formData.images.length;
    if (remaining <= 0) {
      toast.error("Maximum 5 photos !");
      return;
    }

    const filesToUpload = files.slice(0, remaining);
    if (files.length > remaining)
      toast.error(
        `Seulement ${remaining} photo(s) restante(s) — les autres ont été ignorées`,
      );

    setUploadLoading(true);
    try {
      const data = new FormData();
      filesToUpload.forEach((file) => data.append("images", file));
      const res = await api.post("/upload", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...res.data.urls],
      }));
      toast.success(`${res.data.urls.length} photo(s) uploadée(s) ✅`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'upload");
    } finally {
      setUploadLoading(false);
      e.target.value = "";
    }
  };

  const removeImage = (index) =>
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });

  const validateStep = () => {
    if (step === 1) {
      if (!formData.title.trim()) {
        toast.error("Le titre est requis");
        return false;
      }
      if (!formData.description.trim()) {
        toast.error("La description est requise");
        return false;
      }
      if (!formData.location.trim()) {
        toast.error("La localisation est requise");
        return false;
      }
    }
    if (step === 2) {
      if (!formData.price || Number(formData.price) <= 0) {
        toast.error("Le prix doit être supérieur à 0");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // ✅ Géocoder automatiquement avant publication
  const handlePublish = async () => {
    setLoading(true);
    try {
      // ✅ Appel Nominatim pour convertir l'adresse en coordonnées GPS
      const coords = await geocodeLocation(formData.location);

      if (!coords) {
        toast(
          "📍 Localisation introuvable sur la carte, le logement sera publié sans coordonnées.",
          {
            icon: "⚠️",
            duration: 3000,
          },
        );
      }

      await api.post("/listings", {
        ...formData,
        price: Number(formData.price),
        bedrooms: Number(formData.bedrooms),
        lat: coords?.lat ?? null, // ✅
        lng: coords?.lng ?? null, // ✅
      });

      toast.success("Logement publié avec succès ! 🎉", {
        duration: 2000,
        style: {
          background: "#22c55e",
          color: "#fff",
          fontWeight: "600",
          borderRadius: "12px",
          padding: "14px 20px",
        },
      });

      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Erreur lors de la publication",
      );
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== "host") {
    return (
      <div className="cl-unauthorized">
        <p className="cl-unauthorized-icon">🔒</p>
        <h2>Accès réservé aux hôtes</h2>
        <p>Seuls les hôtes peuvent publier des logements.</p>
        <button onClick={() => navigate("/")}>← Retour à l'accueil</button>
      </div>
    );
  }

  return (
    <div className="cl-page">
      <div className="cl-container">
        {/* HEADER */}
        <div className="cl-header">
          <button className="cl-back" onClick={() => navigate("/")}>
            ← Retour
          </button>
          <div className="cl-header-text">
            <h1 className="cl-title">Publier un logement</h1>
            <p className="cl-subtitle">
              Partagez votre bien avec des voyageurs du monde entier
            </p>
          </div>
        </div>

        {/* PROGRESS */}
        <div className="cl-progress">
          {[1, 2, 3].map((s) => (
            <div key={s} className="cl-progress-step">
              <div
                className={`cl-progress-circle ${step >= s ? "active" : ""} ${step > s ? "done" : ""}`}
              >
                {step > s ? "✓" : s}
              </div>
              <span
                className={`cl-progress-label ${step >= s ? "active" : ""}`}
              >
                {s === 1 ? "Informations" : s === 2 ? "Tarif & Type" : "Photos"}
              </span>
              {s < 3 && (
                <div className={`cl-progress-line ${step > s ? "done" : ""}`} />
              )}
            </div>
          ))}
        </div>

        <div className="cl-form">
          {/* ÉTAPE 1 */}
          {step === 1 && (
            <div className="cl-step">
              <h2 className="cl-step-title">📝 Informations générales</h2>

              <div className="cl-field">
                <label className="cl-label">Titre du logement *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ex: Villa avec piscine à Hammamet"
                  className="cl-input"
                  maxLength={80}
                />
                <span className="cl-char-count">
                  {formData.title.length}/80
                </span>
              </div>

              <div className="cl-field">
                <label className="cl-label">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Décrivez votre logement..."
                  className="cl-textarea"
                  rows={5}
                  maxLength={500}
                />
                <span className="cl-char-count">
                  {formData.description.length}/500
                </span>
              </div>

              <div className="cl-field">
                <label className="cl-label">
                  Localisation *
                  <span className="cl-label-geo">
                    📍 Les coordonnées GPS seront détectées automatiquement
                  </span>
                </label>
                <div className="cl-input-icon-wrap">
                  <span className="cl-input-icon">📍</span>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Ex: Hammamet, Tunisie"
                    className="cl-input cl-input-with-icon"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 */}
          {step === 2 && (
            <div className="cl-step">
              <h2 className="cl-step-title">🏡 Type & Tarification</h2>

              <div className="cl-field">
                <label className="cl-label">Type de logement *</label>
                <div className="cl-type-grid">
                  {TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className={`cl-type-btn ${formData.type === t.value ? "active" : ""}`}
                      onClick={() =>
                        setFormData({ ...formData, type: t.value })
                      }
                    >
                      <span className="cl-type-icon">{t.icon}</span>
                      <span className="cl-type-label">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="cl-row">
                <div className="cl-field">
                  <label className="cl-label">Prix par nuit (€) *</label>
                  <div className="cl-input-icon-wrap">
                    <span className="cl-input-icon">💶</span>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="Ex: 150"
                      className="cl-input cl-input-with-icon"
                      min="1"
                    />
                  </div>
                </div>
                <div className="cl-field">
                  <label className="cl-label">Nombre de chambres</label>
                  <div className="cl-counter">
                    <button
                      type="button"
                      className="cl-counter-btn"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          bedrooms: Math.max(1, formData.bedrooms - 1),
                        })
                      }
                    >
                      −
                    </button>
                    <span className="cl-counter-value">
                      {formData.bedrooms}
                    </span>
                    <button
                      type="button"
                      className="cl-counter-btn"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          bedrooms: Math.min(20, formData.bedrooms + 1),
                        })
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="cl-field">
                <label className="cl-label">
                  Équipements{" "}
                  <span className="cl-label-muted">
                    ({formData.amenities.length} sélectionné
                    {formData.amenities.length > 1 ? "s" : ""})
                  </span>
                </label>
                <div className="cl-amenities-grid">
                  {AMENITIES_LIST.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      className={`cl-amenity-btn ${formData.amenities.includes(a.value) ? "active" : ""}`}
                      onClick={() => toggleAmenity(a.value)}
                    >
                      <span>{a.icon}</span>
                      <span>{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 */}
          {step === 3 && (
            <div className="cl-step">
              <h2 className="cl-step-title">📸 Photos du logement</h2>
              <p className="cl-step-desc">
                Uploadez vos photos depuis votre appareil (max 5, 5MB chacune).
              </p>

              {formData.images.length < 5 && (
                <label
                  className={`cl-upload-zone ${uploadLoading ? "loading" : ""}`}
                >
                  {uploadLoading ? (
                    <div className="cl-upload-loading">
                      <span className="cl-spinner" />
                      <span>Upload en cours...</span>
                    </div>
                  ) : (
                    <>
                      <span className="cl-upload-icon">📁</span>
                      <span className="cl-upload-text">
                        Cliquez pour ajouter des photos
                      </span>
                      <span className="cl-upload-hint">
                        JPG, PNG, WEBP — max 5MB
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploadLoading}
                    style={{ display: "none" }}
                  />
                </label>
              )}

              {formData.images.length > 0 && (
                <div className="cl-upload-grid">
                  {formData.images.map((url, index) => (
                    <div key={index} className="cl-upload-preview">
                      <img
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="cl-upload-preview-img"
                      />
                      <button
                        type="button"
                        className="cl-upload-remove"
                        onClick={() => removeImage(index)}
                      >
                        ✕
                      </button>
                      {index === 0 && (
                        <span className="cl-upload-main-badge">
                          Photo principale
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {formData.images.length === 0 && !uploadLoading && (
                <p className="cl-upload-empty">
                  Aucune photo ajoutée — ce n'est pas obligatoire
                </p>
              )}

              <p className="cl-upload-counter">
                {formData.images.length} / 5 photo
                {formData.images.length > 1 ? "s" : ""}
              </p>

              {/* Récapitulatif */}
              <div className="cl-summary">
                <h3 className="cl-summary-title">📋 Récapitulatif</h3>
                <div className="cl-summary-grid">
                  <div className="cl-summary-item">
                    <span className="cl-summary-label">Titre</span>
                    <span className="cl-summary-value">
                      {formData.title || "—"}
                    </span>
                  </div>
                  <div className="cl-summary-item">
                    <span className="cl-summary-label">Localisation</span>
                    <span className="cl-summary-value">
                      {formData.location || "—"}
                    </span>
                  </div>
                  <div className="cl-summary-item">
                    <span className="cl-summary-label">Type</span>
                    <span className="cl-summary-value capitalize">
                      {formData.type}
                    </span>
                  </div>
                  <div className="cl-summary-item">
                    <span className="cl-summary-label">Prix</span>
                    <span className="cl-summary-value">
                      {formData.price ? `${formData.price} € / nuit` : "—"}
                    </span>
                  </div>
                  <div className="cl-summary-item">
                    <span className="cl-summary-label">Chambres</span>
                    <span className="cl-summary-value">
                      {formData.bedrooms}
                    </span>
                  </div>
                  <div className="cl-summary-item">
                    <span className="cl-summary-label">Photos</span>
                    <span className="cl-summary-value">
                      {formData.images.length} uploadée
                      {formData.images.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  {/* ✅ Statut géocodage */}
                  <div className="cl-summary-item">
                    <span className="cl-summary-label">Carte</span>
                    <span className="cl-summary-value cl-geo-status">
                      📍 Coordonnées détectées à la publication
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NAVIGATION */}
          <div className="cl-nav">
            {step > 1 && (
              <button type="button" className="cl-btn-prev" onClick={prevStep}>
                ← Précédent
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button type="button" className="cl-btn-next" onClick={nextStep}>
                Suivant →
              </button>
            ) : (
              <button
                type="button"
                className={`cl-btn-submit ${loading ? "loading" : ""}`}
                onClick={handlePublish}
                disabled={loading || uploadLoading}
              >
                {loading ? (
                  <span className="cl-spinner" />
                ) : (
                  "🚀 Publier le logement"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
