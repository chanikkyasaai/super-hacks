import boto3
import json
import time
import random
from datetime import datetime
import uuid
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


def _record_event(event_type: str, patch_id: Optional[str], message: str, status: str = 'info', details: Optional[dict] = None) -> dict:
    """Helper to write an event into the EVENTS_TABLE_NAME table."""
    events_table = get_table('EVENTS_TABLE_NAME')
    event_id = str(uuid.uuid4())
    ts_iso = datetime.utcnow().isoformat()
    item = {
        'eventId': event_id,
        'timestamp': ts_iso,
        'type': event_type,
        'status': status,
        'source': 'IPO',
        'message': message,
        'patchId': patch_id,
        'details': details or {}
    }
    if events_table is None:
        # Not fatal; return the event record
        return item
    try:
        events_table.put_item(Item=item)
    except Exception:
        # best-effort only
        pass
    return item


def deploy_patch(patch_id: str, scheduled_time: Optional[str] = None) -> dict:
    """Simulate deploying a patch: update status and write an event."""
    patches_table = get_table('PATCHES_TABLE_NAME')
    if patches_table is None:
        return {"status": "error", "message": "PATCHES_TABLE_NAME not configured in environment."}

    try:
        update_values = {':st': 'DEPLOYED'}
        expr_vals = {':st': 'DEPLOYED'}
        expr_names = {'#st': 'status'}
        # Record deployed time
        deployed_at = datetime.utcnow().isoformat()
        patches_table.update_item(
            Key={'patchId': patch_id},
            UpdateExpression="SET impactScore = if_not_exists(impactScore, :zero), #st = :st, deployedAt = :d",
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues={
                ':st': 'DEPLOYED', ':d': deployed_at, ':zero': 0}
        )
    except Exception as e:
        return {"status": "error", "message": f"DynamoDB update failed: {e}"}

    evt = _record_event('deployment', patch_id, f'Patch {patch_id} deployed', status='success', details={
                        'scheduled_time': scheduled_time})
    return {"status": "ok", "patchId": patch_id, "deployedAt": deployed_at, "event": evt}


def rollback_patch(patch_id: str, reason: Optional[str] = None) -> dict:
    """Simulate rolling back a patch: update status and write an event."""
    patches_table = get_table('PATCHES_TABLE_NAME')
    if patches_table is None:
        return {"status": "error", "message": "PATCHES_TABLE_NAME not configured in environment."}

    try:
        rolled_at = datetime.utcnow().isoformat()
        patches_table.update_item(
            Key={'patchId': patch_id},
            UpdateExpression="SET #st = :st, rolledBackAt = :r",
            ExpressionAttributeNames={'#st': 'status'},
            ExpressionAttributeValues={':st': 'ROLLED_BACK', ':r': rolled_at}
        )
    except Exception as e:
        return {"status": "error", "message": f"DynamoDB update failed: {e}"}

    evt = _record_event(
        'rollback', patch_id, f'Patch {patch_id} rolled back', status='warning', details={'reason': reason})
    return {"status": "ok", "patchId": patch_id, "rolledBackAt": rolled_at, "event": evt}


def generate_compliance_report(report_name: Optional[str] = None) -> dict:
    """Generate a compliance JSON report from patches and assets and upload to S3.

    Returns the S3 key and a small summary.
    """
    bucket = os.getenv('COMPLIANCE_BUCKET_NAME')
    if not bucket:
        return {"status": "error", "message": "COMPLIANCE_BUCKET_NAME not configured in environment."}

    # Collect data
    patches_table = get_table('PATCHES_TABLE_NAME')
    assets_table = get_table('ASSETS_TABLE_NAME')

    patches = []
    assets = []
    try:
        if patches_table is not None:
            pr = patches_table.scan()
            patches = pr.get('Items', [])
    except Exception:
        patches = []
    try:
        if assets_table is not None:
            ar = assets_table.scan()
            assets = ar.get('Items', [])
    except Exception:
        assets = []

    # Build a summary
    total_patches = len(patches)
    deployed = sum(1 for p in patches if p.get('status') == 'DEPLOYED')
    analyzed = sum(1 for p in patches if p.get('status') == 'ANALYZED')

    report = {
        'reportName': report_name or f'compliance-{datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")}.json',
        'generatedAt': datetime.utcnow().isoformat(),
        'totalPatches': total_patches,
        'deployedPatches': deployed,
        'analyzedPatches': analyzed,
        'assetsCount': len(assets),
        'patches': patches,
        'assets': assets,
    }

    # Upload to S3
    s3 = boto3.client('s3')
    key = f"compliance/{report['reportName']}"
    try:
        s3.put_object(Bucket=bucket, Key=key,
                      Body=json.dumps(report, default=str))
    except Exception as e:
        return {"status": "error", "message": f"Failed to upload report: {e}"}

    evt = _record_event('compliance_report', None,
                        f'Generated compliance report {key}', status='info', details={'key': key})
    return {"status": "ok", "key": key, "summary": {"totalPatches": total_patches, "deployed": deployed}, "event": evt}


def list_patches(limit: int = 50) -> dict:
    """Return a list of patches from the patches table."""
    patches_table = get_table('PATCHES_TABLE_NAME')
    if patches_table is None:
        return {"status": "error", "message": "PATCHES_TABLE_NAME not configured in environment."}
    try:
        resp = patches_table.scan(Limit=limit)
        items = resp.get('Items', [])
        # Normalize items: ensure each has an `id` field and numeric impactScore
        normalized = []
        for it in items:
            pid = it.get('patchId') or it.get('id') or None
            impact = it.get('impactScore')
            try:
                if impact is not None:
                    # DynamoDB may return Decimal
                    impact = float(impact)
            except Exception:
                impact = 0
            normalized.append({
                **it,
                "id": pid,
                "patchId": pid,
                "impactScore": impact,
            })
        return {"patches": normalized}
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
        # Normalize timestamp fields to ISO strings and sort by timestamp desc
        normalized = []
        for it in items:
            ts = it.get('timestamp')
            if isinstance(ts, (int, float)):
                # assume epoch seconds
                try:
                    ts_iso = datetime.fromtimestamp(float(ts)).isoformat()
                except Exception:
                    ts_iso = str(ts)
            else:
                # if Dynamo returns Decimal or string, stringify
                try:
                    ts_iso = str(ts)
                except Exception:
                    ts_iso = None
            normalized.append({**it, "timestamp": ts_iso})
        try:
            normalized.sort(key=lambda x: x.get(
                'timestamp') or '', reverse=True)
        except Exception:
            pass
        return {"events": normalized}
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
                        # Normalize common fields if present
                        if 'lastAudit' in parsed and not parsed.get('lastModified'):
                            parsed['lastModified'] = parsed.get('lastAudit')
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


def list_deployments(limit: int = 50) -> dict:
    """Return recent deployment events as a list of deployment items.

    Deployment items include: deploymentId, patchId, timestamp, status, message
    """
    events_table = get_table('EVENTS_TABLE_NAME')
    if events_table is None:
        return {"status": "error", "message": "EVENTS_TABLE_NAME not configured in environment."}
    try:
        resp = events_table.scan(Limit=limit)
        items = resp.get('Items', [])
        deployments = []
        for it in items:
            if it.get('type') == 'deployment' or it.get('type') == 'deploy':
                deployments.append({
                    'deploymentId': it.get('eventId') or it.get('deploymentId'),
                    'patchId': it.get('patchId'),
                    'timestamp': it.get('timestamp'),
                    'status': it.get('status'),
                    'message': it.get('message')
                })
        # sort descending
        try:
            deployments.sort(key=lambda x: x.get(
                'timestamp') or '', reverse=True)
        except Exception:
            pass
        return {"deployments": deployments}
    except Exception as e:
        return {"status": "error", "message": f"DynamoDB scan failed: {e}"}


def bulk_deploy(patch_ids: list) -> dict:
    results = []
    for pid in patch_ids:
        try:
            res = deploy_patch(pid)
            results.append({"patchId": pid, "result": res})
        except Exception as e:
            results.append({"patchId": pid, "error": str(e)})
    return {"results": results}


def bulk_rollback(patch_ids: list, reason: Optional[str] = None) -> dict:
    results = []
    for pid in patch_ids:
        try:
            res = rollback_patch(pid, reason=reason)
            results.append({"patchId": pid, "result": res})
        except Exception as e:
            results.append({"patchId": pid, "error": str(e)})
    return {"results": results}
