"""Prototype sandbox agent for local testing.

Usage:
  python scripts/agent.py            # runs agent that connects to WS_URL
  python scripts/agent.py --local-run "echo hello"   # run a local test without WS

Requires: websocket-client (pip install websocket-client)
"""
import os
import sys
import time
import json
import argparse
import subprocess
import threading
from datetime import datetime

try:
    import websocket
except Exception:
    websocket = None

# If the project has the Lambda-style agent module available, import it so we
# share environment loading and any helpers. This keeps the prototype agent
# linked to the same package-level configuration used by the Lambda handler.
try:
    from super_hacks import agent as lambda_agent  # type: ignore
    print('[agent] linked to super_hacks.agent for shared config')
except Exception:
    lambda_agent = None

WS_URL = os.getenv('WS_URL', 'ws://localhost:8080')
AGENT_ID = os.getenv('AGENT_ID', 'agent-demo-1')


def send_json(ws, obj):
    try:
        ws.send(json.dumps(obj))
    except Exception as e:
        print('send failed', e)


def run_cmd_and_stream(ws, patchId, cmd):
    # run the given command and stream stdout/stderr line by line
    print(f'[agent] running cmd: {cmd}')
    try:
        proc = subprocess.Popen(
            cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    except Exception as e:
        print('[agent] failed to start process', e)
        send_json(ws, {'type': 'test_result', 'patchId': patchId,
                  'status': 'FAIL', 'return_code': -1})
        return

    # stream lines
    if proc.stdout is None:
        out, _ = proc.communicate()
        if out:
            for line in str(out).splitlines():
                send_json(
                    ws, {'type': 'log', 'patchId': patchId, 'line': line})
    else:
        for line in proc.stdout:
            line = line.rstrip('\n')
            send_json(ws, {'type': 'log', 'patchId': patchId, 'line': line})
        proc.wait()
    status = 'PASS' if proc.returncode == 0 else 'FAIL'
    send_json(ws, {'type': 'test_result', 'patchId': patchId,
              'status': status, 'return_code': proc.returncode})


def on_message(ws, message):
    try:
        msg = json.loads(message)
    except Exception:
        print('[agent] received non-json message')
        return
    print('[agent] recv:', msg)
    if msg.get('type') == 'run_test':
        patchId = msg.get('patchId')
        cmd = msg.get('cmd') or msg.get('command') or 'echo "no cmd provided"'
        # run in background thread
        t = threading.Thread(target=run_cmd_and_stream,
                             args=(ws, patchId, cmd), daemon=True)
        t.start()


def on_open(ws):
    print('[agent] ws open, registering...')
    send_json(ws, {'type': 'register', 'agentId': AGENT_ID, 'role': 'sandbox'})


def on_close(ws, code, reason):
    print('[agent] ws closed', code, reason)


def on_error(ws, err):
    print('[agent] ws error', err)


def run_ws_client():
    if websocket is None:
        print('websocket-client not installed. pip install websocket-client')
        return
    backoff = 1
    while True:
        try:
            ws = websocket.WebSocketApp(WS_URL,
                                        on_open=lambda w: on_open(w),
                                        on_message=lambda w, m: on_message(
                                            w, m),
                                        on_close=lambda w, c, r: on_close(
                                            w, c, r),
                                        on_error=lambda w, e: on_error(w, e))
            print(f'[agent] connecting to {WS_URL} as {AGENT_ID}...')
            ws.run_forever()
        except KeyboardInterrupt:
            print('[agent] interrupted')
            break
        except Exception as e:
            print('[agent] connection failed:', e)
        # reconnect with backoff
        print(f'[agent] reconnecting in {backoff}s...')
        time.sleep(backoff)
        backoff = min(30, backoff * 2)


def run_local_cmd(cmd):
    print('[agent] running local cmd (no WS):', cmd)
    proc = subprocess.Popen(cmd, shell=True)
    proc.communicate()
    print('[agent] local cmd exit', proc.returncode)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--local-run', help='Run a local command without connecting to WS')
    args = parser.parse_args()
    if args.local_run:
        run_local_cmd(args.local_run)
        return
    try:
        run_ws_client()
    except KeyboardInterrupt:
        print('[agent] exiting')


if __name__ == '__main__':
    main()
