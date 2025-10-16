# tools.py
def prioritize_patch(cve_info: str) -> dict:
    """Calculates a risk score for a patch based on CVE info."""
    print(f"TOOL: Prioritizing patch for '{cve_info}'...")
    if "critical" in cve_info.lower():
        return {"impact_score": 95, "urgency": "Immediate"}
    else:
        return {"impact_score": 40, "urgency": "Scheduled"}


def run_sandbox_test(patch_info: dict) -> dict:
    """Simulates running a sandbox test for a patch."""
    print(
        f"TOOL: Running sandbox test for patch with score {patch_info.get('impact_score')}...")
    import random
    if random.random() > 0.2:  # 80% chance of success
        return {"status": "PASS", "confidence": 98.5}
    else:
        return {"status": "FAIL", "reason": "Detected compatibility issue with db-cluster-01.prod"}
