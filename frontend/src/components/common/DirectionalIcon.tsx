import type { ReactNode } from "react";
import { useDirection } from "@/hooks/useDirection";

interface DirectionalIconProps {
  children: ReactNode;
  /** Whether to flip horizontally in RTL mode (default: true). */
  flip?: boolean;
  className?: string;
}

/**
 * Wraps icons that need horizontal flipping in RTL.
 *
 * Icons that SHOULD flip: chevrons, arrows, back/forward.
 * Icons that SHOULD NOT flip: checkmarks, close, up/down, refresh, sun/moon.
 */
export function DirectionalIcon({
  children,
  flip = true,
  className,
}: DirectionalIconProps) {
  const { isRTL } = useDirection();

  return (
    <span
      className={className}
      style={
        isRTL && flip
          ? { display: "inline-flex", transform: "scaleX(-1)" }
          : { display: "inline-flex" }
      }
      data-testid="directional-icon"
    >
      {children}
    </span>
  );
}
