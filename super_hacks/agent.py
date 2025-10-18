# super_hacks/agent.py

import boto3
import json
from decimal import Decimal
from datetime import datetime
import os
from tools import prioritize_patch, run_sandbox_test, list_patches

# Load local .env for developer convenience if python-dotenv is available.
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

    print('PATCHES_TABLE_NAME=', os.getenv('PATCHES_TABLE_NAME'))
    print('ASSETS_TABLE_NAME=', os.getenv('ASSETS_TABLE_NAME'))
    print('EVENTS_TABLE_NAME=', os.getenv('EVENTS_TABLE_NAME'))

except Exception:
    # Missing python-dotenv is fine in production
    pass

# Initialize the Bedrock client lazily and read configuration from env
_bedrock = None


def get_bedrock_client():
    global _bedrock
    if _bedrock is None:
        region = os.getenv('AWS_REGION', os.getenv(
            'AWS_DEFAULT_REGION', 'us-east-1'))
        _bedrock = boto3.client(
            service_name='bedrock-runtime', region_name=region)
    return _bedrock


MODEL_ID = os.getenv('BEDROCK_MODEL_ID',
                     'anthropic.claude-3-5-sonnet-20240620-v1:0')

# Define the tools in the format Bedrock understands
tool_config = {
    "tools": [
        {
            "toolSpec": {
                "name": "prioritize_patch",
                "description": "Calculates a risk score and urgency for a patch based on CVE info.",
                "inputSchema": {"json": {
                    "type": "object",
                    "properties": {"cve_info": {"type": "string"}},
                    "required": ["cve_info"]
                }}
            }
        },
        {
            "toolSpec": {
                "name": "run_sandbox_test",
                "description": "Simulates running a sandbox test for a patch.",
                "inputSchema": {"json": {
                    "type": "object",
                    "properties": {"patch_info": {"type": "object"}},
                    "required": ["patch_info"]
                }}
            }
        }
    ]
}


def lambda_handler(event, context):
    # Helper to consistently format HTTP responses with CORS
    def make_response(status_code: int, body_obj):
        def _decimal_default(o):
            # Convert Decimal to int/float, bytes to str, datetime to ISO, sets to lists
            if isinstance(o, Decimal):
                # Prefer int when there's no fractional part
                if o == o.to_integral_value():
                    return int(o)
                return float(o)
            if isinstance(o, (set,)):
                return list(o)
            if isinstance(o, (bytes, bytearray)):
                try:
                    return o.decode('utf-8')
                except Exception:
                    return str(o)
            if isinstance(o, datetime):
                return o.isoformat()
            raise TypeError(f"Type {type(o)} not JSON serializable")

        return {
            "statusCode": status_code,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
            },
            "body": json.dumps(body_obj, default=_decimal_default),
        }

    try:
        # Quick CORS preflight handling for API Gateway proxy
        # If invoked by EventBridge scheduled rule, run the CVE ingestion flow and exit
        if event.get('source') == 'aws.events' or event.get('detail-type') == 'Scheduled Event':
            try:
                # Import the ingestion module and delegate
                import cve_ingest
                result = cve_ingest.lambda_handler(event, context)
                # Return a simple acknowledgement for scheduled runs
                return make_response(200, {"ingest_result": result})
            except Exception as e:
                print('Ingestion delegation error:', e)
                return make_response(500, {"error": "ingestion failed", "detail": str(e)})

        method = event.get('httpMethod') or event.get(
            'requestContext', {}).get('http', {}).get('method')

        # Debug: log the incoming event for CloudWatch to inspect request shape
        print('DEBUG: raw event ->', event)

        if method == 'OPTIONS':
            return make_response(200, {"ok": True})

        # Be tolerant: API Gateway may send body as a JSON string (proxy) or as an already-parsed dict (non-proxy)
        raw_body = event.get('body', {})
        try:
            if isinstance(raw_body, str):
                body = json.loads(raw_body) if raw_body else {}
            elif isinstance(raw_body, dict):
                body = raw_body
            else:
                body = {}
        except Exception as e:
            print('DEBUG: Failed to parse body:', e, 'raw_body=', raw_body)
            body = {}

        print('DEBUG: parsed body ->', body)

        # If caller supplies an 'action' (usually inside the request body), handle it directly via tools
        action = body.get('action') or event.get('action')
        if action:
            if action == 'list_patches':
                print('DEBUG: action=list_patches')
                return make_response(200, list_patches())

            if action == 'list_assets':
                try:
                    from tools import list_assets
                    return make_response(200, list_assets())
                except Exception:
                    return make_response(500, {"error": "list_assets tool not available"})

            if action == 'list_events':
                try:
                    from tools import list_events
                    return make_response(200, list_events())
                except Exception as e:
                    print('list_events error:', e)
                    return make_response(500, {"error": "list_events failed"})

            if action == 'list_compliance':
                try:
                    from tools import list_compliance
                    return make_response(200, list_compliance())
                except Exception as e:
                    print('list_compliance error:', e)
                    return make_response(500, {"error": "list_compliance failed"})

            if action == 'run_sandbox':
                # Accept patch id from body or from top-level event (API Gateway may put fields at top-level)
                patch_id = (
                    body.get('patch_id')
                    or body.get('patchId')
                    or event.get('patch_id')
                    or event.get('patchId')
                )
                if not patch_id:
                    return make_response(400, {"error": "patch_id required"})
                return make_response(200, run_sandbox_test(patch_id))

            if action == 'prioritize':
                # Accept CVE info from body or top-level event
                cve_info = (
                    body.get('cve_info')
                    or body.get('cve')
                    or event.get('cve_info')
                    or event.get('cve')
                )
                if not cve_info:
                    return make_response(400, {"error": "cve_info required"})
                return make_response(200, prioritize_patch(cve_info))

        # otherwise treat as a user prompt to Bedrock
        user_prompt = body.get('prompt') or event.get(
            'prompt') or "No prompt provided."

        # First call to the model to see if it wants to use a tool
        bedrock = get_bedrock_client()
        response = bedrock.converse(
            modelId=MODEL_ID,
            messages=[{"role": "user", "content": [{"text": user_prompt}]}],
            toolConfig=tool_config,
        )

        response_message = response['output']['message']

        # Check if the model wants to use a tool
        tool_calls = [
            content for content in response_message['content'] if 'toolUse' in content]

        if tool_calls:
            # For this simple workflow, we assume it calls tools sequentially
            # A more complex agent would loop here

            # --- Call the first tool ---
            tool_request = tool_calls[0]['toolUse']
            tool_name = tool_request['name']
            tool_args = tool_request['input']

            if tool_name == 'prioritize_patch':
                tool_result = prioritize_patch(**tool_args)

                # --- Call the model AGAIN with the tool's result ---
                second_response = bedrock.converse(
                    modelId=MODEL_ID,
                    messages=[
                        {"role": "user", "content": [{"text": user_prompt}]},
                        response_message,  # The model's previous turn
                        {
                            "role": "user",
                            "content": [{
                                "toolResult": {
                                    "toolUseId": tool_request['toolUseId'],
                                    "content": [{"json": tool_result}]
                                }
                            }]
                        }
                    ],
                    toolConfig=tool_config,
                )
                final_response_text = [
                    content['text'] for content in second_response['output']['message']['content'] if 'text' in content][0]

            else:  # If it calls another tool first
                final_response_text = "The agent tried to call a tool out of order."

        else:  # The model responded directly without using a tool
            final_response_text = [
                content['text'] for content in response_message['content'] if 'text' in content][0]

        return make_response(200, {"response": final_response_text})

    except Exception as e:
        print(f"Error: {e}")
        return make_response(500, {"error": str(e)})


def invoke(payload: dict) -> dict:
    """
    Agent Core compatible invocation. Accepts a dict payload and returns a dict.
    The payload is expected to contain a 'prompt' key or full body equivalent.
    """
    # Build a minimal event object compatible with lambda_handler
    event = {"body": json.dumps(payload)}
    resp = lambda_handler(event, None)
    # lambda_handler returns a dict with string body; unwrap it into dict
    try:
        body = resp.get('body')
        if isinstance(body, str):
            return json.loads(body)
        return body
    except Exception:
        return {"error": "Failed to parse response", "raw": resp}
