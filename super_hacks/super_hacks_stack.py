# super_hacks/super_hacks_stack.py

from aws_cdk import (
    Stack,
    RemovalPolicy,
    Duration,
    aws_lambda as _lambda,
    aws_apigateway as apigateway,
    aws_dynamodb as dynamodb,
    aws_s3 as s3,
    aws_iam as iam,  # <-- Import the IAM module
    aws_events as events,
    aws_events_targets as targets,
)
from constructs import Construct
from typing import cast


class SuperHacksStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. Define the Lambda Function (No bundling, no layers)
        ipo_agent_lambda = _lambda.Function(
            self, "IpoAgentFunction",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="agent.lambda_handler",
            code=_lambda.Code.from_asset("super_hacks"),
            # environment will be set after resource creation so create function first
            timeout=Duration.seconds(30),
        )

        # 2. Add permission to call the Bedrock AI model
        ipo_agent_lambda.add_to_role_policy(iam.PolicyStatement(
            actions=["bedrock:InvokeModel"],
            resources=["*"]  # For the hackathon, "*" is fine.
        ))

        # 3. Define the API Gateway (No changes here)
        api = apigateway.RestApi(
            self, "IPO-Api",
            rest_api_name="IPO-Api",
            default_cors_preflight_options={
                "allow_origins": ["*"],
                "allow_methods": ["GET", "POST", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
            },

        )

        # ... (The rest of the file is the same)
        invoke_resource = api.root.add_resource("invoke")
        # Use a non-proxy integration so API Gateway can inject CORS headers on responses
        post_integration = apigateway.LambdaIntegration(
            handler=cast(_lambda.IFunction, ipo_agent_lambda),
            proxy=False,
            integration_responses=[{
                "statusCode": "200",
                "responseParameters": {
                    "method.response.header.Access-Control-Allow-Origin": "'*'",
                    "method.response.header.Access-Control-Allow-Headers": "'Content-Type,Authorization'",
                    "method.response.header.Access-Control-Allow-Methods": "'GET,POST,OPTIONS'",
                }
            }]
        )

        invoke_resource.add_method(
            "POST",
            post_integration,
            method_responses=[{
                "statusCode": "200",
                "responseParameters": {
                    "method.response.header.Access-Control-Allow-Origin": True,
                    "method.response.header.Access-Control-Allow-Headers": True,
                    "method.response.header.Access-Control-Allow-Methods": True,
                }
            }]
        )

        patches_table = dynamodb.Table(
            self, "IPO-Patches",
            partition_key=dynamodb.Attribute(
                name="patchId", type=dynamodb.AttributeType.STRING),
            removal_policy=RemovalPolicy.DESTROY
        )

        assets_table = dynamodb.Table(
            self, "IPO-Assets",
            partition_key=dynamodb.Attribute(
                name="assetId", type=dynamodb.AttributeType.STRING),
            removal_policy=RemovalPolicy.DESTROY
        )

        patches_table.grant_read_write_data(ipo_agent_lambda)
        assets_table.grant_read_write_data(ipo_agent_lambda)

        compliance_bucket = s3.Bucket(
            self, "IPO-ComplianceReports",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL
        )

        # Grant the lambda permissions to put objects in the compliance bucket
        compliance_bucket.grant_put(ipo_agent_lambda)

        # Now attach environment variables with actual physical resource names
        ipo_agent_lambda.add_environment(
            "PATCHES_TABLE_NAME", patches_table.table_name)
        ipo_agent_lambda.add_environment(
            "ASSETS_TABLE_NAME", assets_table.table_name)
        ipo_agent_lambda.add_environment(
            "COMPLIANCE_BUCKET_NAME", compliance_bucket.bucket_name)
        ipo_agent_lambda.add_environment(
            "BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20240620-v1:0")

        # --- Events table to store ingestion and pipeline events ---
        events_table = dynamodb.Table(
            self, "IPO-Events",
            partition_key=dynamodb.Attribute(
                name="eventId", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(
                name="timestamp", type=dynamodb.AttributeType.STRING),
            removal_policy=RemovalPolicy.DESTROY
        )

        # Grant the main agent lambda write access to events
        events_table.grant_read_write_data(ipo_agent_lambda)

        # Make events table name available to the main lambda (used by ingestion & queries)
        ipo_agent_lambda.add_environment(
            "EVENTS_TABLE_NAME", events_table.table_name)
        # Schedule the main agent lambda to run the CVE ingestion path daily.
        # The lambda's handler can inspect the event to perform ingestion when scheduled.
        rule = events.Rule(
            self, "CVEIngestSchedule",
            schedule=events.Schedule.rate(Duration.hours(24)),
            targets=[targets.LambdaFunction(
                handler=cast(_lambda.IFunction, ipo_agent_lambda))]
        )
