# Countdown Web

A simple, minimalist countdown web app for any event — meetings, deadlines, launches, flights, birthdays, anything you want to count down to.

**Live:** [hanchanghun.github.io/countdown-web](https://hanchanghun.github.io/countdown-web/)

## Features

- **Rename anything** — click the title to label your countdown (e.g. "Flight", "Deadline", "Wedding").
- **Pick a target** — choose a date and time, or use the quick adjust buttons (±5 min, ±15 min, ±1 hour, +1 day).
- **Shareable URLs** — the address bar auto-updates as you set the target or rename the title, so you can just copy the URL to share a preconfigured countdown. State also persists in local storage across reloads.
- **Keeps running past zero** — when the target passes, it flips to show elapsed time ("Started ago").
- **Zero setup** — one `index.html`, no build step, no dependencies.

## Usage

Just open [the live page](https://hanchanghun.github.io/countdown-web/), or clone and open `index.html` locally:

```bash
git clone https://github.com/HanChangHun/countdown-web.git
cd countdown-web
# open index.html in your browser
```

### Sharing a countdown

Set your target and title on the page — the URL in your address bar updates automatically. Just copy and send it.

Example:

```
https://hanchanghun.github.io/countdown-web/?t=1735689600000&title=New+Year
```

- `t` — target time in milliseconds since epoch
- `title` — display label (URL-encoded)

## License

[MIT](LICENSE) — by [HanChangHun](https://github.com/HanChangHun)
