---
name: learn-obsidian
description: Opens your learning knowledge base in Obsidian. Installs Obsidian automatically if not found.
---

# /learn-obsidian

## Step 1 — Check if Obsidian is installed

```bash
ls /Applications/Obsidian.app 2>/dev/null && echo "installed" || echo "not installed"
```

If installed → skip to Step 3.

## Step 2 — Install Obsidian

Check if Homebrew is available:

```bash
which brew
```

**If Homebrew is available:**
```bash
brew install --cask obsidian
```

**If Homebrew is NOT available:**
> "Homebrew is not installed. You can install Obsidian manually from https://obsidian.md/download — download the Mac dmg, open it, and drag Obsidian to Applications. Then run /learn-obsidian again."
>
> Stop here and wait for the user to install manually.

## Step 3 — Register the vault and open it

Register the vault in Obsidian's config file so it opens directly to the right folder:

```python
import json, os, time, secrets

config_path = os.path.expanduser("~/Library/Application Support/obsidian/obsidian.json")
vault_path = os.path.expanduser("~/.claude/plugins/data/learn/subjects")

with open(config_path, "r") as f:
    config = json.load(f)

already_registered = any(
    v.get("path") == vault_path
    for v in config["vaults"].values()
)

if not already_registered:
    vault_id = secrets.token_hex(8)
    config["vaults"][vault_id] = {
        "path": vault_path,
        "ts": int(time.time() * 1000),
        "open": True
    }
    with open(config_path, "w") as f:
        json.dump(config, f)

print("registered" if not already_registered else "already registered")
```

Then open:

```bash
open "obsidian://open?path=$HOME/.claude/plugins/data/learn/subjects"
```

Tell the user:

> "Obsidian is opening your learning vault.
>
> **Tips to get started:**
> - Press `Cmd+Shift+G` to open the **Graph view** — see how your topics connect
> - Click any `[[wikilink]]` inside a topic file to jump to related topics
> - Open `sessions.md` in any subject to see your full touch history (entries grouped under `## YYYY-MM-DD` headings form a session)
> - The vault updates automatically after every `/learn` session — no manual steps needed"
