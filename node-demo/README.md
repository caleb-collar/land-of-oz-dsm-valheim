# Node.js Ink Resize Demo

This is a proof-of-concept to compare Ink resize behavior between **Node.js**
and **Deno**.

## Setup

```bash
cd node-demo
npm install
```

## Run

```bash
npm start
```

## Expected Behavior

The red bordered box should:

1. Fill the entire terminal
2. Display the current terminal dimensions
3. **Update dynamically** when you resize the terminal window

If this works in Node.js but not in Deno, it confirms the issue is with Deno's
npm compatibility layer not forwarding resize events.
