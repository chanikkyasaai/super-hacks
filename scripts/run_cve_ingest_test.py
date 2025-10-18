import requests
from super_hacks import cve_ingest
import os
import json
import sys

# Ensure the repo root is on sys.path
ROOT = os.path.dirname(os.path.dirname(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

os.environ['PATCHES_TABLE_NAME'] = 'demo-patches'
os.environ['EVENTS_TABLE_NAME'] = 'demo-events'

# Inline fake 'boto3' shim so this test runner doesn't need boto3 installed


class FakeTable:
    def __init__(self, name):
        self.name = name

    def put_item(self, Item):
        print(
            f"Fake put_item to {self.name}: {{'patchId': Item.get('patchId')}}")
        return {'ResponseMetadata': {'HTTPStatusCode': 200}}


class FakeResource:
    def Table(self, name):
        return FakeTable(name)


class FakeBoto3:
    def resource(self, *a, **k):
        return FakeResource()


# Install the fake boto3 into sys.modules so imports in the project work
sys.modules['boto3'] = FakeBoto3()

# Monkeypatch requests.get to return a small fake feed


class FakeResponse:
    def __init__(self, json_data):
        self._json = json_data

    def raise_for_status(self):
        return

    def json(self):
        return self._json


requests.get = lambda url, timeout=10: FakeResponse({'synthetic': True, 'cves': [
    {'cve': 'CVE-TEST-1', 'description': 'Test CVE 1', 'severity': 'CRITICAL'},
    {'cve': 'CVE-TEST-2', 'description': 'Test CVE 2', 'severity': 'HIGH'},
]})


def main():
    print('Running cve_ingest.lambda_handler...')
    res = cve_ingest.lambda_handler({}, None)
    print('Result:', json.dumps(res, indent=2))


if __name__ == '__main__':
    main()
