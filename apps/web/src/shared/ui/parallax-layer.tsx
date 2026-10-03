"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type UseScrollOptions,
} from "motion/react";
import { useRef, type ReactElement, type ReactNode } from "react";

// Positive travel trails the page scroll (farther away); negative travel leads it (closer).
const PARALLAX_TRAVEL_PIXELS = {
  backdrop: 160,
  floating: -48,
  raised: -32,
} as const;

const VIEWPORT_CROSSING: NonNullable<UseScrollOptions["offset"]> = [
  "start end",
  "end start",
];
const SCROLL_PROGRESS_RANGE = [0, 1];
const PARALLAX_SPRING = {
  stiffness: 120,
  damping: 30,
  restDelta: 0.001,
} as const;

export type ParallaxDepth = keyof typeof PARALLAX_TRAVEL_PIXELS;

export interface ParallaxLayerProps {
  readonly depth: ParallaxDepth;
  readonly children?: ReactNode;
  readonly className?: string;
}

export function ParallaxLayer({
  depth,
  children,
  className,
}: ParallaxLayerProps): ReactElement {
  const layerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: layerRef,
    offset: VIEWPORT_CROSSING,
  });
  const travel = useTransform(scrollYProgress, SCROLL_PROGRESS_RANGE, [
    0,
    PARALLAX_TRAVEL_PIXELS[depth],
  ]);
  const y = useSpring(travel, PARALLAX_SPRING);

  return (
    <motion.div
      ref={layerRef}
      className={className}
      style={{ y: shouldReduceMotion ? 0 : y }}
    >
      {children}
    </motion.div>
  );
}
