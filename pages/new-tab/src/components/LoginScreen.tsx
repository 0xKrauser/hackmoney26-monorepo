import { useLogin } from '@privy-io/react-auth';
import { useState } from 'react';

const LoginScreen = () => {
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useLogin({
    onComplete: () => {
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
    },
  });

  const handleLogin = () => {
    setIsLoading(true);
    login();
  };

  return (
    <div className="login-screen">
      <div className="login-backdrop" />
      <div className="login-card">
        <div className="login-logo">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </div>
        <h1 className="login-title">Welcome to Frens</h1>
        <p className="login-subtitle">
          Create and trade memecoins with your friends. Connect your account to get started.
        </p>
        <button className="login-btn" onClick={handleLogin} disabled={isLoading}>
          {isLoading ? (
            <>
              <svg
                className="login-spinner"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <polyline points="3 7 12 13 21 7" />
              </svg>
              Continue with Email
            </>
          )}
        </button>
        <div className="login-features">
          <div className="login-feature">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Secure embedded wallet</span>
          </div>
          <div className="login-feature">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
            <span>Create memecoins instantly</span>
          </div>
          <div className="login-feature">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Verify your Twitter</span>
          </div>
        </div>
      </div>
      <div className="login-footer">
        <span>Powered by Privy</span>
        <span className="login-footer-dot" />
        <span>Base Sepolia</span>
      </div>
    </div>
  );
};

export default LoginScreen;
