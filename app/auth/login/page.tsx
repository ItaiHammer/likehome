"use client";

import { signInWithGoogle } from "@/components/sign-in-google-button";
import styles from "./page.module.css";

const providers = [
  { name: "Google", icon: "/login/google-logo.svg", available: true },
  { name: "Apple", icon: "/login/apple-logo.svg", available: false },
  { name: "Microsoft", icon: "/login/microsoft-logo.svg", available: false },
  { name: "Facebook", icon: "/login/facebook-logo.svg", available: false },
];

export default function SignInPage() {
  return (
    <main className={styles.page}>
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
                disabled={!provider.available}
                title={provider.available ? undefined : "Coming soon"}
                onClick={
                  provider.name === "Google" ? signInWithGoogle : undefined
                }
              >
                <span className={styles.icon}>
                  <img src={provider.icon} alt="" />
                </span>

                <span>Continue with {provider.name}</span>

                {!provider.available && (
                  <span className={styles.badge}>Soon</span>
                )}
              </button>
            ))}
          </div>
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