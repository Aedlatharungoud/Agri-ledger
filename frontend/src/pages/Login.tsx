import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const { login, user, loading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/farmer-dashboard", { replace: true });
      }
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setSubmitting(true);

      await login(username.trim(), password);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to login. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-loading">
          Checking authentication...
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">

        <div className="login-brand">
          <div className="login-logo">🌾</div>

          <h1>AgriLedger AI</h1>

          <p>
            Agricultural Management &amp; AI Platform
          </p>
        </div>

        <div className="login-card">

          <div className="login-card-header">
            <h2>Welcome Back</h2>

            <p>
              Sign in to continue to AgriLedger AI
            </p>
          </div>

          <form onSubmit={handleSubmit}>

            <div className="login-field">
              <label htmlFor="username">
                Username
              </label>

              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                autoComplete="username"
                disabled={submitting}
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="current-password"
                disabled={submitting}
              />
            </div>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={submitting}
            >
              {submitting
                ? "Signing in..."
                : "Sign In"}
            </button>

          </form>

          <div className="login-demo-info">

            <div className="login-demo-title">
              Development Accounts
            </div>

            <div className="login-demo-row">
              <span>Admin</span>
              <code>admin / admin123</code>
            </div>

            <div className="login-demo-row">
              <span>Farmer</span>
              <code>ramesh / farmer123</code>
            </div>

          </div>

        </div>

        <div className="login-footer">
          AgriLedger AI • Secure Agricultural Management
        </div>

      </div>
    </div>
  );
}

export default Login;