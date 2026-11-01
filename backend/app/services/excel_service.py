import os
import copy
from datetime import datetime, date, time
from typing import List, Dict, Any, Optional
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from app.config import settings

class ExcelService:
    def __init__(self, template_path: Optional[str] = None, output_dir: Optional[str] = None):
        self.template_path = template_path or settings.TEMPLATE_EXCEL_PATH
        self.output_dir = output_dir or settings.REPORT_STORAGE_DIR
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_report(
        self,
        issues: List[Dict[str, Any]],
        start_date: date,
        end_date: date,
        report_id: str,
        report_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate an Excel report workbook based on the template, populating both
        the Issue Tracker sheet and the Summary sheet with exact preserved formatting.
        """
        if not os.path.exists(self.template_path):
            raise FileNotFoundError(f"Template workbook not found at {self.template_path}")

        # Load reference template
        wb = openpyxl.load_workbook(self.template_path)
        
        # Verify sheets exist
        if "Summary" not in wb.sheetnames:
            raise ValueError("Template is missing required 'Summary' sheet")

        # Determine tracker sheet (find existing tracker sheet)
        tracker_sheet_name = None
        for name in wb.sheetnames:
            if "Issue Tracker" in name:
                tracker_sheet_name = name
                break
        
        if not tracker_sheet_name:
            tracker_sheet_name = wb.sheetnames[1] if len(wb.sheetnames) > 1 else "Issue Tracker"

        ws_tracker = wb[tracker_sheet_name]
        ws_summary = wb["Summary"]

        # Rename tracker sheet to reflect the reporting period if desired, e.g. 'Issue Tracker - 15th Sep'
        if start_date == end_date:
            day_str = start_date.strftime("%d")
            # suffix
            suffix = "th" if 11 <= int(day_str) <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(int(day_str) % 10, "th")
            month_str = start_date.strftime("%b")
            new_tracker_name = f"Issue Tracker - {int(day_str)}{suffix} {month_str}"
        else:
            new_tracker_name = f"Issue Tracker - {start_date.strftime('%d%b')}-{end_date.strftime('%d%b')}"
        
        ws_tracker.title = new_tracker_name

        # Sample style template from row 2
        template_row_cells = list(ws_tracker[2]) if ws_tracker.max_row >= 2 else []
        row_styles = []
        for cell in template_row_cells:
            row_styles.append({
                "font": copy.copy(cell.font) if cell.font else None,
                "border": copy.copy(cell.border) if cell.border else None,
                "fill": copy.copy(cell.fill) if cell.fill else None,
                "number_format": cell.number_format,
                "alignment": copy.copy(cell.alignment) if cell.alignment else None,
            })

        # Clear existing data rows in tracker sheet (row 2 and beyond)
        if ws_tracker.max_row > 1:
            ws_tracker.delete_rows(2, ws_tracker.max_row - 1)

        # Count categories for summary sheet
        category_counts: Dict[str, int] = {}

        # Populate rows
        for row_idx, item in enumerate(issues, start=2):
            iss_date = item.get("issue_date")
            if isinstance(iss_date, str):
                try:
                    iss_date = datetime.strptime(iss_date, "%Y-%m-%d").date()
                except Exception:
                    pass
            elif isinstance(iss_date, datetime):
                iss_date = iss_date.date()

            time_rec = item.get("time_received")
            if isinstance(time_rec, str):
                try:
                    time_rec = datetime.strptime(time_rec, "%H:%M:%S").time()
                except Exception:
                    try:
                        time_rec = datetime.strptime(time_rec, "%H:%M").time()
                    except Exception:
                        pass

            time_res = item.get("time_resolved")
            if isinstance(time_res, str):
                try:
                    time_res = datetime.strptime(time_res, "%H:%M:%S").time()
                except Exception:
                    try:
                        time_res = datetime.strptime(time_res, "%H:%M").time()
                    except Exception:
                        pass

            cat = item.get("type_of_issue", "eFeap Login Issue")
            category_counts[cat] = category_counts.get(cat, 0) + 1

            # Exact column order from template:
            # 1. Date
            # 2. User SR No
            # 3. Issue Raised by
            # 4. Application Name/Form Name
            # 5. Type of Issue
            # 6. Issue Details
            # 7. Resolution
            # 8. Time Received (with trailing space)
            # 9. Time Resolved
            # 10. Resolution by (IGA/eFEAP/User/BW)
            # 11. Socurce
            # 12. Resolved By
            # 13. None (blank column preserved)
            row_data = [
                iss_date,
                item.get("user_sr_no"),
                item.get("issue_raised_by"),
                item.get("application_name", "eFEAP Access"),
                cat,
                item.get("issue_details"),
                item.get("resolution"),
                time_rec,
                time_res,
                item.get("resolution_by", "IGA"),
                item.get("socurce", "Email"),
                item.get("resolved_by"),
                None
            ]

            ws_tracker.append(row_data)
            
            # Apply formatting to the newly appended row
            curr_row = ws_tracker[row_idx]
            for col_idx, cell in enumerate(curr_row):
                if col_idx < len(row_styles):
                    st = row_styles[col_idx]
                    if st["font"]: cell.font = copy.copy(st["font"])
                    if st["border"]: cell.border = copy.copy(st["border"])
                    if st["fill"]: cell.fill = copy.copy(st["fill"])
                    if st["number_format"]: cell.number_format = st["number_format"]
                    if st["alignment"]: cell.alignment = copy.copy(st["alignment"])

        # Update Summary Sheet
        # The summary sheet format:
        # Row 3: ['Row Labels', 'Count of Type of Issue']
        # Row 4..N: ['Category', count]
        # Row N+1: ['Grand Total', total]
        # Let's clean rows from row 4 onwards
        if ws_summary.max_row >= 4:
            ws_summary.delete_rows(4, ws_summary.max_row - 3)

        sorted_cats = sorted(category_counts.keys())
        total_issues = len(issues)

        # Style templates for summary
        header_font = Font(name="Calibri", size=11, bold=True)
        normal_font = Font(name="Calibri", size=11)
        thin_border = Border(
            left=Side(style='thin', color='D9D9D9'),
            right=Side(style='thin', color='D9D9D9'),
            top=Side(style='thin', color='D9D9D9'),
            bottom=Side(style='thin', color='D9D9D9')
        )

        curr_summary_row = 4
        for cat in sorted_cats:
            c1 = ws_summary.cell(curr_summary_row, 1, cat)
            c2 = ws_summary.cell(curr_summary_row, 2, category_counts[cat])
            c1.font = normal_font
            c2.font = normal_font
            c1.border = thin_border
            c2.border = thin_border
            curr_summary_row += 1

        # Grand Total row
        c_gt1 = ws_summary.cell(curr_summary_row, 1, "Grand Total")
        c_gt2 = ws_summary.cell(curr_summary_row, 2, total_issues)
        c_gt1.font = header_font
        c_gt2.font = header_font
        c_gt1.border = thin_border
        c_gt2.border = thin_border

        # Safe filename generation
        safe_date_part = start_date.strftime("%Y-%m-%d") if start_date == end_date else f"{start_date.strftime('%Y-%m-%d')}_to_{end_date.strftime('%Y-%m-%d')}"
        file_name = f"Issue_Tracker_{safe_date_part}_{report_id[:8]}.xlsx"
        file_path = os.path.join(self.output_dir, file_name)

        # Save generated report
        wb.save(file_path)

        # Reopen and validate workbook as mandated by requirements
        self.validate_generated_workbook(file_path, len(issues), category_counts)

        file_size = os.path.getsize(file_path)

        return {
            "file_path": file_path,
            "file_name": file_name,
            "file_size": file_size,
            "total_issues": total_issues,
            "category_counts": category_counts
        }

    def validate_generated_workbook(
        self,
        file_path: str,
        expected_rows: int,
        expected_counts: Dict[str, int]
    ) -> None:
        """
        Validate generated workbook by reopening and checking sheets, headers,
        and summary grand totals.
        """
        wb = openpyxl.load_workbook(file_path)
        if "Summary" not in wb.sheetnames:
            raise AssertionError("Validation failed: 'Summary' sheet missing in exported file")
        
        tracker_sheet = None
        for s in wb.sheetnames:
            if "Issue Tracker" in s:
                tracker_sheet = wb[s]
                break

        if not tracker_sheet:
            raise AssertionError("Validation failed: 'Issue Tracker' sheet missing in exported file")

        # Validate headers in tracker sheet
        headers = [c.value for c in tracker_sheet[1]]
        expected_first_col = "Date"
        expected_eighth_col = "Time Received "
        expected_eleventh_col = "Socurce"

        if headers[0] != expected_first_col:
            raise AssertionError(f"Validation failed: Col 1 should be '{expected_first_col}', got '{headers[0]}'")
        if headers[7] != expected_eighth_col:
            raise AssertionError(f"Validation failed: Col 8 should be '{expected_eighth_col}', got '{headers[7]}'")
        if headers[10] != expected_eleventh_col:
            raise AssertionError(f"Validation failed: Col 11 should be '{expected_eleventh_col}', got '{headers[10]}'")

        # Validate summary grand total
        ws_summary = wb["Summary"]
        gt_found = False
        for r in range(4, ws_summary.max_row + 1):
            if ws_summary.cell(r, 1).value == "Grand Total":
                gt_val = ws_summary.cell(r, 2).value
                if gt_val != expected_rows:
                    raise AssertionError(f"Validation failed: Grand total {gt_val} != expected {expected_rows}")
                gt_found = True
                break

        if expected_rows > 0 and not gt_found:
            raise AssertionError("Validation failed: Grand Total row not found in Summary sheet")

excel_service = ExcelService()
