from aws_cdk import (
    Stack,
    aws_lambda as _lambda,
)
from constructs import Construct

class SuperHacksStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        ipo_agent_lambda = _lambda.Function(
            self, "IpoAgentFunction",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="agent.lambda_handler",  # we’ll define this below
            code=_lambda.Code.from_asset("../super-hacks"),
        )

        # The code that defines your stack goes here

        # example resource
        # queue = sqs.Queue(
        #     self, "SuperHacksQueue",
        #     visibility_timeout=Duration.seconds(300),
        # )
