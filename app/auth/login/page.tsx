"use client";

import { AuthCardLayout } from "@/app/_components/AuthCardLayout";
import styles from "./page.module.css";
import { providers } from "@/app/auth/login/provider-config"

export default function SignInPage() {
  return (
    <AuthCardLayout title="Come on in." subtitle="Your next stay starts here.">
      <div className={styles.providerList}>
        {providers.map((provider) => (
          <button
            key={provider.name}
            type="button"
            className={styles.providerButton}
            onClick={provider.handler}
          >
            <span className={styles.icon}>
              <provider.Icon />
            </span>

            <span>Continue with {provider.name}</span>
          </button>
        ))}
      </div>
      <p className={styles.hint}>New to LikeHome? Choose your account type after signing in.</p>
    </AuthCardLayout>
  );
}
