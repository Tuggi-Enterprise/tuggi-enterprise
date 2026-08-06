"use client";

import { motion } from "framer-motion";

export function FreedomAnimation() {
  return (
    <div className="hidden lg:flex justify-end items-center h-full">
      <div className="w-80 h-80 relative flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="w-full h-full opacity-60">
          <motion.path
            d="M 20,100 Q 50,20 100,100 T 180,100"
            fill="transparent"
            stroke="#00A8E8"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 4,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
          <motion.circle
            cx="100" cy="100" r="4"
            fill="#0B1220"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 2, duration: 2, repeat: Infinity, repeatType: "reverse" }}
          />
        </svg>
      </div>
    </div>
  );
}
