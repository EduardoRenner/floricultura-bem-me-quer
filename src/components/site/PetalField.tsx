import { useEffect, useMemo, useState } from "react";

// Pétalas/partículas florais flutuando continuamente — elemento de fundo "vivo".
// Renderiza só no cliente (evita mismatch de hidratação com SSR) e respeita
// prefers-reduced-motion (não renderiza nada se o usuário prefere menos movimento).

const COLORS = ["#CBB275", "#94833F", "#F0EDD8"];

type Petal = {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  spin: number;
  maxOpacity: number;
  color: string;
};

export function PetalField({ count = 14 }: { count?: number }) {
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setEnabled(!mq.matches);
    apply();
    setMounted(true);
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  const petals = useMemo<Petal[]>(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left: Math.random() * 100,
        size: 10 + Math.random() * 16,
        duration: 13 + Math.random() * 12, // lento = calmo
        delay: -Math.random() * 25, // negativo => já em movimento ao entrar
        drift: Math.round(Math.random() * 160 - 80),
        spin: Math.round(Math.random() * 320 + 120),
        maxOpacity: 0.12 + Math.random() * 0.22, // sutil, não distrai
        color: COLORS[i % COLORS.length],
      })),
    [count],
  );

  if (!mounted || !enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {petals.map((p, i) => (
        <svg
          key={i}
          width={p.size}
          height={p.size * 1.4}
          viewBox="0 0 20 28"
          className="petal-float"
          style={{
            position: "absolute",
            top: "-10%",
            left: `${p.left}%`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            ["--drift" as string]: `${p.drift}px`,
            ["--spin" as string]: `${p.spin}deg`,
            ["--maxo" as string]: String(p.maxOpacity),
          }}
        >
          <ellipse cx="10" cy="14" rx="6" ry="13" fill={p.color} />
        </svg>
      ))}
    </div>
  );
}
