import { useState, useRef } from "react";
import axios from "axios";

interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [displayBox, setDisplayBox] = useState<Box | null>(null);
  const [realBox, setRealBox] = useState<Box | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startDisp, setStartDisp] = useState<{ x: number; y: number } | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Wenn der Nutzer ein Bild auswählt
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setDisplayBox(null);
      setRealBox(null);
      setResultUrl("");
    }
  };

  // Drag-Start: Display- und Real-Koordinaten initial setzen
  const onMouseDown = (e: React.MouseEvent) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const dispX = e.clientX - rect.left;
    const dispY = e.clientY - rect.top;
    const scaleX = imgRef.current.naturalWidth  / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;

    setIsDragging(true);
    setStartDisp({ x: dispX, y: dispY });
    setDisplayBox({ x1: dispX, y1: dispY, x2: dispX, y2: dispY });
    setRealBox({
      x1: Math.round(dispX * scaleX),
      y1: Math.round(dispY * scaleY),
      x2: Math.round(dispX * scaleX),
      y2: Math.round(dispY * scaleY),
    });
  };

  // Drag-Move: nur Display-Box updaten
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !startDisp || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const dispX = e.clientX - rect.left;
    const dispY = e.clientY - rect.top;
    setDisplayBox({ x1: startDisp.x, y1: startDisp.y, x2: dispX, y2: dispY });
  };

  // Drag-Ende: Real-Box final berechnen
  const onMouseUp = () => {
    if (!isDragging || !displayBox || !imgRef.current) {
      setIsDragging(false);
      return;
    }
    setIsDragging(false);
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = imgRef.current.naturalWidth  / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    const x1 = Math.min(displayBox.x1, displayBox.x2);
    const y1 = Math.min(displayBox.y1, displayBox.y2);
    const x2 = Math.max(displayBox.x1, displayBox.x2);
    const y2 = Math.max(displayBox.y1, displayBox.y2);

    setRealBox({
      x1: Math.round(x1 * scaleX),
      y1: Math.round(y1 * scaleY),
      x2: Math.round(x2 * scaleX),
      y2: Math.round(y2 * scaleY),
    });
  };

  // Upload & API-Call
  const upload = async () => {
    if (!file || !realBox) {
      alert("Bitte zuerst Bild auswählen und Box ziehen.");
      return;
    }
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("x1", realBox.x1.toString());
    form.append("y1", realBox.y1.toString());
    form.append("x2", realBox.x2.toString());
    form.append("y2", realBox.y2.toString());

    try {
      const res = await axios.post(`/api/segment-box`, form, { responseType: "blob" });
      setResultUrl(URL.createObjectURL(res.data));
    } catch {
      alert("Upload fehlgeschlagen.");
    }
    setLoading(false);
  };

  return (
    <>
    <div style={{ padding: 24, maxWidth: "90vw", textAlign:"center" }}>
      <h1 style={{ fontSize: 24 }}>OutFeed – Kleidungsstück freistellen Demo</h1>
      <p>Lade ein Bild hoch von jemanden, dann ziehe einen Rahmen um das gewünschte Teil, klick dann auf „Freistellen“.</p>

      <input type="file" accept="image/*" onChange={onFileChange} />
      <button
        onClick={upload}
        disabled={loading}
        style={{
          marginLeft: 12,
          padding: "8px 16px",
          backgroundColor: "#2563EB",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Lädt..." : "Freistellen"}
      </button> </div>
      <div style={{ display: "flex", gap: 24, marginTop: 24, height: "600px", alignItems: "center", justifyContent: "center" }}>
        {/* Original mit Overlay */}
        <div
          style={{ position: "relative", width: "auto", height: "100%" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          {file && (
            <div style={{ width: "100%", height: "100%", display: "block" }}>
            <img
              ref={imgRef}
              src={URL.createObjectURL(file)}
              alt="Input"
              style={{ width: "100%", height: "100%", display: "block" }}
              draggable={false}
              onDragStart={(e) => e.preventDefault()} />
              <p style={{ textAlign:"center" }}>Ausgangsbild</p></div>
          )}
          {displayBox && (
            <div
              style={{
                position: "absolute",
                left: Math.min(displayBox.x1, displayBox.x2),
                top: Math.min(displayBox.y1, displayBox.y2),
                width: Math.abs(displayBox.x2 - displayBox.x1),
                height: Math.abs(displayBox.y2 - displayBox.y1),
                border: "2px solid red",
                pointerEvents: "none",
                zIndex: 9999,
              }} />
          )}
        </div>
        {/* Ergebnis */}
        {resultUrl && (
          <div style={{ width: "auto", height: "100%" }}>
            <img
              src={resultUrl}
              alt="Freigestelltes Teil"
              style={{ width: "100%", height: "100%", display: "block" }} /> 
              <p style={{ textAlign:"center" }}>Ergebnis</p>
              </div>
        )}
      </div></>
  );
}
