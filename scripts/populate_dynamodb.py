"""Populate DynamoDB tables (PATCHES and ASSETS) with sample data.

Usage:
  python populate_dynamodb.py

Supports DynamoDB Local by setting DYNAMODB_ENDPOINT_URL environment variable.
"""
import os
import uuid
import json
import time
from datetime import datetime

import boto3


def get_dynamodb():
    endpoint = os.getenv('DYNAMODB_ENDPOINT_URL')
    if endpoint:
        return boto3.resource('dynamodb', endpoint_url=endpoint)
    return boto3.resource('dynamodb')


def put_sample_items(patches_table_name, assets_table_name, count=5):
    dynamodb = get_dynamodb()
    patches = dynamodb.Table(patches_table_name)
    assets = dynamodb.Table(assets_table_name)

    now = datetime.utcnow().isoformat() + 'Z'
    for i in range(count):
        patch_id = f"PATCH-TEST-{i+1:03d}"
        item = {
            'patchId': patch_id,
            'cve': f'CVE-TEST-{i+1:04d}',
            'description': f'Synthetic test patch {i+1}',
            'severity': 'CRITICAL' if i % 2 == 0 else 'HIGH',
            'createdAt': now,
            'status': 'PENDING'
        }
        print('Putting patch', patch_id)
        patches.put_item(Item=item)

    # Add a couple assets
    for j in range(3):
        asset_id = f'ASSET-{j+1:03d}'
        assets.put_item(Item={
            'assetId': asset_id,
            'hostname': f'host{j+1}.example.com',
            'businessCriticality': 'high' if j == 0 else 'medium'
        })
        print('Putting asset', asset_id)

    print('Done')


if __name__ == '__main__':
    patches_table = os.getenv('PATCHES_TABLE_NAME')
    assets_table = os.getenv('ASSETS_TABLE_NAME')
    if not patches_table or not assets_table:
        print('Set PATCHES_TABLE_NAME and ASSETS_TABLE_NAME environment variables before running.')
        print('Example: PATCHES_TABLE_NAME=IPO-Patches ASSETS_TABLE_NAME=IPO-Assets python populate_dynamodb.py')
        raise SystemExit(1)

    put_sample_items(patches_table, assets_table)
