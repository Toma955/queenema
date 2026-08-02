import { useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Lagana pozadina — malo SVG putanja, CSS animacija (bez Framer Motion). */
export function FloatingPathsBackground({
  position = -1,
  children,
  className,
}: {
  position?: number;
  className?: string;
  children?: ReactNode;
}) {
  const paths = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 18 * position} -${189 + i * 18}C-${
          380 - i * 18 * position
        } -${189 + i * 18} -${312 - i * 18 * position} ${216 - i * 14} ${
          152 - i * 18 * position
        } ${343 - i * 14}C${616 - i * 18 * position} ${470 - i * 14} ${
          684 - i * 18 * position
        } ${875 - i * 14} ${684 - i * 18 * position} ${875 - i * 14}`,
        width: 0.6 + i * 0.08,
        opacity: 0.06 + i * 0.015,
        delay: i * 0.6,
      })),
    [position]
  );

  return (
    <div className={cn("floating-paths relative w-full h-full", className)}>
      <div
        className="floating-paths__layer absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden
      >
        <svg
          className="floating-paths__svg w-full h-full text-[color:var(--foam)]"
          viewBox="0 0 696 316"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          {paths.map((path) => (
            <path
              key={path.id}
              className="floating-paths__stroke"
              d={path.d}
              stroke="currentColor"
              strokeWidth={path.width}
              strokeOpacity={path.opacity}
              style={{ animationDelay: `${path.delay}s` }}
            />
          ))}
        </svg>
      </div>
      <div className="floating-paths__content relative z-[1] h-full min-h-0 flex flex-col">
        {children}
      </div>
    </div>
  );
}
