"use client";
import dynamic from "next/dynamic";
import { Component, type ReactNode, useEffect, useState } from "react";
import { BottleFallback } from "./BottleFallback";

const Bottle3D = dynamic(() => import("./Bottle3D"), { ssr: false, loading: () => null });

type Props = {
  liquidColor: string;
  fill?: number;
  label?: string;
  autoRotate?: boolean;
  interactive?: boolean;
  className?: string;
  ariaLabel: string;
};

class GLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** 3D bottle with a static SVG fallback (SSR, no WebGL, errors). Space is reserved to avoid layout shift. */
export function Bottle({ className = "", ariaLabel, ...props }: Props) {
  const [gl, setGl] = useState<boolean | null>(null);
  useEffect(() => setGl(webglAvailable()), []);
  const fallback = <BottleFallback liquidColor={props.liquidColor} fill={props.fill} />;
  return (
    <div role="img" aria-label={ariaLabel} className={`relative ${className}`}>
      <div className="absolute inset-0 grid place-items-center" aria-hidden>
        {gl !== true && fallback}
      </div>
      {gl && (
        <div className="absolute inset-0" aria-hidden>
          <GLBoundary fallback={fallback}>
            <Bottle3D {...props} />
          </GLBoundary>
        </div>
      )}
    </div>
  );
}
