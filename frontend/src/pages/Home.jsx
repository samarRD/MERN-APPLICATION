// src/pages/Home.jsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../services/api";
import ListingCard from "../components/ListingCard";
import "../styles/home.css";

// ✅ Fix icône Leaflet (bug webpack/vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Icône rouge pour le marker sélectionné
const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const TYPES = [
  "all",
  "appartement",
  "villa",
  "maison",
  "studio",
  "chambre",
  "chalet",
];
const BEDROOMS = ["all", "1", "2", "3", "4+"];
const AMENITIES = [
  "WiFi",
  "Piscine",
  "Parking",
  "Climatisation",
  "Cuisine",
  "Télévision",
];

// Coordonnées par défaut par pays/ville (pour la carte)
const GEOCODE_FALLBACK = { lat: 36.8, lng: 10.2 }; // Tunisie par défaut

export default function Home() {
  const navigate = useNavigate();

  // ---- Search & filtres ----
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);

  // Filtres locaux (avant application)
  const [type, setType] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("all");
  const [amenities, setAmenities] = useState([]);

  // ---- Build query params ----
  const buildParams = (filters) => {
    const p = new URLSearchParams();
    if (filters.location) p.set("location", filters.location);
    if (filters.type && filters.type !== "all") p.set("type", filters.type);
    if (filters.minPrice) p.set("minPrice", filters.minPrice);
    if (filters.maxPrice) p.set("maxPrice", filters.maxPrice);
    if (filters.bedrooms && filters.bedrooms !== "all")
      p.set("bedrooms", filters.bedrooms);
    if (filters.amenities?.length)
      p.set("amenities", filters.amenities.join(","));
    return p.toString();
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["listings", applied],
    queryFn: () => {
      const qs = buildParams(applied);
      return api.get(`/listings${qs ? `?${qs}` : ""}`).then((r) => r.data);
    },
  });

  const listings = Array.isArray(data) ? data : data?.listings || [];

  // ✅ Uniquement les listings avec de vraies coordonnées GPS
  const listingsWithCoords = useMemo(
    () => listings.filter((l) => l.lat && l.lng),
    [listings],
  );

  // ---- Handlers ----
  const handleSearch = (e) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    setApplied({
      location: search,
      type,
      minPrice,
      maxPrice,
      bedrooms,
      amenities,
    });
    setShowFilters(false);
  };

  const resetFilters = () => {
    setSearch("");
    setType("all");
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("all");
    setAmenities([]);
    setApplied({});
  };

  const toggleAmenity = (a) =>
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );

  const hasActiveFilters =
    (applied.type && applied.type !== "all") ||
    applied.minPrice ||
    applied.maxPrice ||
    (applied.bedrooms && applied.bedrooms !== "all") ||
    applied.amenities?.length;

  const activeFilterCount = [
    applied.type && applied.type !== "all",
    applied.minPrice || applied.maxPrice,
    applied.bedrooms && applied.bedrooms !== "all",
    applied.amenities?.length,
  ].filter(Boolean).length;

  return (
    <div className="home">
      {/* ===== HERO ===== */}
      <div className="home-hero">
        <div className="home-hero-overlay" />
        <div className="home-hero-content">
          <h1 className="home-hero-title">
            Trouvez votre prochain
            <br />
            séjour idéal 🌍
          </h1>
          <p className="home-hero-sub">
            Des milliers de logements uniques partout dans le monde
          </p>

          <form className="home-search" onSubmit={handleSearch}>
            <div className="home-search-input-wrap">
              <span className="home-search-icon">📍</span>
              <input
                type="text"
                placeholder="Ville, pays, destination..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="home-search-input"
              />
              {search && (
                <button
                  type="button"
                  className="home-search-clear"
                  onClick={resetFilters}
                >
                  ✕
                </button>
              )}
            </div>
            <button type="submit" className="home-search-btn">
              🔍 Rechercher
            </button>
          </form>
        </div>
      </div>

      <div className="home-content">
        {/* ===== BARRE FILTRES ===== */}
        <div className="home-filter-bar">
          {/* Filtres rapides type */}
          <div className="home-type-pills">
            {TYPES.map((t) => (
              <button
                key={t}
                className={`home-type-pill ${type === t ? "active" : ""}`}
                onClick={() => {
                  setType(t);
                  setApplied((prev) => ({ ...prev, type: t }));
                }}
              >
                {t === "all" && "🏘️ Tous"}
                {t === "appartement" && "🏢 Appartement"}
                {t === "villa" && "🌴 Villa"}
                {t === "maison" && "🏠 Maison"}
                {t === "studio" && "🛋️ Studio"}
                {t === "chambre" && "🛏️ Chambre"}
                {t === "chalet" && "🏔️ Chalet"}
              </button>
            ))}
          </div>

          {/* Boutons filtres avancés + carte */}
          <div className="home-filter-actions">
            <button
              className={`home-filter-btn ${showFilters ? "active" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              ⚙️ Filtres
              {activeFilterCount > 0 && (
                <span className="home-filter-badge">{activeFilterCount}</span>
              )}
            </button>
            <button
              className={`home-map-btn ${showMap ? "active" : ""}`}
              onClick={() => setShowMap(!showMap)}
            >
              {showMap ? "📋 Liste" : "🗺️ Carte"}
            </button>
          </div>
        </div>

        {/* ===== PANNEAU FILTRES AVANCÉS ===== */}
        {showFilters && (
          <div className="home-filters-panel">
            {/* Prix */}
            <div className="home-filter-group">
              <label className="home-filter-label">💰 Prix / nuit</label>
              <div className="home-price-range">
                <input
                  type="number"
                  placeholder="Min €"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="home-price-input"
                  min="0"
                />
                <span className="home-price-sep">—</span>
                <input
                  type="number"
                  placeholder="Max €"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="home-price-input"
                  min="0"
                />
              </div>
            </div>

            {/* Chambres */}
            <div className="home-filter-group">
              <label className="home-filter-label">🛏️ Chambres</label>
              <div className="home-bed-pills">
                {BEDROOMS.map((b) => (
                  <button
                    key={b}
                    className={`home-bed-pill ${bedrooms === b ? "active" : ""}`}
                    onClick={() => setBedrooms(b)}
                  >
                    {b === "all" ? "Tous" : b}
                  </button>
                ))}
              </div>
            </div>

            {/* Équipements */}
            <div className="home-filter-group">
              <label className="home-filter-label">✨ Équipements</label>
              <div className="home-amenity-pills">
                {AMENITIES.map((a) => (
                  <button
                    key={a}
                    className={`home-amenity-pill ${amenities.includes(a) ? "active" : ""}`}
                    onClick={() => toggleAmenity(a)}
                  >
                    {a === "WiFi" && "📶 WiFi"}
                    {a === "Piscine" && "🏊 Piscine"}
                    {a === "Parking" && "🅿️ Parking"}
                    {a === "Climatisation" && "❄️ Clim"}
                    {a === "Cuisine" && "🍳 Cuisine"}
                    {a === "Télévision" && "📺 TV"}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="home-filter-footer">
              <button className="home-filter-reset" onClick={resetFilters}>
                Réinitialiser
              </button>
              <button className="home-filter-apply" onClick={applyFilters}>
                Voir les résultats ({listings.length})
              </button>
            </div>
          </div>
        )}

        {/* ===== HEADER RÉSULTATS ===== */}
        <div className="home-results-header">
          <div className="home-results-info">
            <h2 className="home-results-title">
              {applied.location ? (
                <>
                  Résultats pour <span>"{applied.location}"</span>
                </>
              ) : (
                "Tous les logements"
              )}
            </h2>
            {hasActiveFilters && (
              <button className="home-results-reset" onClick={resetFilters}>
                ✕ Effacer filtres
              </button>
            )}
          </div>
          {!isLoading && (
            <p className="home-results-count">
              {listings.length} logement{listings.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* ===== LAYOUT LISTE + CARTE ===== */}
        <div className={`home-layout ${showMap ? "with-map" : ""}`}>
          {/* ===== GRILLE LISTINGS ===== */}
          <div className="home-listings-col">
            {isLoading && (
              <div className="home-grid">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="home-skeleton" />
                ))}
              </div>
            )}

            {isError && (
              <div className="home-error">
                <p>😕 Impossible de charger les logements.</p>
                <p>
                  Vérifie que le serveur est bien démarré sur{" "}
                  <strong>localhost:5000</strong>
                </p>
              </div>
            )}

            {!isLoading && !isError && listings.length === 0 && (
              <div className="home-empty">
                <p className="home-empty-icon">🏠</p>
                <p className="home-empty-title">Aucun logement trouvé</p>
                <p className="home-empty-sub">
                  Essayez d'élargir vos critères de recherche.
                </p>
                <button className="home-empty-btn" onClick={resetFilters}>
                  Voir tous les logements
                </button>
              </div>
            )}

            {!isLoading && !isError && listings.length > 0 && (
              <div className="home-grid">
                {listingsWithCoords.map((listing) => (
                  <div
                    key={listing._id}
                    className={`home-card-wrap ${hoveredId === listing._id ? "hovered" : ""}`}
                    onMouseEnter={() => setHoveredId(listing._id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <ListingCard listing={listing} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ===== CARTE LEAFLET ===== */}
          {showMap && (
            <div className="home-map-col">
              <div className="home-map-sticky">
                <MapContainer
                  center={[GEOCODE_FALLBACK.lat, GEOCODE_FALLBACK.lng]}
                  zoom={7}
                  className="home-leaflet-map"
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  {listingsWithCoords.map((listing) => (
                    <Marker
                      key={listing._id}
                      position={[listing.lat, listing.lng]}
                      icon={
                        hoveredId === listing._id
                          ? redIcon
                          : new L.Icon.Default()
                      }
                      eventHandlers={{
                        click: () => navigate(`/listing/${listing._id}`),
                        mouseover: () => setHoveredId(listing._id),
                        mouseout: () => setHoveredId(null),
                      }}
                    >
                      <Popup className="home-map-popup">
                        <div className="home-popup-content">
                          {listing.images?.[0] && (
                            <img
                              src={listing.images[0]}
                              alt={listing.title}
                              className="home-popup-img"
                            />
                          )}
                          <div className="home-popup-body">
                            <p className="home-popup-title">{listing.title}</p>
                            <p className="home-popup-location">
                              📍 {listing.location}
                            </p>
                            <p className="home-popup-price">
                              <strong>{listing.price} €</strong> / nuit
                            </p>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
