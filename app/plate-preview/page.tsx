"use client";

import React, { useState } from "react";
import styles from "./PlatePreview.module.css";

const formatPlate = (input: string) => {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length > 4) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  }
  return cleaned;
};

export default function PlatePreviewPage() {
  const [plate, setPlate] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlate(formatPlate(e.target.value));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f4f4f4",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h1
        style={{
          fontSize: "28px",
          fontWeight: "bold",
          color: "#333",
          marginBottom: "20px",
        }}
      >
        DVLA Plate Entry
      </h1>

      <div className={styles.plate}>
        <input
          type="text"
          value={plate}
          onChange={handleChange}
          maxLength={9}
          placeholder="AB12 CDE"
          className={styles.input}
        />
      </div>

      <p style={{ marginTop: "25px", fontSize: "18px", color: "#555" }}>
        <strong>Formatted:</strong> {plate || "—"}
      </p>
    </div>
  );
}
