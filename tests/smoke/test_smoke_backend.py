import types
import time
import sys
from unittest import mock

# Ensure project root is importable
import pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]

# Ensure project root is importable
ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))


def _mock_dynamodb_table(scan_items=None):
    class MockTable:
        def __init__(self, items):
            self._items = items or []

        def scan(self, **kwargs):
            return {"Items": self._items, "Count": len(self._items)}

        def update_item(self, **kwargs):
            # no-op for tests
            return {"ResponseMetadata": {"HTTPStatusCode": 200}}

    return MockTable(scan_items)


def test_import_and_run_tools():
    # Create a mock boto3 module and inject it into sys.modules before importing the package
    mock_boto_module = types.ModuleType("boto3")

    # Create mock bedrock client
    mock_bedrock = mock.Mock()
    mock_bedrock.converse.return_value = {
        "output": {
            "message": {
                "content": [
                    {"text": "Direct answer from model."}
                ]
            }
        }
    }

    # Create a DynamoDB resource factory that returns tables
    def _make_dynamodb_resource():
        class MockDynamoResource:
            def Table(self, name):
                return _mock_dynamodb_table([
                    {"patchId": "p-123", "severity": "CRITICAL"}
                ])

        return MockDynamoResource()

    mock_boto_module.resource = lambda *a, **k: _make_dynamodb_resource()
    mock_boto_module.client = lambda *a, **k: mock_bedrock

    # Insert mock boto3 so imports in modules use it at import time
    sys.modules["boto3"] = mock_boto_module

    # Import super_hacks.tools and super_hacks.agent (they will use the mocked boto3)
    import super_hacks.tools as tools_mod
    import super_hacks.agent as agent_mod

    # Call prioritize_patch (should use the mocked table and return a result)
    result = tools_mod.prioritize_patch("CVE-TEST")
    print("prioritize_patch returned:", result)

    # Call run_sandbox_test (will call update_item and sleep)
    # Patch the sleep used inside the tools module to avoid waiting
    with mock.patch("super_hacks.tools.time.sleep", return_value=None):
        sandbox_res = tools_mod.run_sandbox_test("p-123")
    print("run_sandbox_test returned:", sandbox_res)

    # Call the lambda handler with a body that triggers a direct model reply
    event = {"body": '{"prompt": "Hello"}'}
    resp = agent_mod.lambda_handler(event, None)
    print("lambda_handler returned status:", resp.get("statusCode"))
    assert resp.get("statusCode") == 200


if __name__ == "__main__":
    test_import_and_run_tools()
