"use client";
// AMAVI bottle: rectangular glass flacon with a gold cap (matches the brand deck).
// Everything is procedural — no external HDRs, fonts or models are fetched.
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Environment, Lightformer, ContactShadows, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Props = {
  liquidColor: string;
  fill?: number; // 0..1
  label?: string;
  autoRotate?: boolean;
  interactive?: boolean;
};

function useLabelTexture(text: string) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 640;
    const g = c.getContext("2d")!;
    g.fillStyle = "#fffde6";
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = "#9b77be";
    g.lineWidth = 3;
    g.strokeRect(22, 22, c.width - 44, c.height - 44);
    g.fillStyle = "#2c0a71";
    g.textAlign = "center";
    g.font = "500 96px Oswald, 'Arial Narrow', sans-serif";
    g.fillText("AMAVI", c.width / 2, 250);
    g.fillStyle = "#6a3fa8";
    g.font = "500 24px 'Montserrat Variable', Arial, sans-serif";
    g.fillText("E A U   D E   P A R F U M", c.width / 2, 310);
    g.fillStyle = "#2c0a71";
    g.font = "400 40px Oswald, 'Arial Narrow', sans-serif";
    const t = text.toUpperCase();
    const name = t.length > 22 ? t.slice(0, 21) + "…" : t;
    g.fillText(name, c.width / 2, 450);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [text]);
}

function Flacon({ liquidColor, fill = 0.72, label = "Signature", autoRotate = true }: Props) {
  const group = useRef<THREE.Group>(null);
  const liquidMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const liquid = useRef<THREE.Mesh>(null);
  const target = useMemo(() => new THREE.Color(liquidColor), [liquidColor]);
  const labelTex = useLabelTexture(label);

  const W = 1.5, H = 1.75, D = 0.72, inset = 0.14;
  const innerH = H - inset * 2;

  useFrame((state, dt) => {
    if (group.current && autoRotate) group.current.rotation.y += dt * 0.25;
    if (group.current) group.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
    if (liquidMat.current) liquidMat.current.color.lerp(target, Math.min(1, dt * 3));
    if (liquid.current) {
      const h = Math.max(0.02, innerH * fill);
      liquid.current.scale.y = THREE.MathUtils.lerp(liquid.current.scale.y, h, Math.min(1, dt * 3));
      liquid.current.position.y = -innerH / 2 + liquid.current.scale.y / 2;
    }
  });

  return (
    <group ref={group} rotation={[0, -0.45, 0]}>
      {/* Liquid */}
      <mesh ref={liquid} scale={[1, 0.01, 1]}>
        <boxGeometry args={[W - inset * 2, 1, D - inset * 2]} />
        <meshPhysicalMaterial ref={liquidMat} color={liquidColor} roughness={0.18} clearcoat={0.6} transparent opacity={0.9} emissive={liquidColor} emissiveIntensity={0.08} />
      </mesh>
      {/* Glass */}
      <RoundedBox args={[W, H, D]} radius={0.09} smoothness={6}>
        <meshPhysicalMaterial
          color="#f7efe2"
          roughness={0.03}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.04}
          envMapIntensity={1.6}
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </RoundedBox>
      {/* Label */}
      <mesh position={[0, -0.12, D / 2 + 0.006]} renderOrder={3}>
        <planeGeometry args={[0.86, 1.07]} />
        <meshBasicMaterial map={labelTex} toneMapped={false} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, H / 2 + 0.06, 0]}>
        <cylinderGeometry args={[0.15, 0.17, 0.12, 40]} />
        <meshStandardMaterial color="#d9d0e6" metalness={1} roughness={0.3} />
      </mesh>
      {/* Gold cap */}
      <RoundedBox args={[0.62, 0.66, 0.5]} radius={0.05} smoothness={4} position={[0, H / 2 + 0.45, 0]}>
        <meshStandardMaterial color="#d9d0e6" metalness={0.95} roughness={0.26} envMapIntensity={1.4} />
      </RoundedBox>
    </group>
  );
}

export default function Bottle3D(props: Props) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const on = () => setReduced(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.35, 6.2], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={reduced ? "demand" : "always"}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} color="#fff3dc" />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} color="#c7a9e5" />
      <group position={[0, -0.25, 0]}>
        <Flacon {...props} autoRotate={(props.autoRotate ?? true) && !reduced} />
      </group>
      <ContactShadows position={[0, -1.4, 0]} opacity={0.35} scale={6} blur={2.6} far={2} color="#2c0a71" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={3} color="#fff4e0" position={[0, 3, 3]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#e2cbf6" position={[-4, 1, 0]} rotation-y={Math.PI / 2} scale={[3, 4, 1]} />
        <Lightformer form="rect" intensity={1} color="#ffffff" position={[4, 0.5, -1]} rotation-y={-Math.PI / 2} scale={[3, 3, 1]} />
        <Lightformer form="ring" intensity={0.8} color="#9b77be" position={[0, -2, -4]} scale={3} />
      </Environment>
      {props.interactive && (
        <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 1.8} rotateSpeed={0.6} />
      )}
    </Canvas>
  );
}
