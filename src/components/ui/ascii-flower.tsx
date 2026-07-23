// Flor em ASCII animada — vídeo auto-hospedado (public/), sem depender de CDN
// externo. Preenche o pai; use com um contêiner relativo por trás do conteúdo.
export function AsciiArt({ className }: { className?: string }) {
  return (
    <video
      className={className}
      src="/ascii-flower.mp4"
      poster="/ascii-flower-poster.webp"
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
}
