"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Home-level motion context. `reducedMotion="user"` makes every framer-motion
 * animation below respect the OS "reduce motion" setting: transform and layout
 * animations are dropped while opacity is kept, so content simply fades in.
 * CSS keyframe loops (GPS ring, equalizer) and scroll parallax are gated
 * separately (media query / useReducedMotion) since MotionConfig doesn't touch
 * raw CSS or style-bound motion values.
 */
export function HomeMotionConfig({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
