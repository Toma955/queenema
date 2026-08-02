"use client";

import { useMemo, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function FloatingPathsBackground({
  position,
  children,
  className,
}: {
  position: number;
  className?: string;
  children?: ReactNode;
}) {
  const paths = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
          380 - i * 5 * position
        } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
          152 - i * 5 * position
        } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
          684 - i * 5 * position
        } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
        width: 0.5 + i * 0.03,
        duration: 20 + (i % 7) * 1.4,
      })),
    [position]
  );

  return (
    <div className={cn("floating-paths relative w-full h-full", className)}>
      <div className="floating-paths__layer absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="w-full h-full text-[color:var(--foam)]"
          viewBox="0 0 696 316"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          {paths.map((path) => (
            <motion.path
              key={path.id}
              d={path.d}
              stroke="currentColor"
              strokeWidth={path.width}
              strokeOpacity={0.08 + path.id * 0.02}
              initial={{ pathLength: 0.3, opacity: 0.45 }}
              animate={{
                pathLength: 1,
                opacity: [0.2, 0.55, 0.2],
                pathOffset: [0, 1, 0],
              }}
              transition={{
                duration: path.duration,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
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
