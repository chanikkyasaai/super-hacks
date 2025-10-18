"""deploy_cdk.py

Utility to synth + deploy the CDK stack and print CloudFormation outputs.

Usage (Windows cmd):
    set AWS_ACCESS_KEY_ID=...
    set AWS_SECRET_ACCESS_KEY=...
    set AWS_DEFAULT_REGION=us-east-1
    .\\.venv\\Scripts\\activate.bat
    python deploy_cdk.py

Requirements:
- CDK CLI must be installed and configured (npm i -g aws-cdk)
- AWS credentials with permissions to create CloudFormation stacks
"""
import json
import subprocess
import sys
import os
import boto3
from botocore.config import Config

STACK_NAME = os.getenv("CDK_STACK_NAME", "SuperHacksStack")
OUTPUTS_FILE = "cdk-deploy-outputs.json"


def run_cmd(cmd, **kwargs):
    print("Running:", " ".join(cmd))
    return subprocess.run(cmd, check=True, **kwargs)


def main():
    # Check cdk available
    try:
        run_cmd(["cdk", "--version"], stdout=subprocess.DEVNULL)
    except Exception as e:
        print("Error: CDK CLI not found or not in PATH. Install it (npm i -g aws-cdk) and try again.")
        sys.exit(1)

    # Synthesize
    try:
        run_cmd(["cdk", "synth"])
    except subprocess.CalledProcessError as e:
        print("cdk synth failed", e)
        sys.exit(1)

    # Deploy the specific stack and write outputs to file
    try:
        run_cmd(["cdk", "deploy", STACK_NAME, "--require-approval",
                "never", "--outputs-file", OUTPUTS_FILE])
    except subprocess.CalledProcessError as e:
        print("cdk deploy failed", e)
        sys.exit(1)

    # Read outputs file if present
    if os.path.exists(OUTPUTS_FILE):
        try:
            with open(OUTPUTS_FILE, "r") as f:
                data = json.load(f)
                print("CDK outputs (from file):")
                print(json.dumps(data, indent=2))
        except Exception:
            pass

    # Also query CloudFormation for outputs (more reliable)
    print("Querying CloudFormation for stack outputs...")
    cf = boto3.client('cloudformation', config=Config(
        retries={'max_attempts': 5}))
    try:
        resp = cf.describe_stacks(StackName=STACK_NAME)
        stacks = resp.get('Stacks', [])
        if not stacks:
            print(f"No stack found named {STACK_NAME}")
            return
        outputs = stacks[0].get('Outputs', [])
        if not outputs:
            print(
                "No outputs found for stack. Check the CloudFormation console or the CDK outputs.")
            return
        print("CloudFormation Outputs:")
        for out in outputs:
            print(f"- {out.get('OutputKey')}: {out.get('OutputValue')}")

    except Exception as e:
        print("Failed to read CloudFormation outputs:", e)


if __name__ == "__main__":
    main()
