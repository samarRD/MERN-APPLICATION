import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import "../styles/auth.css";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    role: "user",
  });
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

    // Validations
    if (formData.password !== formData.confirm) {
      return setError("Les mots de passe ne correspondent pas");
    }
    if (formData.password.length < 6) {
      return setError("Le mot de passe doit contenir au moins 6 caractères");
    }

    setLoading(true);
    try {
      await register(
        formData.name,
        formData.email,
        formData.password,
        formData.role,
      );

      // ✅ Message de succès
      toast.success("Compte créé avec succès ! Bienvenue 🎉", {
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
        navigate("/login");
      }, 1500);
    } catch (err) {
      const message =
        err.response?.data?.message || "Erreur lors de l'inscription";
      setError(message);
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

  // Calcul de la force du mot de passe
  const getPasswordStrength = () => {
    const p = formData.password;
    if (!p) return null;
    if (p.length < 6)
      return { label: "Trop court", color: "#ef4444", width: "25%" };
    if (p.length < 8)
      return { label: "Faible", color: "#f97316", width: "50%" };
    if (p.length < 12)
      return { label: "Moyen", color: "#eab308", width: "75%" };
    return { label: "Fort", color: "#22c55e", width: "100%" };
  };
  const strength = getPasswordStrength();

  return (
    <div className="auth-wrapper">
      {/* ==========================================
          PANNEAU GAUCHE — VISUEL
      ========================================== */}
      <div className="auth-visual auth-visual-register">
        <div className="auth-visual-overlay" />
        <div className="auth-visual-content">
          <div className="auth-logo">🏠 StayHub</div>

          <h1 className="auth-visual-title">
            Rejoignez
            <br />
            une communauté
            <br />
            mondiale.
          </h1>

          <p className="auth-visual-sub">
            Voyageurs ou hôtes, tout le monde trouve sa place chez StayHub.
          </p>

          <div className="auth-features">
            {[
              { icon: "🛡️", text: "Paiements sécurisés" },
              { icon: "⭐", text: "Avis vérifiés" },
              { icon: "💬", text: "Support 24h/24" },
              { icon: "🌍", text: "120+ pays disponibles" },
            ].map((f) => (
              <div className="auth-feature" key={f.text}>
                <span className="auth-feature-icon">{f.icon}</span>
                <span className="auth-feature-text">{f.text}</span>
              </div>
            ))}
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
            <h2 className="auth-form-title">Créer un compte ✨</h2>
            <p className="auth-form-subtitle">
              Commencez votre aventure gratuitement
            </p>
          </div>

          {/* Message d'erreur inline */}
          {error && (
            <div className="auth-alert">
              <span className="auth-alert-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* ---- Sélecteur de rôle ---- */}
          <div className="auth-role-selector">
            <button
              type="button"
              className={`auth-role-btn ${formData.role === "user" ? "active" : ""}`}
              onClick={() => setFormData({ ...formData, role: "user" })}
            >
              <span className="auth-role-icon">🧳</span>
              <span className="auth-role-label">Voyageur</span>
              <span className="auth-role-desc">Je cherche un logement</span>
            </button>

            <button
              type="button"
              className={`auth-role-btn ${formData.role === "host" ? "active" : ""}`}
              onClick={() => setFormData({ ...formData, role: "host" })}
            >
              <span className="auth-role-icon">🏡</span>
              <span className="auth-role-label">Hôte</span>
              <span className="auth-role-desc">Je propose un logement</span>
            </button>
          </div>

          {/* ---- Formulaire ---- */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Nom complet */}
            <div className="auth-field">
              <label className="auth-label">Nom complet</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">👤</span>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Jean Dupont"
                  required
                  className="auth-input"
                />
              </div>
            </div>

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
              <label className="auth-label">Mot de passe</label>
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

              {/* Barre de force du mot de passe */}
              {strength && (
                <div className="auth-strength">
                  <div className="auth-strength-bar">
                    <div
                      className="auth-strength-fill"
                      style={{
                        width: strength.width,
                        background: strength.color,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      color: strength.color,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirmer mot de passe */}
            <div className="auth-field">
              <label className="auth-label">Confirmer le mot de passe</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">🔒</span>
                <input
                  type="password"
                  name="confirm"
                  value={formData.confirm}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="auth-input"
                />
                {/* Indicateur de correspondance */}
                {formData.confirm && (
                  <span className="auth-match-icon">
                    {formData.password === formData.confirm ? "✅" : "❌"}
                  </span>
                )}
              </div>
            </div>

            {/* Bouton soumettre */}
            <button
              type="submit"
              className={`auth-btn ${loading ? "auth-btn-loading" : ""}`}
              disabled={loading}
            >
              {loading ? <span className="auth-spinner" /> : "Créer mon compte"}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span>ou</span>
          </div>

          {/* Lien connexion */}
          <p className="auth-switch">
            Déjà un compte ?{" "}
            <Link to="/login" className="auth-switch-link">
              Se connecter →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
