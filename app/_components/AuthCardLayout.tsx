import { SkyBackground } from "@/app/_components/SkyBackground";
import styles from "@/app/auth/login/page.module.css";

// The sign-in page's sky, card and illustration; also used by the account type screen
export function AuthCardLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className={styles.page}>
      <div className={styles.sky}>
        <SkyBackground />
      </div>

      <section className={styles.authCard}>
        <div className={styles.content}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          {children}
        </div>

        <div className={styles.artwork}>
          <img src="/login/likehome-coastal-room-signin.png" alt="Coastal living room" />
        </div>
      </section>

      <img className={styles.brandIcon} src="/login/doorway-icon.svg" alt="LikeHome" />
    </main>
  );
}
