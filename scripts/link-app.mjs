#!/usr/bin/env node
// Drive shopify app config link --reset via node-pty
import pty from "node-pty";
import fs from "node:fs";

const logPath = "/tmp/wwsl/pty.log";
const log = (msg) => { fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`); };
fs.writeFileSync(logPath, "");

const shell = process.env.SHELL || "/bin/bash";
const child = pty.spawn("/Users/omarshahban/.nvm/versions/node/v22.19.0/bin/node", ["/Users/omarshahban/.nvm/versions/node/v22.19.0/bin/shopify", "app", "config", "link", "--reset"], {
  name: "xterm-256color",
  cols: 220,
  rows: 60,
  cwd: process.cwd(),
  env: process.env,
});

let buffer = "";
let state = "create";
let lastAction = 0;

function send(text, nextState) {
  const now = Date.now();
  if (now - lastAction < 1500) return false;
  lastAction = now;
  log(`>>> state=${state} -> send ${JSON.stringify(text)} next=${nextState}`);
  child.write(text);
  state = nextState;
  buffer = "";
  return true;
}

child.onData((data) => {
  buffer += data;
  const clean = data.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "").replace(/\r/g, "");
  process.stdout.write(data);
  fs.appendFileSync(logPath, clean);

  const cleanBuf = buffer.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "");

  setTimeout(() => {
    if (state === "create" && /Create this project as a new app/.test(cleanBuf)) {
      send("y", "name");
    } else if (state === "name" && /App name/.test(cleanBuf)) {
      send("Store Locator Maps WW Dev\r", "org");
    } else if (state === "org" && /Which (organization|developer organization|partner organization|account)/.test(cleanBuf)) {
      send("\r", "store");
    } else if (state === "store" && /Which (store|dev store|development store)/.test(cleanBuf)) {
      send("\r", "config");
    } else if (state === "config" && /Configuration file name|name for this configuration/.test(cleanBuf)) {
      send("\r", "done");
    }
  }, 500);
});

child.onExit(({ exitCode, signal }) => {
  log(`EXIT code=${exitCode} signal=${signal} state=${state}`);
  process.exit(exitCode || 0);
});

setTimeout(() => {
  log(`TIMEOUT state=${state}`);
  child.kill();
  process.exit(2);
}, 120000);
