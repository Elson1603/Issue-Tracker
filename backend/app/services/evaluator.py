import logging
from typing import Dict, Any, List
from app.services.email_provider import _get_reference_threads
from app.services.fireworks_extractor import fireworks_extractor

logger = logging.getLogger(__name__)

class ModelEvaluator:
    def __init__(self):
        self.ground_truth = {
            "thread_lic_331725_001": {
                "user_sr_no": "331725",
                "expected_categories": ["eFeap Login Issue", "Transfer In"],
                "expected_status": "pending_confirmation",
                "expected_resolved_by": "Bhumika T.",
                "expected_needs_review": True
            },
            "thread_lic_353862_002": {
                "user_sr_no": "353862",
                "expected_categories": ["Transfer In", "eFeap Login Issue", "User ID locked"],
                "expected_status": "resolved",
                "expected_resolved_by": "Shruti",
                "expected_needs_review": False
            },
            "thread_lic_700034_003": {
                "user_sr_no": "700034",
                "expected_categories": ["Transfer In"],
                "expected_status": "in_progress",
                "expected_resolved_by": "Shruti",
                "expected_needs_review": True
            }
        }

    async def run_evaluation(self) -> Dict[str, Any]:
        """
        Runs evaluation on the authentic reference examples from the prompt PDFs.
        Returns accuracy scores and detailed breakdown.
        """
        threads, _, _ = _get_reference_threads(None, None)
        total_tests = len(threads)
        sr_matches = 0
        cat_matches = 0
        status_matches = 0
        resolver_matches = 0
        review_matches = 0
        details = []

        for th in threads:
            th_id = th["provider_thread_id"]
            gt = self.ground_truth.get(th_id)
            if not gt:
                continue

            res = await fireworks_extractor.extract_from_thread(
                subject=th["subject"],
                messages=th["messages"],
                fallback_on_error=True
            )

            if not res.issues:
                details.append({
                    "thread_id": th_id,
                    "passed": False,
                    "error": "No issues extracted"
                })
                continue

            iss = res.issues[0]

            sr_pass = (iss.user_sr_no == gt["user_sr_no"])
            cat_pass = (iss.type_of_issue in gt["expected_categories"])
            status_pass = (iss.resolution_status == gt["expected_status"])
            resolver_pass = (iss.resolved_by == gt["expected_resolved_by"])
            review_pass = (iss.needs_review == gt["expected_needs_review"])

            if sr_pass: sr_matches += 1
            if cat_pass: cat_matches += 1
            if status_pass: status_matches += 1
            if resolver_pass: resolver_matches += 1
            if review_pass: review_matches += 1

            details.append({
                "thread_id": th_id,
                "user_sr_no": {"extracted": iss.user_sr_no, "expected": gt["user_sr_no"], "pass": sr_pass},
                "category": {"extracted": iss.type_of_issue, "expected": gt["expected_categories"], "pass": cat_pass},
                "status": {"extracted": iss.resolution_status, "expected": gt["expected_status"], "pass": status_pass},
                "resolved_by": {"extracted": iss.resolved_by, "expected": gt["expected_resolved_by"], "pass": resolver_pass},
                "needs_review": {"extracted": iss.needs_review, "expected": gt["expected_needs_review"], "pass": review_pass},
                "all_passed": all([sr_pass, cat_pass, status_pass, resolver_pass, review_pass])
            })

        return {
            "total_evaluated": total_tests,
            "sr_accuracy": sr_matches / total_tests,
            "category_accuracy": cat_matches / total_tests,
            "status_accuracy": status_matches / total_tests,
            "resolver_accuracy": resolver_matches / total_tests,
            "overall_accuracy": (sr_matches + cat_matches + status_matches + resolver_matches + review_matches) / (total_tests * 5),
            "details": details
        }

model_evaluator = ModelEvaluator()
