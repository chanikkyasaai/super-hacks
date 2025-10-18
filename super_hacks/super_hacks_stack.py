# super_hacks/super_hacks_stack.py

from aws_cdk import (
    Stack,
    RemovalPolicy,
    Duration,
    aws_lambda as _lambda,
    aws_apigateway as apigateway,
    aws_dynamodb as dynamodb,
    aws_s3 as s3,
    aws_iam as iam # <-- Import the IAM module
)
from constructs import Construct

class SuperHacksStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. Define the Lambda Function (No bundling, no layers)
        ipo_agent_lambda = _lambda.Function(
            self, "IpoAgentFunction",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="agent.lambda_handler",
            code=_lambda.Code.from_asset("super_hacks"),
            timeout=Duration.seconds(30),
        )

        # 2. Add permission to call the Bedrock AI model
        ipo_agent_lambda.add_to_role_policy(iam.PolicyStatement(
            actions=["bedrock:InvokeModel"],
            resources=["*"] # For the hackathon, "*" is fine.
        ))

        # 3. Define the API Gateway (No changes here)
        api = apigateway.RestApi(
            self, "IPO-Api",
            rest_api_name="IPO-Api",
            default_cors_preflight_options={
                "allow_origins": apigateway.Cors.ALL_ORIGINS,
                "allow_methods": ["GET", "POST", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"]
            }
        )
        
        # ... (The rest of the file is the same)
        invoke_resource = api.root.add_resource("invoke")
        invoke_resource.add_method(
            "POST",
            apigateway.LambdaIntegration(ipo_agent_lambda)
        )

        patches_table = dynamodb.Table(
            self, "IPO-Patches",
            partition_key=dynamodb.Attribute(name="patchId", type=dynamodb.AttributeType.STRING),
            removal_policy=RemovalPolicy.DESTROY
        )

        assets_table = dynamodb.Table(
            self, "IPO-Assets",
            partition_key=dynamodb.Attribute(name="assetId", type=dynamodb.AttributeType.STRING),
            removal_policy=RemovalPolicy.DESTROY
        )
        
        patches_table.grant_read_write_data(ipo_agent_lambda)
        assets_table.grant_read_write_data(ipo_agent_lambda)

        s3.Bucket(
            self, "IPO-ComplianceReports",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL
        )