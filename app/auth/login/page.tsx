"use client";

import { signInWithGoogle } from "@/components/sign-in-google-button";

const providers = [
  { name: "Google", icon: "/google-logo.svg" },
  { name: "Apple", icon: "/apple-logo.svg" },
  { name: "Microsoft", icon: "/microsoft-logo.svg" },
  { name: "Facebook", icon: "/facebook-logo.svg" },
];

export default function SignInPage() {
  return (
    <main className="page">
      <section className="auth-card">
        <div className="content">
          <h1>Come on in.</h1>
          <p className="subtitle">Your next stay starts here.</p>

          <div className="provider-list">
            {providers.map((provider) => (
              <button
                key={provider.name}
                type="button"
                className="provider-button"
                // Only Google has a backend today. The others are visual only for now.
                onClick={provider.name === "Google" ? signInWithGoogle : undefined}
              >
                <span className="icon">
                  <img src={provider.icon} alt="" />
                </span>

                <span>Continue with {provider.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="artwork">
          <img
            src="/likehome-coastal-room-signin.png"
            alt="Coastal living room"
          />
        </div>
      </section>

      <img
        className="brand-icon"
        src="/doorway-icon.svg"
        alt="LikeHome"
      />

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          position: relative;
          overflow: hidden;
          padding: 54px 144px;
          background: #86b7f3;
        }

        .page::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(
              circle at 25% 20%,
              rgba(255, 255, 255, 0.2),
              transparent 28%
            ),
            radial-gradient(
              circle at 80% 75%,
              rgba(41, 107, 203, 0.18),
              transparent 35%
            );
          pointer-events: none;
        }

        .auth-card {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 400px 344px;
          gap: 24px;
          width: 800px;
          height: 486px;
          padding: 16px;
          overflow: hidden;
          border-radius: 12px;
          background: #ffffff;
        }

        .content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          width: 400px;
          height: 454px;
          padding: 16px 24px;
        }

        h1 {
          margin: 0;
          color: #070d2f;
          font-family: "DM Serif Display", Georgia, serif;
          font-weight: 400;
          font-size: 56px;
          line-height: 64px;
          letter-spacing: 0;
        }

        .subtitle {
          margin: 8px 0 32px;
          color: #536383;
          font-size: 20px;
          line-height: 28px;
        }

        .provider-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .provider-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 352px;
          height: 52px;
          padding: 12px 16px;
          border: 1px solid #c4d1e8;
          border-radius: 6px;
          color: #070d2f;
          background: #ffffff;
          cursor: pointer;
          font-size: 16px;
          font-weight: 700;
          transition:
            background 160ms ease,
            border-color 160ms ease,
            transform 160ms ease;
        }

        .provider-button:hover {
          border-color: #7199d7;
          background: #f7faff;
          transform: translateY(-1px);
        }

        .provider-button:active {
          transform: translateY(0);
        }

        .provider-button:focus-visible {
          outline: 3px solid rgba(57, 126, 225, 0.3);
          outline-offset: 2px;
        }

        .icon {
          display: grid;
          width: 24px;
          height: 24px;
          place-items: center;
          flex: 0 0 24px;
        }

        .icon img {
          display: block;
          width: 24px;
          height: 24px;
          object-fit: contain;
        }

        .artwork {
          width: 344px;
          height: 454px;
          overflow: hidden;
          border-radius: 24px;
        }

        .artwork img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .brand-icon {
          position: fixed;
          z-index: 2;
          bottom: 39px;
          left: 47px;
          width: 38px;
          height: 44px;
          object-fit: contain;
        }

        @media (max-width: 760px) {
          .page {
            align-items: start;
            padding: 28px 18px 80px;
          }

          .auth-card {
            grid-template-columns: 1fr;
            width: min(100%, 500px);
            height: auto;
            padding: 14px;
            gap: 0;
          }

          .content {
            width: 100%;
            height: auto;
            padding: 40px 14px 34px;
          }

          .artwork {
            order: -1;
            width: 100%;
            height: 260px;
            border-radius: 18px;
          }

          .provider-button {
            width: 100%;
          }

          h1 {
            font-size: 46px;
          }

          .brand-icon {
            bottom: 20px;
            left: 24px;
            width: 34px;
            height: 34px;
          }
        }
      `}</style>
    </main>
  );
}