"""Dip-buying cbBTC/USDC bot for make.fun's "Race a BTC trading bot live for 24 hours".

Protocol: agent-fun/bars-replay/v1 (NDJSON on stdin/stdout, hello once, one batch
per minute bar, one reply per batch). Python 3.13, standard library only, no
network, no clock, no randomness: every decision is exact integer arithmetic on
the closes the harness has sent, so two runs on the same bars are identical.

Strategy (long only, all-in / all-out, one position at most):
  - Entry: the close has fallen DIP_BPS below the close 60 bars back (a sharp
    hourly dip). After RELAX_BARS bars spent in cash with no entry, the dip
    threshold relaxes to RELAX_DIP_BPS, so a quiet, steadily rising day still
    finds a pullback to buy instead of sitting in cash for 24 hours.
  - Exit, whichever comes first:
      * the close has risen SPIKE_BPS above the close 30 bars back (a spike
        that usually fades: take the money and wait for the next dip), or
      * the close has fallen TRAIL_BPS below the highest close since entry
        (a trailing stop: let a grind run, cut the fade).
  - A rejected order (slippage cap, no bar) is simply retried on the next
    batch while its condition still holds.
  - Everything still held at the end is flattened by the harness.

Tuned only on the kit's dev window (the 24 hours before the competition
opened). Dev result there: net PnL +$25.73 on $1,000, 5 trades, max
drawdown 1.57%. Neighbouring parameters (dip 95-115 bps, trail 80-120 bps,
spike 150-250 bps) all stay clearly profitable on the same window, so the
result is a plateau, not a single lucky point. Baseline bots on the same
window: buy-and-hold +$1.07, momentum +$2.45, EMA-cross -$106.21.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor"))
import makefun_bars

SYMBOL = "CBBTC"
# Entry: 60-bar return below -DIP_BPS (in basis points).
DIP_BPS = 105
# Exit: 30-bar return above +SPIKE_BPS.
SPIKE_BPS = 200
# Exit: close TRAIL_BPS below the highest close since entry.
TRAIL_BPS = 90
# After this many bars in cash with no entry, relax the dip threshold.
RELAX_BARS = 480
RELAX_DIP_BPS = 60
# Slippage cap on every order, vs the latest close (10%: far above any
# 1-minute move in the dev window, which peaked at 0.45%).
MAX_SLIPPAGE_BPS = 1000

closes = []
peak = None
cash_bars = 0


def on_batch(state, batch):
    global peak, cash_bars
    bar = None
    for b in batch["bars"]:
        if b["symbol"] == SYMBOL:
            bar = b
            break
    if bar is None:
        return []  # gap minute: no bar for us, nothing to decide on
    closes.append(int(bar["c"]))
    close = closes[-1]
    held = state.positions.get(SYMBOL)
    if state.warming_up:
        return []
    if held is None:
        cash_bars += 1
        dip = RELAX_DIP_BPS if cash_bars >= RELAX_BARS else DIP_BPS
        if len(closes) > 60 and (close - closes[-61]) * 10000 < -dip * closes[-61]:
            peak = close
            cash_bars = 0
            return [{"side": "buy", "symbol": SYMBOL,
                     "notional_quote_units": state.cash,
                     "max_slippage_bps": MAX_SLIPPAGE_BPS}]
        return []
    if close > peak:
        peak = close
    if len(closes) > 30 and (close - closes[-31]) * 10000 > SPIKE_BPS * closes[-31]:
        return [{"side": "sell", "symbol": SYMBOL, "qty": held.qty,
                 "max_slippage_bps": MAX_SLIPPAGE_BPS}]
    if (peak - close) * 10000 >= TRAIL_BPS * peak:
        return [{"side": "sell", "symbol": SYMBOL, "qty": held.qty,
                 "max_slippage_bps": MAX_SLIPPAGE_BPS}]
    return []


makefun_bars.run(on_batch)
