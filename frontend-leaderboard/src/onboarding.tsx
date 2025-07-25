import { useState, useEffect } from "preact/hooks";
import { createSmartAccount } from "./auth";

export function OnboardingModal({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

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
    await createSmartAccount();
    setCreating(false);
    closeAndRemember();
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
            {creating ? "Setting up..." : "Save Progress"}
          </button>
        </div>
      </div>
    </div>
  );
}