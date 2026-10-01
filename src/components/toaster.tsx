import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export function ToasterMount() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  if (!on) return null;
  return (
    <Toaster
      theme="light"
      position="bottom-center"
      toastOptions={{
        style: {
          background: "var(--color-card)",
          color: "var(--color-ink)",
          border: "1px solid var(--color-line)",
          fontFamily: "var(--font-sans)",
        },
      }}
    />
  );
}
