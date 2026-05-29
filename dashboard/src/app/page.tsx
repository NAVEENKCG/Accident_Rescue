"use client";

import { motion } from "framer-motion";

export default function Home() {
  return (
    <main className="pt-32 pb-24 md:py-40 px-6 max-w-6xl mx-auto min-h-screen flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-24"
      >
        <span className="text-sm font-semibold tracking-widest text-[#06b6d4]/70 uppercase mb-4 block">
          System Active
        </span>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-extrabold tracking-[-0.04em] mb-8 leading-tight">
          Real-time <span className="gradient-text">Impact</span> <br />Detection
        </h1>
        <p className="text-lg md:text-xl opacity-60 max-w-2xl mx-auto font-body">
          Monitoring vehicle telemetry with high-precision MPU6050 sensors. 
          Ready to dispatch emergency alerts instantly upon severe g-force events.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
      >
        {/* Main Card (col-span-2) */}
        <div className="glass-card md:col-span-2 p-8 flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="font-display text-2xl font-bold mb-2">Live Telemetry</h3>
            <p className="opacity-60 text-sm">Real-time G-Force and Gyroscope Data</p>
          </div>
          <div className="flex gap-8 mt-8">
            <div>
              <span className="block opacity-60 text-sm mb-1">Impact Threshold</span>
              <span className="text-3xl font-display font-bold text-[#f97316]">2.5g</span>
            </div>
            <div>
              <span className="block opacity-60 text-sm mb-1">Status</span>
              <span className="text-3xl font-display font-bold text-[#06b6d4]">Monitoring</span>
            </div>
          </div>
        </div>

        {/* Secondary Card */}
        <div className="glass-card p-8 flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="font-display text-xl font-bold mb-2">GPS Lock</h3>
            <p className="opacity-60 text-sm">Tracking active</p>
          </div>
          <div className="mt-8">
            <span className="block opacity-60 text-sm mb-1">Coordinates</span>
            <span className="text-lg font-mono tracking-widest text-[#06b6d4]">13.0827° N</span><br/>
            <span className="text-lg font-mono tracking-widest text-[#06b6d4]">80.2707° E</span>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
