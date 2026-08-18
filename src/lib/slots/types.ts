/** Video slot domain model. */

export type SymbolId =
  | "ten" | "jack" | "queen" | "king" | "ace"
  | "h1" | "h2" | "h3" | "h4"
  | "wild" | "scatter";

export interface SlotSymbol {
  id: SymbolId;
  name: string;
  /** Icon key resolved by the symbol sprite component. */
  icon: string;
  /** Payout multiplier of the LINE bet, indexed by match count 3,4,5. */
  pays: { 3: number; 4: number; 5: number };
  /** Wilds substitute for everything except scatters. */
  isWild?: boolean;
  /** Scatters pay anywhere and trigger the bonus. */
  isScatter?: boolean;
  /** Base hue for the tile treatment. */
  hue: number;
  /** Low-value card royals get a flatter, less ornate tile. */
  tier: "low" | "high" | "special";
}

/** A payline is one row index (0-2) per reel. */
export type Payline = [number, number, number, number, number];

export interface SlotConfig {
  slug: string;
  name: string;
  subtitle: string;
  reels: number;
  rows: number;
  /** Symbol id per stop, one strip per reel. */
  strips: SymbolId[][];
  paylines: readonly Payline[];
  symbols: Record<SymbolId, SlotSymbol>;
  /** Scatter count -> free spins awarded. */
  freeSpins: Readonly<Record<number, number>>;
  /** Scatter count -> multiplier of TOTAL bet paid directly. */
  scatterPays: Readonly<Record<number, number>>;
  /** Multiplier applied to every win during the free-spin round. */
  freeSpinMultiplier: number;
  /** Coin values selectable in the bet control. */
  coinValues: readonly number[];
  /** Advertised return to player. Verified by simulation, not asserted. */
  rtp: number;
  volatility: "low" | "medium" | "high";
  maxWin: number;
  /** Background treatment for the cabinet. */
  theme: {
    backdrop: string;
    rail: string;
    accent: string;
    glow: string;
  };
}

export interface WinLine {
  /** Index into config.paylines, or -1 for a scatter win. */
  lineIndex: number;
  symbolId: SymbolId;
  count: number;
  /** Reel/row coordinates of the winning symbols. */
  positions: { reel: number; row: number }[];
  /** Credits won, already multiplied. */
  amount: number;
}

export interface SpinOutcome {
  /** Stop index per reel, into that reel's strip. */
  stops: number[];
  /** Visible window: grid[reel][row]. */
  grid: SymbolId[][];
  lines: WinLine[];
  scatterCount: number;
  scatterWin: number;
  freeSpinsAwarded: number;
  /** Total credits returned this spin. */
  totalWin: number;
  /** Win expressed as a multiple of the total bet, for the win banner. */
  winMultiple: number;
}
