---
name: learn-dashboard
description: Opens the learning progress dashboard in the browser. Shows subject progress, method effectiveness, session history, and topic detail.
---

# /learn-dashboard

## Step 1 — Link data file

Symlink the user's data file into the dashboard source directory so the dashboard can read it:

```bash
PLUGIN_DASH="$HOME/.claude/plugins/manual/learn/dashboard"
DATA_JS="$HOME/.claude/plugins/data/learn/dashboard/data.js"
mkdir -p "$(dirname $DATA_JS)"
ln -sf "$DATA_JS" "$PLUGIN_DASH/data.js"
```

## Step 2 — Open in browser

```bash
open "$HOME/.claude/plugins/manual/learn/dashboard/index.html"
```

If `data.js` does not exist in the data directory yet:
> "No learning data found yet. Run /learn to start your first session, then open the dashboard again."
