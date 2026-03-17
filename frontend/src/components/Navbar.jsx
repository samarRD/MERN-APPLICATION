import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import "../styles/navbar.css";

const TYPE_CONFIG = {
  booking_confirmed: {
    icon: "🎉",
    action: "Payer maintenant →",
    color: "#f97316",
  },
  booking_cancelled: { icon: "❌", action: null, color: "#ef4444" },
  booking_paid: { icon: "💰", action: null, color: "#22c55e" },
  new_booking: { icon: "📋", action: "Voir les demandes →", color: "#0369a1" },
};

const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} j`;
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  // ✅ Fetch notifications toutes les 30s
  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications").then((r) => r.data),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  // Fermer si clic extérieur
  useEffect(() => {
    const handle = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target))
        setBellOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("À bientôt ! 👋", {
      duration: 2000,
      style: {
        background: "#1a1a2e",
        color: "#fff",
        fontWeight: "600",
        borderRadius: "12px",
        padding: "14px 20px",
      },
    });
    navigate("/");
    setMenuOpen(false);
  };

  // ✅ Ouvrir cloche + marquer tout comme lu
  const handleBellClick = async () => {
    setBellOpen((prev) => !prev);
    if (!bellOpen && unreadCount > 0) {
      try {
        await api.put("/notifications/read-all");
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } catch {}
    }
  };

  // ✅ Naviguer selon le type de notif
  const handleNotifClick = (notif) => {
    setBellOpen(false);
    if (
      notif.type === "booking_confirmed" ||
      notif.type === "booking_cancelled"
    )
      navigate("/bookings");
    if (notif.type === "new_booking" || notif.type === "booking_paid")
      navigate("/dashboard");
  };

  if (location.pathname === "/login" || location.pathname === "/register")
    return null;

  return (
    <nav className="navbar-main">
      <div className="navbar-container">
        {/* LOGO */}
        <Link to="/" className="navbar-logo">
          🏠 <span>StayHub</span>
        </Link>

        {/* LIENS */}
        <div className="navbar-links">
          <Link
            to="/"
            className={`navbar-link ${location.pathname === "/" ? "active" : ""}`}
          >
            Accueil
          </Link>
          <Link
            to="/listings"
            className={`navbar-link ${location.pathname === "/listings" ? "active" : ""}`}
          >
            Logements
          </Link>
        </div>

        {/* ACTIONS */}
        <div className="navbar-actions">
          {user ? (
            <>
              {user.role === "host" && (
                <Link
                  to="/create-listing"
                  className={`navbar-publish-btn ${location.pathname === "/create-listing" ? "active" : ""}`}
                >
                  ➕ Publier
                </Link>
              )}

              <Link
                to="/bookings"
                className={`navbar-bookings-btn ${location.pathname === "/bookings" ? "active" : ""}`}
              >
                🗓️ Réservations
              </Link>

              {/* ✅ CLOCHE 🔔 */}
              <div className="navbar-bell-wrap" ref={bellRef}>
                <button className="navbar-bell-btn" onClick={handleBellClick}>
                  🔔
                  {unreadCount > 0 && (
                    <span className="navbar-bell-badge">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <div className="navbar-notif-dropdown">
                    <div className="navbar-notif-header">
                      <span className="navbar-notif-title">Notifications</span>
                      {notifications.length > 0 && (
                        <span className="navbar-notif-count">
                          {notifications.length}
                        </span>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <div className="navbar-notif-empty">
                        <p>🔕</p>
                        <p>Aucune notification</p>
                      </div>
                    ) : (
                      <div className="navbar-notif-list">
                        {notifications.map((notif) => {
                          const cfg = TYPE_CONFIG[notif.type] || {
                            icon: "📢",
                            color: "#888",
                          };
                          return (
                            <div
                              key={notif._id}
                              className={`navbar-notif-item ${!notif.read ? "unread" : ""}`}
                              onClick={() => handleNotifClick(notif)}
                            >
                              <div
                                className="navbar-notif-icon"
                                style={{
                                  background: cfg.color + "20",
                                  color: cfg.color,
                                }}
                              >
                                {cfg.icon}
                              </div>
                              <div className="navbar-notif-body">
                                <p className="navbar-notif-msg">
                                  {notif.message}
                                </p>
                                {cfg.action && (
                                  <p
                                    className="navbar-notif-action"
                                    style={{ color: cfg.color }}
                                  >
                                    {cfg.action}
                                  </p>
                                )}
                                <p className="navbar-notif-time">
                                  {timeAgo(notif.createdAt)}
                                </p>
                              </div>
                              {!notif.read && (
                                <span className="navbar-notif-dot" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Menu user */}
              <div className="navbar-user-menu">
                <button
                  className="navbar-user-btn"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <div className="navbar-avatar">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="navbar-user-info">
                    <span className="navbar-user-name">{user.name}</span>
                    <span className="navbar-user-role">
                      {user.role === "host" ? "🏡 Hôte" : "🧳 Voyageur"}
                    </span>
                  </div>
                  <span className={`navbar-chevron ${menuOpen ? "open" : ""}`}>
                    ▾
                  </span>
                </button>

                {menuOpen && (
                  <div className="navbar-dropdown">
                    <div className="navbar-dropdown-header">
                      <p className="navbar-dropdown-name">{user.name}</p>
                      <p className="navbar-dropdown-email">{user.email}</p>
                    </div>
                    <div className="navbar-dropdown-divider" />
                    <Link
                      to="/bookings"
                      className="navbar-dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      🗓️ Mes réservations
                    </Link>
                    {user.role === "host" && (
                      <>
                        <Link
                          to="/create-listing"
                          className="navbar-dropdown-item"
                          onClick={() => setMenuOpen(false)}
                        >
                          ➕ Publier un logement
                        </Link>
                        <Link
                          to="/dashboard"
                          className="navbar-dropdown-item"
                          onClick={() => setMenuOpen(false)}
                        >
                          📊 Dashboard hôte
                        </Link>
                      </>
                    )}
                    <div className="navbar-dropdown-divider" />
                    <button
                      className="navbar-dropdown-item navbar-dropdown-logout"
                      onClick={handleLogout}
                    >
                      🚪 Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-login-btn">
                Connexion
              </Link>
              <Link to="/register" className="navbar-register-btn">
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </div>

      {menuOpen && (
        <div className="navbar-overlay" onClick={() => setMenuOpen(false)} />
      )}
    </nav>
  );
}
