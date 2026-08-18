"use client";

import type { OriginalConfig } from "@/lib/originals/types";
import { AviatorGame } from "./AviatorGame";
import { MinesGame } from "./MinesGame";
import { PlinkoGame } from "./PlinkoGame";
import { DiceGame } from "./DiceGame";
import { WheelGame } from "./WheelGame";

/** Routes a catalogue slug to the engine that backs it. */
export function OriginalGame({ config }: { config: OriginalConfig }) {
  switch (config.kind) {
    case "crash":
      return <AviatorGame config={config} />;
    case "mines":
      return <MinesGame config={config} />;
    case "plinko":
      return <PlinkoGame config={config} />;
    case "dice":
      return <DiceGame config={config} />;
    case "wheel":
      return <WheelGame config={config} />;
  }
}
