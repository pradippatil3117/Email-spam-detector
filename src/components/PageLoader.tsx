import React from "react";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";

export const PageLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full p-6 text-center space-y-6">
      <div className="relative">
        {/* Pulsing glow background */}
        <motion.div
          className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Core Shield container */}
        <motion.div
          className="relative p-5 rounded-2xl bg-muted/40 border border-border/10 text-primary shadow-xl"
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Shield className="w-10 h-10" />
        </motion.div>
        {/* Circular spinning ring */}
        <div className="absolute inset-0 -m-1.5">
          <motion.div
            className="w-full h-full rounded-2xl border-2 border-primary/20 border-t-primary"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>
      </div>

      <div className="space-y-1.5 max-w-xs">
        <h4 className="font-bold text-sm tracking-tight">Initializing Console</h4>
        <p className="text-xs text-muted-foreground leading-normal">
          Loading secure security modules and loading neural weights...
        </p>
      </div>
    </div>
  );
};
