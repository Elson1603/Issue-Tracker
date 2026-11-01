import re
import json
import logging
from datetime import datetime, date, time
from typing import Optional, Dict, Any, List, Tuple
import httpx
from app.config import settings
from app.schemas.extraction import ExtractedIssueSchema, ExtractionResultSchema

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert enterprise issue extraction agent for the IGA Support Mailbox (Life Insurance Corporation).
Your task is to analyze complete support email threads and output a JSON object with an "issues" array.

Each item in "issues" MUST have these EXACT keys:
- "issue_date": YYYY-MM-DD (e.g. "2026-10-09")
- "user_sr_no": Employee 5-7 digit number e.g. "331725", "353862", "700034", or null
- "issue_raised_by": Sender name or branch code
- "application_name": "eFEAP Access"
- "type_of_issue": Must be one of ["Transfer In", "User ID locked", "eFeap Login Issue", "Mobile number update"]
- "issue_details": Summary of the problem or error message
- "resolution": Action taken (e.g. "TRANSFERIN", "User ID unlocked", "login issue resolved", or null)
- "time_received": Original message timestamp HH:MM:SS
- "time_resolved": Resolution message timestamp HH:MM:SS or null
- "resolution_by": "IGA"
- "socurce": "Email"
- "resolved_by": Support resolver name e.g. "Shruti", "Bhumika T.", "Dinesh Jadhav", "Ritik Singh", or null
- "resolution_status": "resolved", "open", "in_progress", or "pending_confirmation"
- "resolution_evidence": Quote from conversation supporting resolution status
- "needs_review": false
- "review_reason": null

CRITICAL INSTRUCTIONS:
1. "Transfer In": Used for employee branch location change, deputation, "not mapped to location", "not mapped to current location".
2. "User ID locked": Used for invalid credentials, ID locked, password issues.
3. "needs_review" MUST be false unless the SR number is completely missing.
4. Return ONLY valid JSON: {"issues": [...]}.
"""

class FireworksExtractor:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.FIREWORKS_API_KEY
        self.model = model or settings.FIREWORKS_MODEL
        self.base_url = settings.FIREWORKS_BASE_URL

    async def extract_from_thread(
        self,
        subject: str,
        messages: List[Dict[str, Any]],
        fallback_on_error: bool = True
    ) -> ExtractionResultSchema:
        """
        Extract issue details from an email thread.
        Uses Fireworks AI if API key is configured; otherwise uses deterministic parser
        or raises configuration error if strictly required.
        """
        if not self.api_key:
            logger.info("Fireworks API key not configured; using deterministic parsing.")
            return self.deterministic_extract(subject, messages)

        # Prepare thread context for AI
        thread_text = self._format_thread_for_ai(subject, messages)
        
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Extract issues from this email thread:\n\n{thread_text}"}
            ],
            "temperature": settings.FIREWORKS_TEMPERATURE,
            "max_tokens": settings.FIREWORKS_MAX_TOKENS,
            "response_format": {"type": "json_object"}
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                if response.status_code == 401 or response.status_code == 403:
                    raise ValueError(f"Fireworks AI authentication failed: invalid API key (HTTP {response.status_code})")
                elif response.status_code == 429:
                    raise RuntimeError("Fireworks AI rate limit reached. Please retry after some time.")
                elif response.status_code != 200:
                    raise RuntimeError(f"Fireworks AI request failed with HTTP {response.status_code}: {response.text}")

                res_data = response.json()
                content = res_data["choices"][0]["message"]["content"]
                
                # Parse JSON
                parsed_json = json.loads(content)
                
                # Handle cases where AI returns a single issue object or wrapped in 'issues'
                if "issues" in parsed_json and isinstance(parsed_json["issues"], list):
                    issues_list = parsed_json["issues"]
                elif isinstance(parsed_json, list):
                    issues_list = parsed_json
                else:
                    # Single object returned
                    issues_list = [parsed_json]

                validated_issues: List[ExtractedIssueSchema] = []
                for item in issues_list:
                    # Normalize field names from AI if aliases returned
                    if "category" in item and "type_of_issue" not in item:
                        item["type_of_issue"] = item["category"]
                    if "details" in item and "issue_details" not in item:
                        item["issue_details"] = item["details"]
                    if "date" in item and "issue_date" not in item:
                        item["issue_date"] = item["date"]
                    if not item.get("issue_date") and messages:
                        item["issue_date"] = messages[0].get("sent_at", "")[:10] if isinstance(messages[0].get("sent_at"), str) else "2026-10-09"
                    if not item.get("issue_details"):
                        item["issue_details"] = subject

                    item_validated = ExtractedIssueSchema(**item)
                    validated_issues.append(item_validated)

                return ExtractionResultSchema(
                    issues=validated_issues,
                    thread_summary=parsed_json.get("thread_summary")
                )

        except Exception as e:
            logger.error(f"Fireworks AI extraction error: {e}")
            if not fallback_on_error:
                raise
            # Fallback to deterministic extraction
            det_result = self.deterministic_extract(subject, messages)
            for iss in det_result.issues:
                iss.review_reason = f"AI fallback used due to: {str(e)[:100]}"
                iss.needs_review = True
            return det_result

    def _format_thread_for_ai(self, subject: str, messages: List[Dict[str, Any]]) -> str:
        lines = [f"SUBJECT: {subject}", "=" * 50]
        for idx, msg in enumerate(messages):
            sender = msg.get("sender", "Unknown")
            sent_at = msg.get("sent_at", "")
            body = msg.get("body_text", "")
            lines.append(f"MESSAGE #{idx+1} | From: {sender} | Sent: {sent_at}")
            lines.append(body)
            lines.append("-" * 40)
        return "\n".join(lines)

    def deterministic_extract(self, subject: str, messages: List[Dict[str, Any]]) -> ExtractionResultSchema:
        """
        High precision deterministic extractor for IGA email threads.
        """
        full_text = f"{subject}\n" + "\n".join([m.get("body_text", "") for m in messages])
        
        # 1. Extract SR Numbers
        # Matches "SR. No-331725", "SR NO. 353862", "S R No.- 700034", "Sr.No.349978", "user 252509", "User SR no is 700034"
        sr_matches = re.findall(r'(?:SR\.?\s*(?:NO|No|no)?[\.\-\:\s]*(?:is\s*)?|user\s+|Shri\s+[A-Za-z\s]+S\s*R\s*No[\.\-\s]*)([0-9]{5,7})', full_text, re.IGNORECASE)
        # Also check for bracketed SR e.g. (707782)
        if not sr_matches:
            sr_matches = re.findall(r'\(([0-9]{6})\)', full_text)
        
        user_sr_no = sr_matches[0] if sr_matches else None
        
        # 2. Extract issue raised by / requester
        issue_raised_by = None
        for msg in reversed(messages):
            # Check original sender or from header
            body = msg.get("body_text", "")
            sender = msg.get("sender", "")
            from_match = re.search(r'From:\s*([^\n\r]+)', body)
            if from_match:
                issue_raised_by = from_match.group(1).strip()
                break
            elif sender and not any(k in sender.lower() for k in ["iga_support", "iga_admin"]):
                issue_raised_by = sender
                break

        if not issue_raised_by and messages:
            issue_raised_by = messages[0].get("sender", "Support User")
            
        # Clean email brackets if any
        if issue_raised_by and "<" in issue_raised_by:
            issue_raised_by = issue_raised_by.split("<")[0].strip()

        # 3. Categorize Issue Type
        lower_text = full_text.lower()
        if "mobile number" in lower_text or "mobile no" in lower_text:
            type_of_issue = "Mobile number update"
        elif any(k in lower_text for k in [
            "transfer in", "transfer-in", "change of location", "change primary location",
            "not mapped to current location", "not mapped to the location", "not mapped to this location",
            "return to primary", "deputation", "transfer out"
        ]):
            type_of_issue = "Transfer In"
        elif any(k in lower_text for k in [
            "invalid credentials", "user id locked", "user is locked", "password expired",
            "change of password", "unable to login after leave", "credentials"
        ]):
            type_of_issue = "User ID locked"
        elif any(k in lower_text for k in ["login", "efeap access", "error message displayed", "special access form"]):
            type_of_issue = "eFeap Login Issue"
        else:
            type_of_issue = "eFeap Login Issue"

        # 4. Extract Timestamps (received and resolved)
        time_received = None
        time_resolved = None
        issue_date_str = None

        # Look for earliest sent_at for time_received
        for msg in messages:
            sent_at = msg.get("sent_at")
            if sent_at:
                if isinstance(sent_at, str):
                    try:
                        dt = datetime.fromisoformat(sent_at)
                        if not time_received or dt.time() < time_received:
                            time_received = dt.time()
                            issue_date_str = dt.strftime("%Y-%m-%d")
                    except Exception:
                        pass
                elif isinstance(sent_at, datetime):
                    if not time_received or sent_at.time() < time_received:
                        time_received = sent_at.time()
                        issue_date_str = sent_at.strftime("%Y-%m-%d")

        # Parse text timestamps if headers missed it
        if not time_received:
            time_match = re.search(r'(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)', full_text)
            if time_match:
                t_str = time_match.group(1).strip()
                try:
                    t_parsed = datetime.strptime(t_str, "%I:%M %p").time()
                    time_received = t_parsed
                except Exception:
                    pass

        # 5. Resolution Assessment
        resolution_status = "open"
        resolution = None
        resolution_evidence = None
        resolved_by = None
        resolution_by = "IGA"
        needs_review = False
        review_reason = None

        # Check support replies
        support_msgs = [
            m for m in messages 
            if any(k in str(m.get("sender", "")).lower() for k in ["iga_support", "iga_admin", "shruti", "bhumika", "dinesh", "ritik"])
            or "iga_support" in str(m.get("body_text", "")).lower()
        ]

        if support_msgs:
            last_support_msg = support_msgs[-1]
            last_body = last_support_msg.get("body_text", "")
            
            # Detect support staff name
            for name in ["Bhumika T.", "Shruti", "Dinesh Jadhav", "Ritik Singh", "Faisal Khan"]:
                if name.lower() in last_body.lower() or name.lower() in str(last_support_msg.get("sender", "")).lower():
                    resolved_by = name
                    break

            # Time resolved from last support message
            last_sent = last_support_msg.get("sent_at")
            if last_sent:
                if isinstance(last_sent, str):
                    try:
                        time_resolved = datetime.fromisoformat(last_sent).time()
                    except Exception:
                        pass
                elif isinstance(last_sent, datetime):
                    time_resolved = last_sent.time()

            # Rule: check if resolved or instructions or pending confirmation
            if "successfully processed" in last_body.lower() or "transferin" in last_body.lower() or "has been processed" in last_body.lower():
                resolution_status = "resolved"
                if type_of_issue == "Transfer In":
                    resolution = "TRANSFERIN"
                elif type_of_issue == "User ID locked":
                    resolution = "User ID unlocked"
                elif type_of_issue == "Mobile number update":
                    resolution = "Mobile number updated"
                else:
                    resolution = "login issue resolved"
                resolution_evidence = f"Support confirmed action taken: '{last_body.strip()[:150]}'"
            elif "kindly check now and confirm" in last_body.lower() or "check and confirm" in last_body.lower():
                # Acknowledged/Action taken but requires user confirmation
                resolution_status = "pending_confirmation"
                resolution = "Pending confirmation from user"
                resolution_evidence = f"Support asked user to verify: '{last_body.strip()[:150]}'"
                needs_review = True
                review_reason = "Support requested user confirmation; completion not independently verified."
            elif any(k in last_body.lower() for k in ["kindly use", "please use", "return to primary", "raise request"]):
                resolution_status = "in_progress"
                resolution = "Instructions provided to user"
                resolution_evidence = f"Workaround/instruction given: '{last_body.strip()[:150]}'"
                needs_review = True
                review_reason = "Support provided instructions but issue resolution has not been confirmed."
            elif "confirm user srno" in last_body.lower() or "provide sr no" in last_body.lower():
                resolution_status = "in_progress"
                resolution = "Awaiting required employee details"
                needs_review = True
                review_reason = "Support requested user SR number; awaiting reply."
            else:
                resolution_status = "in_progress"
                resolution = "Support reply in progress"
                needs_review = True
                review_reason = "Support responded but status is ambiguous."

        if not user_sr_no:
            needs_review = True
            review_reason = "Missing User SR No; human review required"

        # Issue Details summary
        # Strip long quoted text or signatures
        clean_details = full_text[:400].replace("\r", " ").replace("\n", " ").strip()
        # Fallback date if not detected
        if not issue_date_str:
            issue_date_str = date.today().strftime("%Y-%m-%d")

        issue = ExtractedIssueSchema(
            issue_date=issue_date_str,
            user_sr_no=user_sr_no,
            issue_raised_by=issue_raised_by[:100] if issue_raised_by else "Unknown",
            application_name="eFEAP Access",
            type_of_issue=type_of_issue,
            issue_details=clean_details,
            resolution=resolution,
            time_received=time_received.strftime("%H:%M:%S") if time_received else "10:00:00",
            time_resolved=time_resolved.strftime("%H:%M:%S") if time_resolved else None,
            resolution_by=resolution_by,
            socurce="Email",
            resolved_by=resolved_by,
            resolution_status=resolution_status,
            resolution_evidence=resolution_evidence,
            confidence=0.95 if (user_sr_no and resolution_status == "resolved") else 0.75,
            needs_review=needs_review,
            review_reason=review_reason
        )

        return ExtractionResultSchema(issues=[issue], thread_summary=subject)

fireworks_extractor = FireworksExtractor()
