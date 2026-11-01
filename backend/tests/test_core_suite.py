import pytest
import asyncio
from datetime import date, time
from app.services.fireworks_extractor import fireworks_extractor
from app.services.excel_service import excel_service
from app.services.storage_service import storage_service
from app.services.evaluator import model_evaluator

# Test 1: New eFEAP Access issue extraction
@pytest.mark.asyncio
async def test_efeap_access_issue_extraction():
    subject = "Problem in request for eFeap Access in IGA Portal - Nilamadhab Ghadei, SR. No-331725"
    messages = [
        {
            "sender": "Nilamadhab Ghadei <nilamadhab.ghadei@licindia.com>",
            "body_text": "When we tried to apply for eFEAP access through IGA portal, error message displayed. SR. NO. 331725, DO CODE 058",
            "sent_at": "2026-10-09T12:32:00"
        }
    ]
    res = await fireworks_extractor.extract_from_thread(subject, messages)
    assert len(res.issues) > 0
    iss = res.issues[0]
    assert iss.user_sr_no == "331725"
    assert iss.application_name == "eFEAP Access"

# Test 2: User not mapped to location (Transfer In category)
@pytest.mark.asyncio
async def test_not_mapped_to_location_category():
    subject = "Reg :- Error message appears during giving access through IGA portal"
    messages = [
        {
            "sender": "bo_351 <bo_351@licindia.com>",
            "body_text": "While giving access to Shri Anandi lal raikwar S R No.- 700034, Error appears: User is not mapped to current location.",
            "sent_at": "2026-10-09T10:32:00"
        }
    ]
    res = await fireworks_extractor.extract_from_thread(subject, messages)
    assert len(res.issues) > 0
    iss = res.issues[0]
    assert iss.user_sr_no == "700034"
    assert iss.type_of_issue == "Transfer In"

# Test 3: Password / Access issue with confirmed successful resolution
@pytest.mark.asyncio
async def test_confirmed_successful_resolution():
    subject = "Re:Module password problem - GOPAL MODAK (Sr.No.353862)"
    messages = [
        {
            "sender": "GOPAL MODAK <gopal.modak@licindia.com>",
            "body_text": "Please see attachment. Gopal Modak, SR NO-353862",
            "sent_at": "2026-10-09T12:36:00"
        },
        {
            "sender": "iga_support <iga_support@licindia.com>",
            "body_text": "A request was successfully processed at 12:22 PM. Kindly check and confirm.\nRegards, Shruti",
            "sent_at": "2026-10-09T15:52:00"
        }
    ]
    res = await fireworks_extractor.extract_from_thread(subject, messages)
    assert len(res.issues) > 0
    iss = res.issues[0]
    assert iss.user_sr_no == "353862"
    assert iss.resolution_status == "resolved"
    assert iss.resolved_by == "Shruti"

# Test 4: Support reply containing instructions but no confirmed resolution
@pytest.mark.asyncio
async def test_instructions_not_marked_resolved():
    subject = "Re: Reg :- Error message appears during giving access through IGA portal"
    messages = [
        {
            "sender": "bo_351 <bo_351@licindia.com>",
            "body_text": "User is not mapped to current location. S R No.- 700034",
            "sent_at": "2026-10-09T10:32:00"
        },
        {
            "sender": "iga_support <iga_support@licindia.com>",
            "body_text": "Kindly use 'return to primary'. Further make it approve, than raise request for satellite again.\nRegards, Shruti",
            "sent_at": "2026-10-09T15:57:00"
        }
    ]
    res = await fireworks_extractor.extract_from_thread(subject, messages)
    assert len(res.issues) > 0
    iss = res.issues[0]
    assert iss.resolution_status != "resolved"
    assert iss.needs_review is True

# Test 5: Multi-reply conversation
@pytest.mark.asyncio
async def test_multi_reply_conversation():
    subject = "Re: Reg :- Error message"
    messages = [
        {"sender": "user", "body_text": "Problem in access", "sent_at": "2026-10-09T10:00:00"},
        {"sender": "iga_support", "body_text": "Kindly confirm user srno. Bhumika T.", "sent_at": "2026-10-09T13:12:00"},
        {"sender": "user", "body_text": "User SR no is 700034.", "sent_at": "2026-10-09T13:17:00"},
        {"sender": "iga_support", "body_text": "Kindly use return to primary. Shruti", "sent_at": "2026-10-09T15:57:00"}
    ]
    res = await fireworks_extractor.extract_from_thread(subject, messages)
    assert len(res.issues) > 0
    iss = res.issues[0]
    assert iss.user_sr_no == "700034"

# Test 6: Missing SR Number triggers human review
@pytest.mark.asyncio
async def test_missing_sr_number_triggers_review():
    subject = "Login access problem"
    messages = [
        {"sender": "user@licindia.com", "body_text": "Unable to log in to eFeap portal. Please help.", "sent_at": "2026-10-09T10:00:00"}
    ]
    res = await fireworks_extractor.extract_from_thread(subject, messages)
    iss = res.issues[0]
    assert iss.user_sr_no is None
    assert iss.needs_review is True

# Test 7: Excel single-day report generation & template validation
def test_excel_single_day_report():
    sample_issues = [
        {
            "issue_date": date(2026, 9, 15),
            "user_sr_no": "103027",
            "issue_raised_by": "bo_67E",
            "application_name": "eFEAP Access",
            "type_of_issue": "Transfer In",
            "issue_details": "Password expired and transfer in required",
            "resolution": "TRANSFERIN",
            "time_received": time(10, 28),
            "time_resolved": time(11, 15),
            "resolution_by": "IGA",
            "socurce": "Email",
            "resolved_by": "Dinesh Jadhav"
        }
    ]
    result = excel_service.generate_report(
        issues=sample_issues,
        start_date=date(2026, 9, 15),
        end_date=date(2026, 9, 15),
        report_id="test_single_day_01"
    )
    assert result["total_issues"] == 1
    assert result["category_counts"]["Transfer In"] == 1

# Test 8: Excel multi-day report generation
def test_excel_multi_day_report():
    sample_issues = [
        {
            "issue_date": date(2026, 9, 15),
            "user_sr_no": "103027",
            "type_of_issue": "Transfer In",
            "issue_details": "Issue 1",
            "resolution": "TRANSFERIN",
            "time_received": time(10, 0),
            "time_resolved": time(11, 0),
            "resolution_by": "IGA",
            "socurce": "Email",
            "resolved_by": "Dinesh Jadhav"
        },
        {
            "issue_date": date(2026, 9, 16),
            "user_sr_no": "349978",
            "type_of_issue": "User ID locked",
            "issue_details": "Issue 2",
            "resolution": "login issue resolved",
            "time_received": time(11, 0),
            "time_resolved": time(12, 0),
            "resolution_by": "IGA",
            "socurce": "Email",
            "resolved_by": "Ritik Singh"
        }
    ]
    result = excel_service.generate_report(
        issues=sample_issues,
        start_date=date(2026, 9, 15),
        end_date=date(2026, 9, 16),
        report_id="test_multi_day_02"
    )
    assert result["total_issues"] == 2
    assert result["category_counts"]["Transfer In"] == 1
    assert result["category_counts"]["User ID locked"] == 1

# Test 9: Storage deletion preserves non-report records
def test_storage_deletion():
    # Calling delete on a non-existent file or safe delete
    deleted = storage_service.delete_report_file("non_existent_safe_test.xlsx")
    assert deleted is True

# Test 10: PDF Reference Model Evaluation Benchmark
@pytest.mark.asyncio
async def test_reference_model_evaluation():
    eval_result = await model_evaluator.run_evaluation()
    assert eval_result["total_evaluated"] == 3
    assert eval_result["sr_accuracy"] == 1.0
    assert eval_result["overall_accuracy"] >= 0.8

