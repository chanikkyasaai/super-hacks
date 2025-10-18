# super_hacks/agent.py

import boto3
import json
from tools import prioritize_patch, run_sandbox_test

# Initialize the Bedrock client
bedrock = boto3.client(service_name='bedrock-runtime')
model_id = 'anthropic.claude-3-5-sonnet-20240620-v1:0'

# Define the tools in the format Bedrock understands
tool_config = {
    "tools": [
        {
            "toolSpec": {
                "name": "prioritize_patch",
                "description": "Calculates a risk score and urgency for a patch based on CVE info.",
                "inputSchema": { "json": {
                    "type": "object",
                    "properties": { "cve_info": { "type": "string" } },
                    "required": ["cve_info"]
                }}
            }
        },
        {
            "toolSpec": {
                "name": "run_sandbox_test",
                "description": "Simulates running a sandbox test for a patch.",
                "inputSchema": { "json": {
                    "type": "object",
                    "properties": { "patch_info": { "type": "object" } },
                    "required": ["patch_info"]
                }}
            }
        }
    ]
}

def lambda_handler(event, context):
    try:
        # Get the user prompt from the API Gateway event
        body = json.loads(event.get("body", "{}"))
        user_prompt = body.get("prompt", "No prompt provided.")

        # First call to the model to see if it wants to use a tool
        response = bedrock.converse(
            modelId=model_id,
            messages=[{ "role": "user", "content": [{ "text": user_prompt }] }],
            toolConfig=tool_config
        )

        response_message = response['output']['message']
        
        # Check if the model wants to use a tool
        tool_calls = [content for content in response_message['content'] if 'toolUse' in content]

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
                    modelId=model_id,
                    messages=[
                        { "role": "user", "content": [{ "text": user_prompt }] },
                        response_message, # The model's previous turn
                        {
                            "role": "user",
                            "content": [{
                                "toolResult": {
                                    "toolUseId": tool_request['toolUseId'],
                                    "content": [{ "json": tool_result }]
                                }
                            }]
                        }
                    ],
                    toolConfig=tool_config
                )
                final_response_text = [content['text'] for content in second_response['output']['message']['content'] if 'text' in content][0]

            else: # If it calls another tool first
                final_response_text = "The agent tried to call a tool out of order."
        
        else: # The model responded directly without using a tool
            final_response_text = [content['text'] for content in response_message['content'] if 'text' in content][0]

        return {
            "statusCode": 200,
            "headers": { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            "body": json.dumps({ "response": final_response_text })
        }

    except Exception as e:
        print(f"Error: {e}")
        return {
            "statusCode": 500,
            "headers": { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            "body": json.dumps({ "error": str(e) })
        }