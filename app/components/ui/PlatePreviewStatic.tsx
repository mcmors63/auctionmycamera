"use client";

import React from "react";

type PlatePreviewStaticProps = {
  registration: string;
  width?: number;
  height?: number;
};

export default function PlatePreviewStatic({
  registration,
  width = 300,
  height = 70,
}: PlatePreviewStaticProps) {
  return (
    <div
      className="flex items-center justify-center relative"
      style={{
        backgroundColor: "#FFD500",
        border: "5px solid black",
        borderRadius: "8px",
        width: `${width}px`,
        height: `${height}px`,
        boxShadow:
          "0 0 2px #000, 0 2px 8px rgba(0,0,0,0.6), inset 0 1px 3px rgba(0,0,0,0.3)",
        fontFamily: "'Charles Wright', 'Arial Black', sans-serif",
        color: "black",
        fontSize: `${height * 0.65}px`,
        letterSpacing: "0.25rem",
        textTransform: "uppercase",
      }}
    >
      {/* Optional left GB strip (static, decorative) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          height: "100%",
          width: `${width * 0.18}px`,
          backgroundColor: "#00247D",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: `${height * 0.35}px`,
          fontWeight: "bold",
          borderRight: "3px solid black",
        }}
      >
        GB
      </div>

      <span style={{ marginLeft: `${width * 0.22}px` }}>
        {registration || ""}
      </span>
    </div>
  );
}
