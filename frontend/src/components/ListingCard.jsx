import { Link } from "react-router-dom";
import "../styles/home.css";

export default function ListingCard({ listing }) {
  const { _id, title, description, price, location, images } = listing;

  return (
    <Link to={`/listing/${_id}`} className="listing-card">
      {/* Image */}
      <div className="listing-card-img-wrap">
        <img
          src={
            images?.[0] || "https://via.placeholder.com/400x280?text=No+Image"
          }
          alt={title}
          className="listing-card-img"
        />
        {/* Badge prix */}
        <div className="listing-card-price-badge">
          {price} € <span>/ nuit</span>
        </div>
      </div>

      {/* Infos */}
      <div className="listing-card-body">
        {/* Localisation */}
        <p className="listing-card-location">
          <span>📍</span> {location}
        </p>

        {/* Titre */}
        <h3 className="listing-card-title">{title}</h3>

        {/* Description */}
        <p className="listing-card-desc">
          {description?.length > 80
            ? description.substring(0, 80) + "..."
            : description}
        </p>

        {/* Footer */}
        <div className="listing-card-footer">
          <span className="listing-card-price-text">
            <strong>{price} €</strong> / nuit
          </span>
          <span className="listing-card-btn">Voir →</span>
        </div>
      </div>
    </Link>
  );
}
