from super_hacks import agent
import sys
import os
import json

# Ensure repo root is on sys.path so we can import the package when running from scripts/
REPO_ROOT = os.path.dirname(os.path.dirname(__file__))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)


# Simulate API Gateway POST for action=list_patches
event = {'httpMethod': 'POST', 'body': json.dumps({'action': 'list_patches'})}
res = agent.lambda_handler(event, None)
print('Response keys:', res.keys())
print('Headers:', res.get('headers'))
print('Body:', res.get('body'))

# Simulate OPTIONS preflight
event_opts = {'httpMethod': 'OPTIONS', 'body': ''}
res2 = agent.lambda_handler(event_opts, None)
print('OPTIONS response:', res2)
