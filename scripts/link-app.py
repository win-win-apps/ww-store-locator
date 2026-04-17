#!/usr/bin/env python3
"""Drive shopify app config link --reset via PTY. Send text and Enter as separate writes."""
import os, pty, select, re, sys, time

LOG = open("/tmp/wwsl/py.log", "w")
def log(m):
    LOG.write(f"[{time.time():.2f}] {m}\n"); LOG.flush()

SHOPIFY = "/Users/omarshahban/.nvm/versions/node/v22.19.0/bin/shopify"

pid, fd = pty.fork()
if pid == 0:
    os.environ["COLUMNS"] = "220"
    os.environ["LINES"] = "60"
    os.environ["TERM"] = "xterm-256color"
    os.execvp(SHOPIFY, [SHOPIFY, "app", "config", "link", "--reset"])

buffer = ""
state = "create"
last_send = 0
ANSI_RE = re.compile(r"\x1b\[[0-9;?]*[a-zA-Z]|\x1b[()][0-9A-Z]|\r")
deadline = time.time() + 240

def send_raw(text):
    os.write(fd, text.encode())

def send_text_then_enter(text):
    send_raw(text)
    time.sleep(0.6)
    send_raw("\r")

def advance(action_fn, next_state):
    global state, last_send, buffer
    now = time.time()
    if now - last_send < 2.0:
        return
    last_send = now
    log(f">>> state={state} -> {next_state}")
    action_fn()
    state = next_state
    buffer = ""

try:
    while time.time() < deadline:
        r, _, _ = select.select([fd], [], [], 0.5)
        if r:
            try:
                data = os.read(fd, 4096)
            except OSError:
                break
            if not data:
                break
            decoded = data.decode(errors="replace")
            sys.stdout.write(decoded); sys.stdout.flush()
            clean = ANSI_RE.sub("", decoded)
            LOG.write(clean); LOG.flush()
            buffer += clean
            if len(buffer) > 20000:
                buffer = buffer[-10000:]

        cb = buffer
        if state == "create" and "Create this project as a new app" in cb:
            advance(lambda: send_raw("y"), "name"); time.sleep(2); continue
        if state == "name" and "App name" in cb:
            advance(lambda: send_text_then_enter("StoreLocatorMapsWWDev"), "org"); time.sleep(2); continue
        if state == "org" and re.search(r"Which (organization|developer organization|partner organization|account)", cb):
            advance(lambda: send_raw("\r"), "store"); time.sleep(2); continue
        if state == "store" and re.search(r"Which (store|dev store|development store)", cb):
            advance(lambda: send_raw("\r"), "config"); time.sleep(2); continue
        if state == "config" and re.search(r"Configuration file name|name for this configuration", cb):
            advance(lambda: send_raw("\r"), "done"); time.sleep(2); continue

    log(f"LOOP END state={state}")
    LOG.close()
except Exception as e:
    log(f"ERROR {e}"); LOG.close(); raise
