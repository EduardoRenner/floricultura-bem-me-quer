import { useEffect, useState } from "react";

const BRAND = "Floricultura Bem Me Quer";
const PETAL_COLORS = ["#CBB275", "#94833F", "#F0EDD8"];

export function CinematicIntro() {
  const [visible, setVisible] = useState<boolean | null>(null);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = sessionStorage.getItem("intro_seen") === "true";
    if (seen) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t1 = window.setTimeout(() => setFadingOut(true), 2800);
    const t2 = window.setTimeout(() => {
      sessionStorage.setItem("intro_seen", "true");
      setVisible(false);
    }, 3300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const skip = () => {
    sessionStorage.setItem("intro_seen", "true");
    setFadingOut(true);
    window.setTimeout(() => setVisible(false), 300);
  };

  if (visible === null || visible === false) return null;

  const petals = Array.from({ length: 20 }).map((_, i) => {
    const left = Math.random() * 100;
    const duration = 2 + Math.random() * 3;
    const delay = Math.random() * 1.5;
    const size = 8 + Math.random() * 12;
    const drift = (Math.random() * 120 - 60).toFixed(0);
    const color = PETAL_COLORS[i % PETAL_COLORS.length];
    const opacity = 0.4 + Math.random() * 0.3;
    return (
      <svg
        key={i}
        width={size}
        height={size * 1.4}
        viewBox="0 0 20 28"
        style={{
          position: "absolute",
          top: 0,
          left: `${left}%`,
          opacity,
          animation: `petalFall ${duration}s linear ${delay}s infinite`,
          // custom drift via CSS var
          ["--drift" as string]: `${drift}px`,
        }}
      >
        <ellipse cx="10" cy="14" rx="6" ry="13" fill={color} />
      </svg>
    );
  });

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#14180C",
        opacity: fadingOut ? 0 : 1,
        transition: "opacity 0.5s ease-out",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes petalFall {
          0% { transform: translateY(-20px) rotate(0deg) translateX(0); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.4; }
          100% { transform: translateY(110vh) rotate(720deg) translateX(var(--drift, 60px)); opacity: 0; }
        }
        @keyframes introLogoIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes introLetterIn {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes introFadeUp {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{petals}</div>

      <img
        src="/logo-bmq.png"
        alt="Floricultura Bem Me Quer"
        width={140}
        height={140}
        style={{
          width: 140,
          height: 140,
          borderRadius: "50%",
          objectFit: "cover",
          border: "3px solid #CBB275",
          animation: "introLogoIn 0.6s ease-out both",
          boxShadow: "0 4px 30px rgba(203,178,117,0.3)",
        }}
      />

      <h1
        style={{
          marginTop: 24,
          fontFamily: "'Playfair Display', serif",
          color: "#CBB275",
          fontSize: "clamp(1.8rem, 5vw, 3rem)",
          letterSpacing: "0.02em",
          display: "flex",
          gap: "0.02em",
        }}
        aria-label={BRAND}
      >
        {BRAND.split("").map((ch, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: 0,
              animation: `introLetterIn 0.4s ease-out ${0.6 + i * 0.05}s forwards`,
              whiteSpace: "pre",
            }}
          >
            {ch}
          </span>
        ))}
      </h1>

      <p
        style={{
          marginTop: 12,
          fontFamily: "'Raleway', sans-serif",
          color: "#F0EDD8",
          fontSize: "1rem",
          opacity: 0,
          animation: "introFadeUp 0.6s ease-out 1.2s forwards",
        }}
      >
        Flores que falam pelo coração
      </p>

      <button
        onClick={skip}
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          background: "transparent",
          border: "1px solid #3E4A2C",
          color: "#A5A17E",
          fontSize: "0.75rem",
          padding: "6px 12px",
          borderRadius: 20,
          cursor: "pointer",
          fontFamily: "'Raleway', sans-serif",
        }}
      >
        Pular intro
      </button>
    </div>
  );
}
