import { Link } from "@tanstack/react-router";
import { OCCASIONS } from "@/lib/occasions";

export function OccasionsHomeSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <style>{`
        @keyframes occFadeUp {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="mb-10 text-center">
        <div className="text-xs uppercase tracking-widest text-accent">Ocasiões</div>
        <h2
          className="mt-2 font-display text-3xl md:text-4xl"
          style={{ color: "#CBB275" }}
        >
          Qual é a ocasião?
        </h2>
        <p className="mt-2 text-base" style={{ color: "#F0EDD8" }}>
          Encontre o arranjo perfeito para cada momento
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {OCCASIONS.map((o, i) => (
          <Link
            key={o.id}
            to="/ocasioes"
            search={{ filter: o.id }}
            className="group block rounded-xl p-6 text-center transition-all hover:-translate-y-0.5"
            style={{
              background: "#222D17",
              border: "1px solid #3E4A2C",
              opacity: 0,
              animation: `occFadeUp 0.4s ease-out ${i * 0.08}s forwards`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#CBB275";
              e.currentTarget.style.background = "#29321A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#3E4A2C";
              e.currentTarget.style.background = "#222D17";
            }}
          >
            <o.icon
              className="mx-auto h-9 w-9 transition-colors group-hover:text-accent"
              style={{ color: "#CBB275" }}
              strokeWidth={1.5}
            />
            <div
              className="mt-3 font-display text-lg"
              style={{ color: "#F0EDD8" }}
            >
              {o.name}
            </div>
            <p
              className="mt-1 line-clamp-2 text-xs"
              style={{ color: "#A5A17E" }}
            >
              {o.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
