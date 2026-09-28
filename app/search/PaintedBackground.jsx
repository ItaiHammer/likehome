export default function PaintedBackground() {
    return (
        <div
            aria-hidden="true"
            className="likehome-painted-background"
        >
            <div className="likehome-clouds likehome-clouds-one" />
            <div className="likehome-clouds likehome-clouds-two" />
            <div className="likehome-clouds likehome-clouds-three" />

            {/* Larger watercolor / pigment texture */}
            <div className="likehome-paint-mottle" />

            {/* Soft brush-stroke texture */}
            <div className="likehome-brush-texture" />

            {/* Fine paper grain */}
            <div className="likehome-grain" />

            <style>{`
                .likehome-painted-background {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    pointer-events: none;
                    background: #8EB5EE;
                }

                .likehome-clouds {
                    position: absolute;
                    inset: -14%;
                    will-change: transform;
                }

                /* Main cloudy color variation */
                .likehome-clouds-one {
                    background:
                        radial-gradient(
                            ellipse 24% 34% at 3% 4%,
                            rgba(73, 113, 185, 0.95),
                            rgba(95, 143, 211, 0.65) 42%,
                            transparent 72%
                        ),
                        radial-gradient(
                            ellipse 23% 30% at 17% 21%,
                            rgba(205, 225, 249, 0.96),
                            rgba(166, 201, 243, 0.58) 45%,
                            transparent 74%
                        ),
                        radial-gradient(
                            ellipse 21% 34% at 31% 3%,
                            rgba(82, 126, 198, 0.92),
                            rgba(105, 154, 220, 0.54) 45%,
                            transparent 74%
                        ),
                        radial-gradient(
                            ellipse 26% 30% at 47% 12%,
                            rgba(235, 243, 253, 0.96),
                            rgba(185, 213, 247, 0.58) 44%,
                            transparent 73%
                        ),
                        radial-gradient(
                            ellipse 22% 34% at 61% 4%,
                            rgba(80, 124, 196, 0.94),
                            rgba(111, 159, 223, 0.54) 44%,
                            transparent 74%
                        ),
                        radial-gradient(
                            ellipse 25% 31% at 77% 18%,
                            rgba(205, 225, 249, 0.94),
                            rgba(156, 194, 240, 0.56) 45%,
                            transparent 73%
                        ),
                        radial-gradient(
                            ellipse 23% 35% at 96% 5%,
                            rgba(69, 108, 181, 0.94),
                            rgba(100, 149, 215, 0.52) 44%,
                            transparent 74%
                        ),
                        radial-gradient(
                            ellipse 28% 35% at 4% 53%,
                            rgba(239, 246, 254, 0.98),
                            rgba(197, 220, 248, 0.62) 44%,
                            transparent 72%
                        ),
                        radial-gradient(
                            ellipse 22% 32% at 28% 59%,
                            rgba(101, 151, 216, 0.9),
                            rgba(134, 178, 232, 0.52) 45%,
                            transparent 74%
                        ),
                        radial-gradient(
                            ellipse 25% 33% at 45% 44%,
                            rgba(225, 237, 251, 0.96),
                            rgba(180, 210, 246, 0.58) 43%,
                            transparent 72%
                        ),
                        radial-gradient(
                            ellipse 22% 34% at 62% 59%,
                            rgba(72, 114, 188, 0.92),
                            rgba(100, 148, 213, 0.52) 44%,
                            transparent 74%
                        ),
                        radial-gradient(
                            ellipse 27% 31% at 80% 48%,
                            rgba(213, 230, 249, 0.96),
                            rgba(163, 198, 240, 0.58) 44%,
                            transparent 73%
                        ),
                        radial-gradient(
                            ellipse 24% 34% at 98% 58%,
                            rgba(87, 134, 205, 0.92),
                            rgba(115, 163, 225, 0.52) 45%,
                            transparent 74%
                        ),
                        #8EB5EE;

                    filter: blur(8px);

                    animation:
                        likehome-drift-one
                        14s
                        ease-in-out
                        infinite
                        alternate;
                }

                /* Smaller light patches */
                .likehome-clouds-two {
                    background:
                        radial-gradient(
                            ellipse 15% 25% at 8% 27%,
                            rgba(241, 247, 254, 0.9),
                            transparent 72%
                        ),
                        radial-gradient(
                            ellipse 14% 25% at 24% 7%,
                            rgba(220, 235, 252, 0.86),
                            transparent 72%
                        ),
                        radial-gradient(
                            ellipse 17% 27% at 40% 35%,
                            rgba(242, 248, 254, 0.82),
                            transparent 72%
                        ),
                        radial-gradient(
                            ellipse 13% 24% at 56% 8%,
                            rgba(212, 230, 250, 0.82),
                            transparent 70%
                        ),
                        radial-gradient(
                            ellipse 17% 26% at 71% 31%,
                            rgba(239, 246, 254, 0.86),
                            transparent 72%
                        ),
                        radial-gradient(
                            ellipse 14% 26% at 88% 8%,
                            rgba(214, 231, 250, 0.86),
                            transparent 72%
                        ),
                        radial-gradient(
                            ellipse 16% 28% at 22% 78%,
                            rgba(235, 244, 254, 0.84),
                            transparent 72%
                        ),
                        radial-gradient(
                            ellipse 15% 27% at 52% 82%,
                            rgba(221, 235, 252, 0.8),
                            transparent 72%
                        ),
                        radial-gradient(
                            ellipse 17% 27% at 86% 76%,
                            rgba(241, 247, 254, 0.86),
                            transparent 72%
                        );

                    filter: blur(5px);
                    opacity: 0.9;

                    animation:
                        likehome-drift-two
                        18s
                        ease-in-out
                        infinite
                        alternate;
                }

                /* Deeper blue pockets */
                .likehome-clouds-three {
                    background:
                        radial-gradient(
                            ellipse 15% 27% at 8% 12%,
                            rgba(61, 98, 168, 0.72),
                            transparent 72%
                        ),
                        radial-gradient(
                            ellipse 16% 28% at 35% 17%,
                            rgba(69, 109, 180, 0.68),
                            transparent 73%
                        ),
                        radial-gradient(
                            ellipse 14% 26% at 57% 41%,
                            rgba(67, 107, 179, 0.65),
                            transparent 72%
                        ),
                        radial-gradient(
                            ellipse 17% 29% at 80% 15%,
                            rgba(63, 102, 174, 0.7),
                            transparent 73%
                        ),
                        radial-gradient(
                            ellipse 15% 27% at 68% 82%,
                            rgba(65, 104, 176, 0.68),
                            transparent 72%
                        );

                    filter: blur(7px);
                    opacity: 0.78;

                    animation:
                        likehome-drift-three
                        12s
                        ease-in-out
                        infinite
                        alternate;
                }

                /*
                 * Blotchy pigment texture.
                 * This is the layer that makes it feel more
                 * like watercolor/paint than a clean gradient.
                 */
                .likehome-paint-mottle {
                    position: absolute;
                    inset: -6%;

                    background-image:
                        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='600'%3E%3Cfilter id='m'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.018 .035' numOctaves='4' seed='41'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncR type='gamma' amplitude='1.4' exponent='1.6' offset='-.2'/%3E%3CfeFuncG type='gamma' amplitude='1.4' exponent='1.6' offset='-.2'/%3E%3CfeFuncB type='gamma' amplitude='1.4' exponent='1.6' offset='-.2'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23m)'/%3E%3C/svg%3E");

                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;

                    opacity: 0.28;
                    mix-blend-mode: soft-light;

                    animation:
                        likehome-texture-drift
                        24s
                        ease-in-out
                        infinite
                        alternate;
                }

                /*
                 * Brush fibers / streaks.
                 * Very subtle so it doesn't turn into stripes.
                 */
                .likehome-brush-texture {
                    position: absolute;
                    inset: -10%;

                    background:
                        repeating-linear-gradient(
                            8deg,
                            rgba(255,255,255,0.12) 0px,
                            rgba(255,255,255,0.12) 1px,
                            transparent 2px,
                            transparent 7px
                        ),
                        repeating-linear-gradient(
                            -14deg,
                            rgba(48,91,160,0.06) 0px,
                            rgba(48,91,160,0.06) 1px,
                            transparent 3px,
                            transparent 12px
                        );

                    opacity: 0.42;
                    filter: blur(0.6px);
                    mix-blend-mode: soft-light;

                    transform: rotate(-1deg) scale(1.08);
                }

                /*
                 * Fine paper/grain texture.
                 */
                .likehome-grain {
                    position: absolute;
                    inset: -6%;

                    background-image:
                        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='700' height='500'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='4' seed='12'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");

                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;

                    opacity: 0.13;
                    mix-blend-mode: overlay;

                    transform: scale(1.08);
                }

                @keyframes likehome-drift-one {
                    0% {
                        transform:
                            scale(1.06)
                            translate3d(-1.5%, -1%, 0);
                    }

                    50% {
                        transform:
                            scale(1.1)
                            translate3d(1%, 1.5%, 0);
                    }

                    100% {
                        transform:
                            scale(1.07)
                            translate3d(2.5%, -0.5%, 0);
                    }
                }

                @keyframes likehome-drift-two {
                    0% {
                        transform:
                            scale(1.06)
                            translate3d(2%, 1%, 0);
                    }

                    50% {
                        transform:
                            scale(1.11)
                            translate3d(-1.5%, -1%, 0);
                    }

                    100% {
                        transform:
                            scale(1.08)
                            translate3d(-2.5%, 1.5%, 0);
                    }
                }

                @keyframes likehome-drift-three {
                    0% {
                        transform:
                            scale(1.08)
                            translate3d(-2%, 1.5%, 0);
                    }

                    50% {
                        transform:
                            scale(1.12)
                            translate3d(1.5%, -1.5%, 0);
                    }

                    100% {
                        transform:
                            scale(1.07)
                            translate3d(2%, 1%, 0);
                    }
                }

                @keyframes likehome-texture-drift {
                    0% {
                        transform:
                            scale(1.08)
                            translate3d(-1%, 0, 0);
                    }

                    100% {
                        transform:
                            scale(1.12)
                            translate3d(1%, -1%, 0);
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .likehome-clouds,
                    .likehome-paint-mottle {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    );
}