"use client";

import { useState } from "react";
import { SkyBackground } from "@/app/_components/SkyBackground";
import styles from "./page.module.css";
import { providers } from "@/app/auth/login/provider-config"

export default function SignInPage() {
  // One sign-in at a time: a second click would start another OAuth flow and overwrite the
  // PKCE verifier cookie, so the first provider's callback would fail.
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(name: string, handler: () => Promise<string | null>) {
    if (pending) return;
    setPending(name);
    setError(null);
    const message = await handler();
    // On success the browser is already navigating to the provider; only an error comes back here
    if (message) {
      setError(`We couldn't start ${name} sign-in. Please try again.`);
      setPending(null);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.sky}>
        <SkyBackground />
      </div>

      <section className={styles.authCard}>
        <div className={styles.content}>
          <h1 className={styles.title}>Come on in.</h1>
          <p className={styles.subtitle}>Your next stay starts here.</p>

          <div className={styles.providerList}>
            {providers.map((provider) => (
              <button
                key={provider.name}
                type="button"
                className={styles.providerButton}
                onClick={() => start(provider.name, provider.handler)}
                disabled={pending !== null}
                aria-busy={pending === provider.name}
              >
                <span className={styles.icon}>
                  <provider.Icon />
                </span>

                <span>Continue with {provider.name}</span>
              </button>
            ))}
          </div>

          {error && (
            <p role="alert" className={styles.subtitle}>
              {error}
            </p>
          )}
        </div>

        <div className={styles.artwork}>
          <img
            src="/login/likehome-coastal-room-signin.png"
            alt="Coastal living room"
          />
        </div>
      </section>

      <img
        className={styles.brandIcon}
        src="/login/doorway-icon.svg"
        alt="LikeHome"
      />
    </main>
  );
}