---
name: learn-dashboard
description: Opens the learning progress dashboard in the browser. Shows subject progress, method effectiveness, session history, and topic detail.
---

# /learn-dashboard

## Step 1 — Install dashboard files

Copy the dashboard source files from the plugin to the data directory if not already present:

```bash
PLUGIN_DIR="$HOME/.claude/plugins/manual/learn/dashboard"
DATA_DIR="$HOME/.claude/plugins/data/learn/dashboard"
mkdir -p "$DATA_DIR"
for f in index.html app.js helpers.js styles.css; do
  cp "$PLUGIN_DIR/$f" "$DATA_DIR/$f"
done
```

## Step 2 — Open in browser

```bash
open ~/.claude/plugins/data/learn/dashboard/index.html
```

If `data.js` does not exist in the data directory yet:
> "No learning data found yet. Run /learn to start your first session, then open the dashboard again."
