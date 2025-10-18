Deployment steps (CDK -> Lambda + API Gateway)

1. Configure AWS credentials and region (Windows cmd example):

    set AWS_ACCESS_KEY_ID=...
    set AWS_SECRET_ACCESS_KEY=...
    set AWS_DEFAULT_REGION=us-east-1

2. Activate the project's venv (Windows cmd):

    .\\.venv\\Scripts\\activate.bat

3. Install project requirements:

    python -m pip install -r requirements.txt
    python -m pip install -r requirements-dev.txt

4. Use the provided deploy helper (this runs `cdk synth` and `cdk deploy`):

    .\\.venv\\Scripts\\python.exe deploy_cdk.py

5. After deploy finishes, note the API Gateway invoke URL from the CDK output.

Notes:

-   The Lambda will have environment variables set for `PATCHES_TABLE_NAME`, `ASSETS_TABLE_NAME`, and `COMPLIANCE_BUCKET_NAME`. CDK resource logical names are used as defaults but may differ; you can modify the stack to pass the actual physical names by using the table.bucket.bucket_name properties instead.
-   The `agent.lambda_handler` used by the Lambda will call Bedrock using the role's permissions — make sure the Lambda's execution role has `bedrock:InvokeModel`.
-   To test the agent once deployed, POST to <API_ROOT>/invoke with JSON body {"prompt":"..."}.

Security:

-   For production, never use wildcard Bedrock resource permissions; scope the IAM policy.
-   Store secrets and model IDs securely (SSM Parameter Store or Secrets Manager) rather than environment variables for production.
