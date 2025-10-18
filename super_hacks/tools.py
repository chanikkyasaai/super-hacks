import boto3
import json
import time
import random
import os
from typing import Optional, Any

# Load local .env for developer convenience if python-dotenv is available.
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
except Exception:
    pass


_dynamodb: Any = None


def get_dynamodb_resource() -> Any:
    global _dynamodb
    if _dynamodb is None:
        # Allow AWS_REGION and other boto3 configuration via environment
        region = os.getenv('AWS_REGION', os.getenv('AWS_DEFAULT_REGION', None))
        # Support DynamoDB Local for local development/testing
        endpoint = os.getenv('DYNAMODB_ENDPOINT_URL')
        try:
            if endpoint:
                _dynamodb = boto3.resource(
                    'dynamodb', region_name=region or None, endpoint_url=endpoint)
            elif region:
                _dynamodb = boto3.resource('dynamodb', region_name=region)
            else:
                _dynamodb = boto3.resource('dynamodb')
        except Exception:
            # Propagate the exception so callers see the error, but avoid leaving _dynamodb set
            _dynamodb = None
            raise
    return _dynamodb


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

    try:
        return get_dynamodb_resource().Table(table_name)
    except Exception:
        return None


def prioritize_patch(cve_info: str) -> dict:
    """
    Analyzes a patch description, calculates an Impact Score, and updates its status in DynamoDB.
    For the hackathon, we'll find a patch based on the description.
    """
    print(f"TOOL: Prioritizing patch for '{cve_info}'...")

    patches_table = get_table('PATCHES_TABLE_NAME')
    assets_table = get_table('ASSETS_TABLE_NAME')

    # If no DynamoDB table names are configured, return an error to caller
    if patches_table is None:
        return {"status": "error", "message": "PATCHES_TABLE_NAME not configured in environment."}

    # In a real app, you'd find the patchId from the cve_info. Here we'll get the first pending one.
    try:
        response = patches_table.scan(
            FilterExpression="attribute_not_exists(impactScore)"
        )
    except Exception as e:
        return {"status": "error", "message": f"DynamoDB scan failed: {e}"}

    if not response.get('Items'):
        return {"status": "error", "message": "No pending patches found to prioritize."}

    patch = response['Items'][0]
    patch_id = patch.get('patchId') or patch.get('id')

    # Simulate business impact analysis by checking for critical assets
    num_critical_assets = 0
    if assets_table is not None:
        try:
            critical_assets_response = assets_table.scan(
                FilterExpression="businessCriticality = :val",
                ExpressionAttributeValues={":val": "high"}
            )
            num_critical_assets = critical_assets_response.get('Count', 0)
        except Exception:
            num_critical_assets = 0

    # Calculate Impact Score
    impact_score = 50  # Base score
    if patch.get('severity') == 'CRITICAL':
        impact_score += 30
    if num_critical_assets > 0:
        impact_score += 15

    is_high_risk = impact_score > 75

    # Update the item in DynamoDB if possible
    if patches_table is not None and patch_id:
        try:
            patches_table.update_item(
                Key={'patchId': patch_id},
                UpdateExpression="SET impactScore = :s, #st = :stat",
                ExpressionAttributeNames={'#st': 'status'},
                ExpressionAttributeValues={
                    ':s': impact_score,
                    ':stat': 'ANALYZED'
                }
            )
        except Exception:
            pass

    print(f"Calculated Impact Score: {impact_score} for Patch ID: {patch_id}")
    return {"patchId": patch_id, "impactScore": impact_score, "is_high_risk": is_high_risk}


def run_sandbox_test(patch_id: str) -> dict:
    """Simulates a sandbox test for a given patchId and updates its status."""
    print(f"TOOL: Starting sandbox test for Patch ID: '{patch_id}'...")
    patches_table = get_table('PATCHES_TABLE_NAME')
    if patches_table is not None:
        try:
            # 1. Set status to SANDBOX_TESTING
            patches_table.update_item(
                Key={'patchId': patch_id},
                UpdateExpression="SET #st = :stat",
                ExpressionAttributeNames={'#st': 'status'},
                ExpressionAttributeValues={':stat': 'SANDBOX_TESTING'}
            )
        except Exception:
            pass

    # 2. Simulate a delay (can be short)
    time.sleep(1)

    # 3. Determine result and update status
    test_result = random.choice(['PASS', 'FAIL'])
    final_status = 'SANDBOX_PASSED' if test_result == 'PASS' else 'SANDBOX_FAILED'

    if patches_table is not None:
        try:
            patches_table.update_item(
                Key={'patchId': patch_id},
                UpdateExpression="SET #st = :stat",
                ExpressionAttributeNames={'#st': 'status'},
                ExpressionAttributeValues={':stat': final_status}
            )
        except Exception:
            pass

    print(f"Sandbox test result: {test_result}")
    # Confidence can be static for now
    return {"testResult": test_result, "confidence": 94}


def list_patches(limit: int = 50) -> dict:
    """Return a list of patches from the patches table."""
    patches_table = get_table('PATCHES_TABLE_NAME')
    if patches_table is None:
        return {"status": "error", "message": "PATCHES_TABLE_NAME not configured in environment."}
    try:
        resp = patches_table.scan(Limit=limit)
        items = resp.get('Items', [])
        return {"patches": items}
    except Exception as e:
        return {"status": "error", "message": f"DynamoDB scan failed: {e}"}


def list_assets(limit: int = 100) -> dict:
    """Return a list of assets from the assets table."""
    assets_table = get_table('ASSETS_TABLE_NAME')
    if assets_table is None:
        return {"status": "error", "message": "ASSETS_TABLE_NAME not configured in environment."}
    try:
        resp = assets_table.scan(Limit=limit)
        items = resp.get('Items', [])
        return {"assets": items}
    except Exception as e:
        return {"status": "error", "message": f"DynamoDB scan failed: {e}"}


def list_events(limit: int = 100) -> dict:
    """Return a list of events from the EVENTS DynamoDB table."""
    events_table = get_table('EVENTS_TABLE_NAME')
    if events_table is None:
        return {"status": "error", "message": "EVENTS_TABLE_NAME not configured in environment."}
    try:
        resp = events_table.scan(Limit=limit)
        items = resp.get('Items', [])
        # Sort by timestamp if present (descending)
        try:
            items.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        except Exception:
            pass
        return {"events": items}
    except Exception as e:
        return {"status": "error", "message": f"DynamoDB scan failed: {e}"}


def list_compliance(max_items: int = 50) -> dict:
    """List compliance reports stored in an S3 bucket.

    Expects environment variable COMPLIANCE_BUCKET_NAME to point to the bucket.
    Attempts to download and parse JSON objects; if parsing fails returns metadata.
    """
    bucket = os.getenv('COMPLIANCE_BUCKET_NAME')
    if not bucket:
        return {"status": "error", "message": "COMPLIANCE_BUCKET_NAME not configured in environment."}

    s3 = boto3.client('s3')
    try:
        resp = s3.list_objects_v2(Bucket=bucket, MaxKeys=max_items)
        contents = resp.get('Contents', [])
        frameworks = []
        for obj in contents:
            key = obj.get('Key')
            entry = {"key": key, "lastModified": obj.get(
                'LastModified').isoformat() if obj.get('LastModified') else None}
            # Try to read and parse JSON content
            try:
                getr = s3.get_object(Bucket=bucket, Key=key)
                raw = getr['Body'].read()
                try:
                    parsed = json.loads(raw)
                    # If parsed is a dict and looks like a framework entry, merge
                    if isinstance(parsed, dict):
                        entry.update(parsed)
                except Exception:
                    # keep metadata only if content isn't JSON
                    pass
            except Exception:
                # couldn't fetch object body; keep metadata
                pass
            frameworks.append(entry)

        return {"frameworks": frameworks}
    except Exception as e:
        return {"status": "error", "message": f"S3 list failed: {e}"}
