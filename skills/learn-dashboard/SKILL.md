---
name: learn-dashboard
description: Opens the learning progress dashboard in the browser. Shows subject progress, method effectiveness, session history, and topic detail.
---

# /learn-dashboard

## Step 1 — Copy latest source files to data directory

```bash
PLUGIN_DASH="$HOME/.claude/plugins/manual/learn/dashboard"
DATA_DASH="$HOME/.claude/plugins/data/learn/dashboard"
mkdir -p "$DATA_DASH"
cp "$PLUGIN_DASH/index.html" "$DATA_DASH/"
cp "$PLUGIN_DASH/app.js" "$DATA_DASH/"
cp "$PLUGIN_DASH/helpers.js" "$DATA_DASH/"
cp "$PLUGIN_DASH/styles.css" "$DATA_DASH/"
```

## Step 2 — Open from data directory

```bash
open "$HOME/.claude/plugins/data/learn/dashboard/index.html"
```

If `data.js` does not exist in the data directory yet:
> "No learning data found yet. Run /learn to start your first session, then open the dashboard again."
