"use client";

import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTelemetry } from "@/context/TelemetryContext";
import * as THREE from "three";
import { Environment, ContactShadows, Float } from "@react-three/drei";

function VehicleMesh() {
  const { tilt } = useTelemetry();
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Convert degrees to radians
    // Pitch: nose up/down (rotate around X axis)
    // Roll: tilt left/right (rotate around Z axis)
    // Adjust signs based on the typical MPU6050 orientation
    const targetPitch = THREE.MathUtils.degToRad(tilt.pitch);
    const targetRoll = THREE.MathUtils.degToRad(tilt.roll);

    // Smoothly interpolate current rotation to target rotation using lerp
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetPitch, 0.1);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, -targetRoll, 0.1);
  });

  return (
    <Float speed={2} rotationIntensity={0} floatIntensity={0.5} floatingRange={[-0.1, 0.1]}>
      <mesh ref={meshRef} castShadow receiveShadow>
        {/* Simple stylized car body */}
        <boxGeometry args={[1.2, 0.5, 2.4]} />
        <meshPhysicalMaterial
          color="#a855f7" // var(--accent)
          metalness={0.7}
          roughness={0.2}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          envMapIntensity={1.5}
        />
        
        {/* Cabin */}
        <mesh position={[0, 0.4, -0.2]} castShadow>
          <boxGeometry args={[1.0, 0.4, 1.2]} />
          <meshPhysicalMaterial
            color="#0D1526" // glass look
            metalness={0.9}
            roughness={0.1}
            transmission={0.8}
            thickness={0.5}
          />
        </mesh>
      </mesh>
    </Float>
  );
}

export function VehicleModel3D() {
  return (
    <div className="w-full h-full relative glass-card overflow-hidden rounded-2xl flex flex-col">
      <div className="absolute top-4 left-4 z-10">
        <h3 className="font-display font-bold text-sm tracking-wide text-white">Live Orientation</h3>
        <p className="text-xs text-white/50">3D Pitch & Roll</p>
      </div>

      <div className="flex-1 w-full h-full min-h-[300px]">
        <Canvas camera={{ position: [2.5, 2, 3.5], fov: 45 }}>
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
          <spotLight position={[-5, 5, -5]} intensity={0.8} color="#06b6d4" />
          
          <VehicleMesh />
          
          <ContactShadows
            position={[0, -1, 0]}
            opacity={0.6}
            scale={10}
            blur={2}
            far={4}
          />
          <Environment preset="city" />
        </Canvas>
      </div>
    </div>
  );
}
