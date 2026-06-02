import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, googleProvider } from '../services/firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      setError('Failed to log in: ' + err.message);
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    try {
      setError('');
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (err) {
      setError('Failed to log in with Google: ' + err.message);
    }
    setLoading(false);
  }

  return (
    <main className="auth-page">
      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: var(--font-body);
        }
        .auth-card {
          width: 100%;
          max-width: 400px;
          padding: 2.5rem;
          background: rgba(18, 18, 26, 0.88);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        .auth-title {
          font-family: var(--font-display);
          color: var(--accent-cyan);
          text-align: center;
          font-size: 2.5rem;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
        }
        .auth-form {
          display: grid;
          gap: 1.25rem;
        }
        .auth-input {
          width: 100%;
          padding: 0.8rem 1rem;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-primary);
          font-family: var(--font-body);
        }
        .auth-input:focus {
          outline: none;
          border-color: var(--accent-cyan);
          box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.1);
        }
        .auth-btn {
          width: 100%;
          padding: 0.9rem;
          border: none;
          border-radius: 6px;
          background: var(--accent-cyan);
          color: var(--bg-primary);
          font-family: var(--font-display);
          font-weight: bold;
          font-size: 1.1rem;
          cursor: pointer;
          transition: filter 0.2s;
        }
        .auth-btn:hover:not(:disabled) {
          filter: brightness(1.1);
        }
        .auth-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .auth-google-btn {
          background: #ffffff;
          color: #757575;
          margin-top: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .auth-google-btn:hover:not(:disabled) {
          background: #f1f1f1;
        }
        .auth-error {
          color: var(--accent-red);
          text-align: center;
          font-size: 0.9rem;
        }
        .auth-link {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .auth-link a {
          color: var(--accent-cyan);
          text-decoration: none;
        }
        .auth-link a:hover {
          text-decoration: underline;
        }
      `}</style>
      <div className="auth-card">
        <h1 className="auth-title">Login</h1>
        {error && <div className="auth-error">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            className="auth-input"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="auth-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="auth-btn" disabled={loading}>
            Sign In
          </button>
        </form>
        <button 
          className="auth-btn auth-google-btn" 
          onClick={handleGoogleLogin} 
          disabled={loading}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
              <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
              <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
              <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
              <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
            </g>
          </svg>
          Sign In with Google
        </button>
        <div className="auth-link">
          Need an account? <Link to="/register">Register</Link>
        </div>
      </div>
    </main>
  );
}
