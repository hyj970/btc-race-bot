// Dip-buying cbBTC/USDC bot for make.fun's "Race a BTC trading bot live for 24 hours".
//
// Protocol: agent-fun/bars-replay/v1 (NDJSON on stdin/stdout, hello once, one batch
// per minute bar, one reply per batch). Node 22, standard library only, no
// network, no clock, no randomness: every decision is exact bigint arithmetic on
// the closes the harness has sent, so two runs on the same bars are identical.
//
// Strategy (long only, all-in / all-out, one position at most):
//   - Entry: the close has fallen DIP_BPS below the close 60 bars back (a sharp
//     hourly dip). After RELAX_BARS bars spent in cash with no entry, the dip
//     threshold relaxes to RELAX_DIP_BPS, so a quiet, steadily rising day still
//     finds a pullback to buy instead of sitting in cash for 24 hours.
//   - Exit, whichever comes first:
//       * the close has risen SPIKE_BPS above the close 30 bars back (a spike
//         that usually fades: take the money and wait for the next dip), or
//       * the close has fallen TRAIL_BPS below the highest close since entry
//         (a trailing stop: let a grind run, cut the fade).
//   - A rejected order (slippage cap, no bar) is simply retried on the next
//     batch while its condition still holds.
//   - Everything still held at the end is flattened by the harness.
//
// Tuned only on the kit's dev window (the 24 hours before the competition
// opened). Dev result there: net PnL +$25.73 on $1,000, 5 trades, max
// drawdown 1.57%. Neighbouring parameters (dip 95-115 bps, trail 80-120 bps,
// spike 150-250 bps) all stay clearly profitable on the same window, so the
// result is a plateau, not a single lucky point. Baseline bots on the same
// window: buy-and-hold +$1.07, momentum +$2.45, EMA-cross -$106.21.

import { runBars, type BarsState, type Batch, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Entry: 60-bar return below -DIP_BPS (in basis points). */
const DIP_BPS = 105n;
/** Exit: 30-bar return above +SPIKE_BPS. */
const SPIKE_BPS = 200n;
/** Exit: close TRAIL_BPS below the highest close since entry. */
const TRAIL_BPS = 90n;
/** After this many bars in cash with no entry, relax the dip threshold. */
const RELAX_BARS = 480;
const RELAX_DIP_BPS = 60n;
/** Slippage cap on every order, vs the latest close (10%: far above any
 * 1-minute move in the dev window, which peaked at 0.45%). */
const MAX_SLIPPAGE_BPS = 1000;

const closes: bigint[] = [];
let peak: bigint | null = null;
let cashBars = 0;

await runBars({
  onBatch(state: BarsState, _batch: Batch) {
    const close = state.close(SYMBOL);
    if (close === null) return []; // gap minute: no bar for us, nothing to decide on
    closes.push(close);
    if (state.warmingUp) return [];
    const held = state.positions.get(SYMBOL);
    if (held === undefined) {
      cashBars += 1;
      const dip = cashBars >= RELAX_BARS ? RELAX_DIP_BPS : DIP_BPS;
      if (closes.length > 60 && (close - closes[closes.length - 61]) * 10000n < -dip * closes[closes.length - 61]) {
        peak = close;
        cashBars = 0;
        const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [buy];
      }
      return [];
    }
    if (peak === null || close > peak) peak = close;
    if (closes.length > 30 && (close - closes[closes.length - 31]) * 10000n > SPIKE_BPS * closes[closes.length - 31]) {
      const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
      return [sell];
    }
    if ((peak - close) * 10000n >= TRAIL_BPS * peak) {
      const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
      return [sell];
    }
    return [];
  },
});
