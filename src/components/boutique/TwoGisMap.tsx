"use client";
import { useEffect, useRef } from "react";

// 2GIS MapGL JS API (requires an API key from dev.2gis.com). Loaded only when a key and coordinates are configured.
declare global {
  interface Window {
    mapgl?: {
      Map: new (el: HTMLElement, o: Record<string, unknown>) => { destroy(): void };
      Marker: new (map: unknown, o: Record<string, unknown>) => unknown;
    };
  }
}

export function TwoGisMap({ apiKey, lat, lon, label }: { apiKey: string; lat: number; lon: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: { destroy(): void } | null = null;
    const init = () => {
      if (!ref.current || !window.mapgl) return;
      map = new window.mapgl.Map(ref.current, { center: [lon, lat], zoom: 16, key: apiKey});
      new window.mapgl.Marker(map, { coordinates: [lon, lat], label: { text: label } });
    };
    if (window.mapgl) init();
    else {
      const s = document.createElement("script");
      s.src = "https://mapgl.2gis.com/api/js/v1";
      s.async = true;
      s.onload = init;
      document.head.appendChild(s);
    }
    return () => map?.destroy();
  }, [apiKey, lat, lon, label]);
  return <div ref={ref} className="absolute inset-0" />;
}
