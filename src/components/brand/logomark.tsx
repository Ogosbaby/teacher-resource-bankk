"use client";

import { motion, type Easing } from "framer-motion";

export function Logomark({ size = 64, animated = true }: { size?: number; animated?: boolean }) {
  const pulse = animated
    ? {
        animate: { scale: [1, 1.08, 1], opacity: [1, 0.85, 1] },
        transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" as Easing },
      }
    : {};

  return (
    <motion.div
      {...pulse}
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-2xl bg-ink"
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 5.5C4 4.67 4.67 4 5.5 4H11V20H5.5C4.67 20 4 19.33 4 18.5V5.5Z"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M20 5.5C20 4.67 19.33 4 18.5 4H13V20H18.5C19.33 20 20 19.33 20 18.5V5.5Z"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="2.2" r="1.2" fill="white" />
      </svg>
    </motion.div>
  );
}
