import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast"; // ✅ ajouté
import "../styles/auth.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(formData.email, formData.password);

      // ✅ Toast de succès
      toast.success("Connexion réussie ! Bienvenue 👋", {
        duration: 2000,
        style: {
          background: "#22c55e",
          color: "#fff",
          fontWeight: "600",
          borderRadius: "12px",
          padding: "14px 20px",
        },
        iconTheme: {
          primary: "#fff",
          secondary: "#22c55e",
        },
      });

      // ✅ Délai pour voir le toast avant la redirection
      setTimeout(() => {
        navigate("/home");
      }, 1500);
    } catch (err) {
      const message =
        err.response?.data?.message || "Email ou mot de passe incorrect";
      setError(message);

      // ✅ Toast d'erreur
      toast.error(message, {
        duration: 3000,
        style: {
          background: "#ef4444",
          color: "#fff",
          fontWeight: "600",
          borderRadius: "12px",
          padding: "14px 20px",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* ==========================================
          PANNEAU GAUCHE — VISUEL
      ========================================== */}
      <div className="auth-visual">
        <div className="auth-visual-overlay" />
        <div className="auth-visual-content">
          <div className="auth-logo">🏠 StayHub</div>

          <h1 className="auth-visual-title">
            Des séjours
            <br />
            inoubliables
            <br />
            vous attendent.
          </h1>

          <p className="auth-visual-sub">
            Plus de 10 000 logements uniques partout dans le monde.
          </p>

          <div className="auth-stats">
            <div className="auth-stat">
              <span className="auth-stat-number">10K+</span>
              <span className="auth-stat-label">Logements</span>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat">
              <span className="auth-stat-number">50K+</span>
              <span className="auth-stat-label">Voyageurs</span>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat">
              <span className="auth-stat-number">120+</span>
              <span className="auth-stat-label">Pays</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          PANNEAU DROIT — FORMULAIRE
      ========================================== */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          {/* Header */}
          <div className="auth-form-header">
            <h2 className="auth-form-title">Bon retour 👋</h2>
            <p className="auth-form-subtitle">Connectez-vous à votre compte</p>
          </div>

          {/* Message d'erreur inline */}
          {error && (
            <div className="auth-alert">
              <span className="auth-alert-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* ---- Formulaire ---- */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email */}
            <div className="auth-field">
              <label className="auth-label">Adresse email</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">✉️</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="vous@email.com"
                  required
                  className="auth-input"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="auth-field">
              <div className="auth-label-row">
                <label className="auth-label">Mot de passe</label>
                <span className="auth-forgot">Mot de passe oublié ?</span>
              </div>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">🔒</span>
                <input
                  type={showPass ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="auth-input"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Bouton soumettre */}
            <button
              type="submit"
              className={`auth-btn ${loading ? "auth-btn-loading" : ""}`}
              disabled={loading}
            >
              {loading ? <span className="auth-spinner" /> : "Se connecter"}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span>ou</span>
          </div>

          {/* Lien inscription */}
          <p className="auth-switch">
            Pas encore de compte ?{" "}
            <Link to="/register" className="auth-switch-link">
              Créer un compte →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
