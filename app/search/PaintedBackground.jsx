import styles from "./PaintedBackground.module.css";

/**
 * Decorative animated watercolor background used in the search header and
 * empty-results state. It intentionally has no pointer events.
 */
export default function PaintedBackground() {
    return (
        <div
            aria-hidden="true"
            className={styles["likehome-painted-background"]}
        >
            <div
                className={`${styles["likehome-clouds"]} ${styles["likehome-clouds-one"]}`}
            />
            <div
                className={`${styles["likehome-clouds"]} ${styles["likehome-clouds-two"]}`}
            />
            <div
                className={`${styles["likehome-clouds"]} ${styles["likehome-clouds-three"]}`}
            />

            <div className={styles["likehome-paint-mottle"]} />
            <div className={styles["likehome-brush-texture"]} />
            <div className={styles["likehome-grain"]} />
        </div>
    );
}
