"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function Install() {
  const [event, setEvent] = useState<InstallEvent | null>(null),
    [hint, setHint] = useState(false),
    [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  if (installed) return null;
  return (
    <div className="install-cta">
      <div>
        <strong>Встановити єКапітал</strong>
        <p>
          {hint
            ? "iPhone: Safari → Поділитися → На початковий екран. Android / desktop: меню браузера → Встановити застосунок."
            : "Ваш план залишатиметься під рукою як окремий застосунок."}
        </p>
      </div>
      <button
        className="button outline small"
        onClick={async () => {
          if (event) {
            await event.prompt();
            const choice = await event.userChoice;
            if (choice.outcome === "accepted") setInstalled(true);
            setEvent(null);
          } else setHint(true);
        }}
      >
        <Download size={15} />
        Встановити
      </button>
    </div>
  );
}
