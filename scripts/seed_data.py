r"""Seed local or AWS resources for manual testing.

Creates/ensures DynamoDB tables (PATCHES_TABLE_NAME, ASSETS_TABLE_NAME, EVENTS_TABLE_NAME),
inserts sample items, and uploads sample compliance reports to S3 bucket (COMPLIANCE_BUCKET_NAME).

Usage (Windows cmd):
    .\.venv\Scripts\activate
    python scripts\seed_data.py

Environment variables:
  PATCHES_TABLE_NAME, ASSETS_TABLE_NAME, EVENTS_TABLE_NAME, COMPLIANCE_BUCKET_NAME
  DYNAMODB_ENDPOINT_URL (optional, for DynamoDB Local)

This script is best-effort and prints progress; if running against real AWS make sure your
AWS credentials/permissions allow creating tables and S3 objects.
"""

import os
import json
import time
import uuid
from datetime import datetime

import boto3
from botocore.exceptions import ClientError
from typing import Optional, Any


def get_dynamodb_resource():
    """Return a boto3 DynamoDB resource configured from environment variables.

    This mirrors the same env logic the rest of the script uses so callers can safely
    attempt safe lookups without creating resources.
    """
    region = os.getenv('AWS_REGION', os.getenv(
        'AWS_DEFAULT_REGION', 'us-east-1'))
    dynamodb_endpoint = os.getenv('DYNAMODB_ENDPOINT_URL')
    # If using local endpoint and no creds, inject dummy creds for boto3 so it won't error
    if dynamodb_endpoint and not (os.getenv('AWS_ACCESS_KEY_ID') and os.getenv('AWS_SECRET_ACCESS_KEY')):
        os.environ.setdefault('AWS_ACCESS_KEY_ID', 'dummy')
        os.environ.setdefault('AWS_SECRET_ACCESS_KEY', 'dummy')
    if dynamodb_endpoint:
        return boto3.resource('dynamodb', region_name=region, endpoint_url=dynamodb_endpoint)
    return boto3.resource('dynamodb', region_name=region)


def get_table(table_env: str) -> Optional[Any]:
    """Return a DynamoDB Table object.

    table_env may be either:
      - the name of an environment variable that contains the table name (e.g. 'PATCHES_TABLE_NAME'), or
      - the literal DynamoDB table name (e.g. 'IPO-Patches').

    This function first checks os.environ for a key matching table_env; if found it uses that value.
    Otherwise it treats table_env as the literal table name.
    """
    # Prefer explicit environment variable if present
    if table_env in os.environ:
        table_name = os.environ.get(table_env)
    else:
        # Treat the passed value as the table name directly
        table_name = table_env

    if not table_name:
        return None

    # Use a client to verify the table exists to avoid creating new tables accidentally
    region = os.getenv('AWS_REGION', os.getenv(
        'AWS_DEFAULT_REGION', 'us-east-1'))
    dynamodb_endpoint = os.getenv('DYNAMODB_ENDPOINT_URL')
    if dynamodb_endpoint and not (os.getenv('AWS_ACCESS_KEY_ID') and os.getenv('AWS_SECRET_ACCESS_KEY')):
        os.environ.setdefault('AWS_ACCESS_KEY_ID', 'dummy')
        os.environ.setdefault('AWS_SECRET_ACCESS_KEY', 'dummy')
    client_kwargs = {'region_name': region}
    if dynamodb_endpoint:
        client_kwargs['endpoint_url'] = dynamodb_endpoint

    try:
        client = boto3.client('dynamodb', **client_kwargs)
        client.describe_table(TableName=table_name)
    except ClientError:
        # Table does not exist or we can't access it
        return None
    except Exception:
        return None

    # Return a resource Table object for use by callers
    try:
        return get_dynamodb_resource().Table(table_name)
    except Exception:
        return None


def put_items(table, items):
    if table is None:
        print('Table not available, skipping put_items')
        return
    for it in items:
        try:
            table.put_item(Item=it)
        except Exception as e:
            print('Failed to put item', e)


def main():
    patches_table_name = os.getenv('PATCHES_TABLE_NAME', 'IPO-Patches')
    assets_table_name = os.getenv('ASSETS_TABLE_NAME', 'IPO-Assets')
    events_table_name = os.getenv('EVENTS_TABLE_NAME', 'IPO-Events')
    compliance_bucket = os.getenv(
        'COMPLIANCE_BUCKET_NAME', 'ipo-compliance-reports')

    dynamodb_endpoint = os.getenv('DYNAMODB_ENDPOINT_URL')
    region = os.getenv('AWS_REGION', os.getenv(
        'AWS_DEFAULT_REGION', 'us-east-1'))

    if dynamodb_endpoint:
        print('Using DynamoDB endpoint:', dynamodb_endpoint)
        # If using DynamoDB Local with no AWS creds configured, boto3 may still attempt to sign
        # requests. For local testing we inject dummy credentials to avoid NoCredentialsError.
        if not (os.getenv('AWS_ACCESS_KEY_ID') and os.getenv('AWS_SECRET_ACCESS_KEY')):
            os.environ.setdefault('AWS_ACCESS_KEY_ID', 'dummy')
            os.environ.setdefault('AWS_SECRET_ACCESS_KEY', 'dummy')
        dynamodb = boto3.resource(
            'dynamodb', region_name=region, endpoint_url=dynamodb_endpoint)
        dynamodb_client = boto3.client(
            'dynamodb', region_name=region, endpoint_url=dynamodb_endpoint)
    else:
        dynamodb = boto3.resource('dynamodb', region_name=region)
        dynamodb_client = boto3.client('dynamodb', region_name=region)

    # Lookup existing tables by environment variable name or literal name.
    patches_table = get_table(
        'PATCHES_TABLE_NAME') or get_table(patches_table_name)
    assets_table = get_table(
        'ASSETS_TABLE_NAME') or get_table(assets_table_name)
    events_table = get_table(
        'EVENTS_TABLE_NAME') or get_table(events_table_name)

    # Seed patches
    now = datetime.utcnow().isoformat()
    sample_patches = [
        {
            'patchId': 'PATCH-2025-001',
            'description': 'Critical OpenSSL update',
            'cve': 'CVE-2025-0001',
            'severity': 'CRITICAL',
            'status': 'PENDING',
        },
        {
            'patchId': 'PATCH-2025-002',
            'description': 'Kernel security update',
            'cve': 'CVE-2025-0002',
            'severity': 'HIGH',
            'status': 'PENDING',
        },
        {
            'patchId': 'PATCH-2025-003',
            'description': 'Minor libpng fix',
            'cve': 'CVE-2025-0003',
            'severity': 'LOW',
            'status': 'PENDING',
        },
    ]
    print('Seeding patches...')
    put_items(patches_table, sample_patches)

    # Seed assets
    sample_assets = [
        {'assetId': 'ASSET-001', 'name': 'web-server-1',
            'businessCriticality': 'high', 'platform': 'linux'},
        {'assetId': 'ASSET-002', 'name': 'db-server-1',
            'businessCriticality': 'high', 'platform': 'linux'},
        {'assetId': 'ASSET-003', 'name': 'workstation-1',
            'businessCriticality': 'low', 'platform': 'windows'},
    ]
    print('Seeding assets...')
    put_items(assets_table, sample_assets)

    # Seed events (some deployment events)
    sample_events = [
        {
            'eventId': str(uuid.uuid4()),
            'timestamp': now,
            'type': 'deployment',
            'status': 'success',
            'source': 'IPO',
            'message': 'Patch PATCH-2025-000 deployed',
            'patchId': 'PATCH-2025-000',
        },
    ]
    print('Seeding events...')
    put_items(events_table, sample_events)

    # Upload a compliance report into S3
    s3 = boto3.client('s3', region_name=region)
    report = {
        'reportName': f'compliance-sample-{datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")}.json',
        'generatedAt': now,
        'frameworks': [
            {'name': 'ISO 27001', 'status': 'compliant',
                'score': 95, 'lastAudit': now},
            {'name': 'SOC2', 'status': 'pending', 'score': 82, 'lastAudit': now},
        ],
    }

    try:
        # Create bucket if not exists (will raise if permissions absent)
        try:
            s3.head_bucket(Bucket=compliance_bucket)
            print(f"Bucket {compliance_bucket} exists")
        except ClientError:
            print(f"Creating bucket {compliance_bucket}...")
            try:
                s3.create_bucket(Bucket=compliance_bucket)
                print(f"Bucket {compliance_bucket} created")
            except Exception as e:
                print('Could not create bucket (continuing):', e)

        key = f"seed/{report['reportName']}"
        s3.put_object(Bucket=compliance_bucket,
                      Key=key, Body=json.dumps(report))
        print(f"Uploaded compliance report to s3://{compliance_bucket}/{key}")
    except Exception as e:
        # Fallback: write report locally so tests can still read it
        local_dir = os.path.join(os.path.dirname(__file__), 'seed_reports')
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, report['reportName'])
        try:
            with open(local_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, default=str, indent=2)
            print(
                f"Wrote compliance report locally to {local_path} (S3 upload failed: {e})")
        except Exception as e2:
            print('Failed to write local compliance report as fallback:', e2)

    print('Seeding complete.')


if __name__ == '__main__':
    main()
