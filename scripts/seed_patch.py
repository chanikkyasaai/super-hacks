"""Seed a demo patch item into DynamoDB for prototype testing.

Usage:
  python scripts/seed_patch.py [--replace]

Reads table name from IPO_PATCHES_TABLE or defaults to IPO-Patches.
"""
import os
import json
import argparse
from datetime import datetime
import boto3


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--replace', action='store_true',
                        help='Overwrite existing item')
    args = parser.parse_args()

    table_name = os.getenv('IPO_PATCHES_TABLE') or os.getenv(
        'PATCHES_TABLE_NAME') or 'IPO-Patches'
    region = os.getenv('AWS_REGION', os.getenv(
        'AWS_DEFAULT_REGION', 'us-east-1'))
    ddb = boto3.resource('dynamodb', region_name=region)
    table = ddb.Table(table_name)

    item = {
        'patchId': 'PATCH-2025-001',
        'cve': 'CVE-2025-XXXXX',
        'description': 'Demo critical vulnerability for sandbox testing',
        'severity': 'CRITICAL',
        'impactScore': 0,
        'status': 'PENDING',
        'createdAt': datetime.utcnow().isoformat()
    }

    try:
        if not args.replace:
            # try put with condition to avoid overwriting
            table.put_item(
                Item=item, ConditionExpression='attribute_not_exists(patchId)')
            print(f"Inserted patch {item['patchId']} into {table_name}")
        else:
            table.put_item(Item=item)
            print(
                f"Inserted/Overwrote patch {item['patchId']} into {table_name}")
    except Exception as e:
        print('Failed to write patch:', e)
        print('You can run with --replace to overwrite.')
        return

    print('\nNext steps:')
    print(f" - PatchId: {item['patchId']}")
    print(' - Use the WS server and an agent to run a sandbox test:')
    print('    1) Start ws server: node ws-server.js')
    print('    2) Start agent: python scripts/agent.py')
    print(
        '    3) In ws-server CLI: send agent-demo-1 {"type":"run_test","patchId":"PATCH-2025-001","cmd":"echo hello"}')


if __name__ == '__main__':
    main()
