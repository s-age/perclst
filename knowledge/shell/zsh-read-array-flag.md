# `read -a` Is Not Supported in zsh

**Type:** External

## Context

Applies whenever shell one-liners or scripts need to split a string into an array. This project runs in a zsh environment, so bash-specific flags silently misbehave.

## What happened / What is true

- `read -a` (read into array) is a **bash-only** option.
- In zsh, the equivalent flag is `read -A`.
- Using `read -a` in a zsh shell does not error out — it silently produces wrong results, making the bug hard to spot.

## Do

- Use `read -A` when writing zsh-compatible array splits.
- Prefer Node.js for string-splitting logic in this project — it is already available and is portable across all shells.

## Don't

- Don't use `read -a` in scripts or one-liners intended to run in this project's zsh environment.
- Don't assume bash array syntax works in zsh just because the script runs without an error.

---

**Keywords:** zsh, bash, read -a, read -A, array, shell portability, string split
