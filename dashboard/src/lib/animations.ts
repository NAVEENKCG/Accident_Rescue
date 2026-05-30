export const SPRING_SMOOTH = { type: "spring" as const, stiffness: 300, damping: 30 };
export const SPRING_SNAPPY = { type: "spring" as const, stiffness: 500, damping: 35 };
export const EASE_OUT_EXPO = { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const };

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: EASE_OUT_EXPO },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: EASE_OUT_EXPO },
};
