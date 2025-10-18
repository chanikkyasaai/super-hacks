"""Run basic API tests against the /invoke endpoint.

Usage:
  python run_api_tests.py --url https://.../prod

It will POST { action: 'list_patches' } and other actions and print results.
"""
import os
import sys
import json
import argparse
import requests


def post_invoke(base_url, payload):
    url = base_url.rstrip('/') + '/invoke'
    headers = {'Content-Type': 'application/json',
               'Origin': 'http://localhost:8080'}
    resp = requests.post(url, json=payload, headers=headers, timeout=10)
    return resp


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', required=True,
                        help='Base API URL (e.g. https://abcd.execute-api.us-east-1.amazonaws.com/prod)')
    args = parser.parse_args()

    base = args.url
    print('Testing list_patches...')
    r = post_invoke(base, {'action': 'list_patches'})
    print('Status:', r.status_code)
    print('CORS header:', r.headers.get('Access-Control-Allow-Origin'))
    try:
        print('Body:', json.dumps(r.json(), indent=2))
    except Exception:
        print('Body (raw):', r.text[:500])

    print('\nTesting prioritize (using cve_info) ...')
    r2 = post_invoke(base, {'action': 'prioritize',
                     'cve_info': 'Test CVE-UNIT-1'})
    print('Status:', r2.status_code)
    print('CORS header:', r2.headers.get('Access-Control-Allow-Origin'))
    try:
        print('Body:', json.dumps(r2.json(), indent=2))
    except Exception:
        print('Body (raw):', r2.text[:500])

    print('\nTesting run_sandbox (use an existing patchId) ...')
    # If list_patches returned patches, try the first one
    try:
        patches = r.json().get('patches')
        first = patches[0].get('patchId') if patches else None
    except Exception:
        first = None
    if first:
        rs = post_invoke(base, {'action': 'run_sandbox', 'patch_id': first})
        print('Status:', rs.status_code)
        print('CORS header:', rs.headers.get('Access-Control-Allow-Origin'))
        try:
            print('Body:', json.dumps(rs.json(), indent=2))
        except Exception:
            print('Body (raw):', rs.text[:500])
    else:
        print('No patchId available to test run_sandbox.')

    print('\nTesting list_events...')
    re = post_invoke(base, {'action': 'list_events'})
    print('Status:', re.status_code)
    print('CORS header:', re.headers.get('Access-Control-Allow-Origin'))
    try:
        print('Body:', json.dumps(re.json(), indent=2))
    except Exception:
        print('Body (raw):', re.text[:500])

    print('\nTesting list_compliance...')
    rc = post_invoke(base, {'action': 'list_compliance'})
    print('Status:', rc.status_code)
    print('CORS header:', rc.headers.get('Access-Control-Allow-Origin'))
    try:
        print('Body:', json.dumps(rc.json(), indent=2))
    except Exception:
        print('Body (raw):', rc.text[:500])


if __name__ == '__main__':
    main()
