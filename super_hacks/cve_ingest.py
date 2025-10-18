import os
import json
import uuid
import time
from datetime import datetime

import boto3
import requests

# Load local .env for developer convenience if python-dotenv is available.
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
except Exception:
    pass


def lambda_handler(event, context):
    """Simple CVE ingestion Lambda.

    - Fetches a sample CVE feed (or vendor URL configured via env)
    - Parses entries and writes new patches to the PATCHES_TABLE_NAME
    - Emits an event record to EVENTS_TABLE_NAME for each ingest
    This is intentionally simple and safe for hackathon/demo use.
    """
    patches_table_name = os.getenv('PATCHES_TABLE_NAME')
    events_table_name = os.getenv('EVENTS_TABLE_NAME')

    if not patches_table_name:
        return {"status": "error", "message": "PATCHES_TABLE_NAME not configured"}

    dynamodb = boto3.resource('dynamodb')
    patches_table = dynamodb.Table(patches_table_name)
    events_table = None
    if events_table_name:
        events_table = dynamodb.Table(events_table_name)

    # Use a minimal sample feed if none provided
    feed_url = os.getenv(
        'CVE_FEED_URL', 'https://nvd.nist.gov/feeds/json/cve/1.1/nvdcve-1.1-modified.json')
    try:
        resp = requests.get(feed_url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        # Fallback: create a single synthetic CVE
        data = {
            "synthetic": True,
            "cves": [
                {"cve": "CVE-2025-0001",
                    "description": "Synthetic test CVE", "severity": "HIGH"}
            ]
        }

    new_count = 0
    # Parse simple structure for demo purposes
    items = []
    if data.get('synthetic'):
        items = data['cves']
    else:
        # NVD feed parsing is complex. For demo, try to read 'CVE_Items'
        for item in data.get('CVE_Items', [])[:20]:
            cve_id = item.get('cve', {}).get('CVE_data_meta', {}).get('ID')
            descs = item.get('cve', {}).get(
                'description', {}).get('description_data', [])
            desc = descs[0].get('value') if descs else ''
            # severity extraction is best-effort
            severity = 'UNKNOWN'
            items.append(
                {'cve': cve_id, 'description': desc, 'severity': severity})

    for entry in items:
        patch_id = f"p-{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat() + 'Z'
        patch_item = {
            'patchId': patch_id,
            'cve': entry.get('cve'),
            'description': entry.get('description', '')[:1024],
            'severity': entry.get('severity', 'UNKNOWN'),
            'createdAt': now,
            'status': 'PENDING'
        }
        try:
            patches_table.put_item(Item=patch_item)
            new_count += 1
            if events_table is not None:
                events_table.put_item(Item={
                    'eventId': str(uuid.uuid4()),
                    'timestamp': now,
                    'source': 'cve_ingest',
                    'patchId': patch_id,
                    'message': f"Ingested CVE {entry.get('cve')}",
                })
        except Exception as e:
            print('Failed to write item', e)

    return {"status": "ok", "ingested": new_count}
