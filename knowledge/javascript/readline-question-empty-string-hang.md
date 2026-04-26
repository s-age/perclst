# readline.question() Hangs on Empty String Prompt

**Type:** External

## Context

Applies when using Node.js `readline.createInterface` to prompt for user input in a CLI.
Occurs when the prompt text is written separately (e.g. via `process.stderr.write`) and an
empty string is passed as the query argument to `rl.question`.

## What happened / What is true

`rl.question(query, callback)` writes `query` to output and then begins reading from stdin.
When `query` is an empty string, readline's internal implementation may not fire the stdin
read trigger, causing the process to hang indefinitely with no response to keyboard input.

```ts
// Broken — hangs: stdin never starts reading
const rl = readline.createInterface({ input: process.stdin, output: process.stderr })
process.stderr.write('Switch? [Y/n] ')
rl.question('', (answer) => { ... })
```

## Do

- Pass the full prompt text as the first argument to `rl.question`:

```ts
const rl = readline.createInterface({ input: process.stdin, output: process.stderr })
rl.question('Switch? [Y/n] ', (answer) => {
  rl.close()
  // ...
})
```

- For multi-line prompts, join all lines into a single string and pass them together.

## Don't

- Don't write the prompt via `process.stderr.write` and then call `rl.question('')`.
- Don't pass an empty string as the `query` argument to `rl.question`.

---

**Keywords:** readline, rl.question, empty string, hang, stdin, prompt, Node.js, CLI input
