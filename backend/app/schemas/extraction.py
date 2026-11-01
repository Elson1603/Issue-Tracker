from typing import Optional, List
from pydantic import BaseModel, Field

class ExtractedIssueSchema(BaseModel):
    issue_date: str = Field(default="", description="Original issue date in YYYY-MM-DD format")
    user_sr_no: Optional[str] = Field(default=None, description="Employee SR Number / User SR No if mentioned, or null")
    issue_raised_by: Optional[str] = Field(default=None, description="Name, designation, or branch email username of person who raised the issue")
    application_name: str = Field(default="eFEAP Access", description="Application or form name, e.g. 'eFEAP Access', 'IGA Portal'")
    type_of_issue: str = Field(
        default="eFeap Login Issue",
        description="Type of issue, standard categories: 'Transfer In', 'User ID locked', 'eFeap Login Issue', 'Mobile number update'"
    )
    issue_details: str = Field(default="", description="Summary of the specific issue or error message encountered")
    resolution: Optional[str] = Field(default=None, description="Action taken or resolution text e.g. 'TRANSFERIN', 'login issue resolved', 'User ID unlocked'")
    time_received: Optional[str] = Field(default=None, description="Time the original email/issue was received in HH:MM:SS format")
    time_resolved: Optional[str] = Field(default=None, description="Time resolution was sent in HH:MM:SS format, or null if unresolved")
    resolution_by: str = Field(default="IGA", description="Team resolving: IGA, eFEAP, User, or BW")
    socurce: str = Field(default="Email", description="Preserve exact column header spelling 'Email'")
    resolved_by: Optional[str] = Field(default=None, description="Name of support personnel who resolved or replied, e.g. 'Shruti', 'Bhumika T.', 'Dinesh Jadhav', 'Ritik Singh'")
    resolution_status: str = Field(
        default="open",
        description="Resolution status: 'resolved', 'open', 'in_progress', 'pending_confirmation', 'rejected'"
    )
    resolution_evidence: Optional[str] = Field(default=None, description="Quote or evidence from email conversation supporting the resolution status")
    confidence: float = Field(default=0.9, ge=0.0, le=1.0, description="Extraction confidence score from 0.0 to 1.0")
    needs_review: bool = Field(default=False, description="Flag true only if missing critical info or ambiguity")
    review_reason: Optional[str] = Field(default=None, description="Explanation for why review is required")

class ExtractionResultSchema(BaseModel):
    issues: List[ExtractedIssueSchema] = []
    thread_summary: Optional[str] = None
