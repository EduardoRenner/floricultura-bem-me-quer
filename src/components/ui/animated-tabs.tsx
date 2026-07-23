import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Barra de abas animada (indicador dourado deslizante via framer-motion).
// Adaptada à identidade da marca. O conteúdo de cada aba é renderizado pelo
// componente pai, com base em `active`.
export function AnimatedTabs({
  tabs,
  active,
  onChange,
  className,
  layoutId = "active-tab",
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  className?: string;
  layoutId?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap justify-center gap-1 rounded-full p-1",
        className,
      )}
      style={{ background: "var(--color-secondary)", border: "1px solid var(--color-border)" }}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = active === tab;
        return (
          <button
            key={tab}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab)}
            className="relative rounded-full px-4 py-1.5 text-sm font-medium outline-none transition-colors"
            style={{
              color: isActive ? "var(--color-accent-foreground)" : "var(--color-muted-foreground)",
            }}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full"
                style={{ background: "var(--color-accent)" }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab}</span>
          </button>
        );
      })}
    </div>
  );
}
