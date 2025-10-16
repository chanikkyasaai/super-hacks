# agent.py
from tools import prioritize_patch, run_sandbox_test

SYSTEM_PROMPT = """
You are the Intelligent Patch Orchestrator (IPO), an autonomous AI agent for IT management.
Your goal is to automate the patch management lifecycle to improve operational efficiency and reduce risk.
"""


def lambda_handler(event, context):
    user_input = event.get("prompt", "No input provided.")
    ipo_agent(user_input)
    return {"status": "completed", "input": user_input}


def ipo_agent(user_input: str):
    print(f"\n[IPO Agent Thinking] Processing: {user_input}")

    # Step 1: Prioritize the patch
    patch_priority = prioritize_patch(user_input)
    print(f"Result: {patch_priority}")

    # Step 2: Decide if urgent
    if patch_priority["urgency"] == "Immediate":
        print("Urgent patch detected — running sandbox test...")
        sandbox_result = run_sandbox_test(patch_priority)
        print(f"Sandbox result: {sandbox_result}")

        # Step 3: Make final decision
        if sandbox_result["status"] == "PASS":
            print("✅ Patch passed sandbox test. Proceeding with deployment.")
        else:
            print(
                f"⚠️ Patch failed sandbox test. Flagging for manual review: {sandbox_result.get('reason')}")
    else:
        print("Non-critical patch — scheduled for normal rollout.")


if __name__ == "__main__":
    print("IPO Agent (Local Mock) Initialized. Type 'exit' to quit.\n")
    while True:
        user_input = input("> ")
        if user_input.lower() == "exit":
            break
        ipo_agent(user_input)
