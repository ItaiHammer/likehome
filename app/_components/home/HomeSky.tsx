import Image from "next/image";
import homeSky from "@/app/_assets/home-sky-reference-v1.png";
import styles from "./HomeSky.module.css";

// A quiet sky around the homepage's content; other pages keep their existing backdrops.
export function HomeSky() {
  return (
    <div aria-hidden className={styles.sky}>
      <Image src={homeSky} alt="" fill sizes="100vw" loading="eager" className={styles.day} />
      <div className={styles.night}>
      <Cloud side="left" />
      <Cloud side="right" />
      <Cloud side="horizon" />
      </div>
      <div className="absolute inset-0 opacity-0 dark:opacity-100">
        {Array.from({ length: 32 }, (_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white/60"
            style={{ left: `${(i * 73) % 100}%`, top: `${(i * i * 7 + 3) % 65}%`, width: i % 7 === 0 ? 2 : 1, height: i % 7 === 0 ? 2 : 1 }}
          />
        ))}
      </div>
    </div>
  );
}

function Cloud({ side }: { side: "left" | "right" | "horizon" }) {
  const edge = `home-cloud-edge-${side}`;
  const light = `home-cloud-light-${side}`;
  return (
    <svg viewBox="0 0 600 240" className={`${styles.cloud} ${styles[side]}`}>
      <defs>
        <linearGradient id={light} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fff" />
          <stop offset="0.6" stopColor="#f7fbff" />
          <stop offset="1" stopColor="#d8eaf7" />
        </linearGradient>
        <filter id={edge} x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.035" numOctaves="3" seed={side === "right" ? 12 : 7} result="texture" />
          <feDisplacementMap in="SourceGraphic" in2="texture" scale="32" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>
      <g fill={`url(#${light})`} filter={`url(#${edge})`}>
      <g opacity="0.3">
        <ellipse cx="285" cy="166" rx="265" ry="57" />
        <ellipse cx="470" cy="162" rx="120" ry="35" />
      </g>
      <g opacity="0.65">
        <ellipse cx="100" cy="150" rx="110" ry="62" />
        <ellipse cx="177" cy="119" rx="74" ry="67" />
        <ellipse cx="251" cy="103" rx="84" ry="78" />
        <ellipse cx="330" cy="132" rx="75" ry="61" />
        <ellipse cx="402" cy="154" rx="101" ry="47" />
      </g>
      <g opacity="0.9">
        <ellipse cx="93" cy="124" rx="82" ry="46" />
        <ellipse cx="155" cy="93" rx="57" ry="53" />
        <ellipse cx="213" cy="84" rx="69" ry="65" />
        <ellipse cx="271" cy="110" rx="59" ry="49" />
        <ellipse cx="327" cy="131" rx="73" ry="37" />
      </g>
      </g>
    </svg>
  );
}
