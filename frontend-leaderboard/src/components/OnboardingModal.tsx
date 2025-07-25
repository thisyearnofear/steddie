import { useState, useEffect } from "preact/hooks";
import { createSmartAccount } from "../auth";

function getFlowAddress(): string {
  if (!localStorage.getItem("memoree_flow")) {
    const rand = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(x => x.toString(16).padStart(2, "0")).join("");
    localStorage.setItem("memoree_flow", rand);
  }
  return localStorage.getItem("memoree_flow")!;
}

export function OnboardingModal({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("memoree_seen")) {
      setOpen(true);
    }
  }, []);

  const closeAndRemember = () => {
    localStorage.setItem("memoree_seen", "1");
    setOpen(false);
    onClose();
  };

  const handleSave = async () => {
    setCreating(true);
    setError(null);
    try {
      await createSmartAccount(getFlowAddress());
      setCreating(false);
      closeAndRemember();
    } catch (e: any) {
      setError(e.message || "Failed to link");
      setCreating(false);
    }
  };

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Welcome to Memoree!</h2>
        <p>
          Play a quick demo or save your progress on-chain. You can always link a wallet later.
        </p>
        <div style={{ marginTop: "2em", display: "flex", gap: "1em", justifyContent:"center" }}>
          <button onClick={closeAndRemember} disabled={creating}>Play Demo</button>
          <button onClick={handleSave} disabled={creating}>
            {creating ? "Linking…" : "Save Progress"}
          </button>
        </div>
        {error && <div style={{ color: "salmon", marginTop: "1em" }}>{error}</div>}
      </div>
    </div>
  );
}