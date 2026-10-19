"use client";

import { SkyBackground } from "@/app/_components/SkyBackground";
import styles from "./page.module.css";
import { providers } from "@/app/auth/login/provider-config"

export default function SignInPage() {
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
                onClick={provider.handler}
              >
                <span className={styles.icon}>
                  <img src={provider.icon()} alt="" />
                </span>

                <span>Continue with {provider.name}</span>
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