import { Transform } from "@/components/canvas/hooks/useCanvasTransform";

interface CanvasGridProps {
  transform: Transform;
}

const BASE_SPACING = 36;
const MIN_SPACING = 10;

export function CanvasGrid({ transform }: CanvasGridProps) {
  const spacing = Math.max(MIN_SPACING, BASE_SPACING * transform.k);
  const normalizedX = ((transform.x % spacing) + spacing) % spacing;
  const normalizedY = ((transform.y % spacing) + spacing) % spacing;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundColor: "#111111",
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.16) 1px, transparent 1px)",
        backgroundSize: `${spacing}px ${spacing}px`,
        backgroundPosition: `${normalizedX}px ${normalizedY}px`,
        zIndex: 0,
      }}
    />
  );
}
