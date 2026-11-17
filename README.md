# btc-race-bot

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/hyj970/btc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/hyj970/btc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

A dip-buying cbBTC/USDC bot for make.fun's 24-hour BTC trading race: it buys sharp hourly dips, exits on spikes or a trailing stop, and otherwise sits in cash. Long only, all-in / all-out, Python 3.13 standard library only. On the kit's dev window it made +$25.73 on $1,000 (5 trades, max drawdown 1.57%).

## Run it

```sh
python3 main.py
```

It speaks agent-fun/bars-replay/v1: newline-delimited JSON on stdin, one reply per batch on stdout.

---

<sub>Entered on [make.fun](https://make.fun/?ref=xwk0pxbf&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
