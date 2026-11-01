import logging
from datetime import datetime, date
from typing import Optional, Dict, Any, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import SyncJob, EmailThread, EmailMessage, Issue, EmailProviderConfig
from app.services.email_provider import GmailAdapter, MS365Adapter, BaseEmailProvider
from app.services.fireworks_extractor import fireworks_extractor

logger = logging.getLogger(__name__)

class SyncService:
    def _get_provider_adapter(self, provider_name: str, config: Optional[EmailProviderConfig] = None) -> BaseEmailProvider:
        if provider_name == "microsoft365":
            return MS365Adapter(
                client_id=config.client_id if config else None,
                client_secret=config.client_secret if config else None,
                tenant_id=config.tenant_id if config else None,
                refresh_token=config.refresh_token if config else None,
                access_token=config.access_token if config else None
            )
        else:
            return GmailAdapter(
                client_id=config.client_id if config else None,
                client_secret=config.client_secret if config else None,
                refresh_token=config.refresh_token if config else None,
                access_token=config.access_token if config else None
            )

    async def execute_sync_job(
        self,
        db: AsyncSession,
        job_id: str
    ) -> SyncJob:
        """
        Runs the persistent sync job, extracting issues and writing to PostgreSQL.
        """
        job = await db.get(SyncJob, job_id)
        if not job:
            raise ValueError(f"SyncJob with ID {job_id} not found")

        job.status = "running"
        job.started_at = datetime.utcnow()
        job.log_events.append({
            "timestamp": datetime.utcnow().isoformat(),
            "level": "INFO",
            "message": f"Sync job started for provider '{job.provider}', range: {job.start_date} to {job.end_date}"
        })
        await db.commit()

        # Load provider configuration from database if exists
        cfg_res = await db.execute(
            select(EmailProviderConfig).where(EmailProviderConfig.provider == job.provider)
        )
        provider_config = cfg_res.scalars().first()

        adapter = self._get_provider_adapter(job.provider, provider_config)

        try:
            # Fetch threads from provider
            threads, next_checkpoint, skipped_items = await adapter.fetch_threads(
                start_date=job.start_date,
                end_date=job.end_date,
                checkpoint=provider_config.sync_checkpoint if provider_config else None,
                folder_filter=provider_config.folder_filter if provider_config else "INBOX",
                subject_filter=provider_config.subject_filter if provider_config else None
            )

            job.total_found = len(threads)
            job.skipped_count = len(skipped_items)

            for skipped in skipped_items:
                job.log_events.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "level": "WARN",
                    "message": f"Skipped thread: {skipped.get('reason')}"
                })

            newly_tracked = 0
            processed = 0
            failed = 0

            for th_data in threads:
                try:
                    # 1. Upsert EmailThread
                    p_thread_id = th_data["provider_thread_id"]
                    th_res = await db.execute(
                        select(EmailThread).where(
                            and_(
                                EmailThread.provider == job.provider,
                                EmailThread.provider_thread_id == p_thread_id
                            )
                        )
                    )
                    db_thread = th_res.scalars().first()
                    
                    msgs = th_data.get("messages", [])
                    first_dt = msgs[0].get("sent_at") if msgs else datetime.utcnow()
                    last_dt = msgs[-1].get("sent_at") if msgs else datetime.utcnow()

                    if not db_thread:
                        db_thread = EmailThread(
                            provider=job.provider,
                            provider_thread_id=p_thread_id,
                            subject=th_data.get("subject", "No Subject"),
                            snippet=th_data.get("snippet", ""),
                            message_count=len(msgs),
                            first_message_at=first_dt,
                            last_message_at=last_dt
                        )
                        db.add(db_thread)
                        await db.flush()
                    else:
                        db_thread.message_count = len(msgs)
                        db_thread.last_message_at = last_dt
                        await db.flush()

                    # 2. Upsert EmailMessages
                    first_msg_id = None
                    for idx, msg in enumerate(msgs):
                        p_msg_id = msg.get("provider_message_id", f"{p_thread_id}_{idx}")
                        m_res = await db.execute(
                            select(EmailMessage).where(EmailMessage.provider_message_id == p_msg_id)
                        )
                        db_msg = m_res.scalars().first()
                        if not db_msg:
                            db_msg = EmailMessage(
                                thread_id=db_thread.id,
                                provider_message_id=p_msg_id,
                                sender=msg.get("sender"),
                                sent_at=msg.get("sent_at", datetime.utcnow()),
                                subject=msg.get("subject", db_thread.subject),
                                body_text=msg.get("body_text", ""),
                                is_original_issue=(idx == 0)
                            )
                            db.add(db_msg)
                            await db.flush()
                        if idx == 0:
                            first_msg_id = db_msg.id

                    # 3. AI Extraction with Fireworks / Deterministic engine
                    extraction = await fireworks_extractor.extract_from_thread(
                        subject=db_thread.subject,
                        messages=msgs
                    )

                    for ext_iss in extraction.issues:
                        # Parse dates and times
                        iss_date = date.fromisoformat(ext_iss.issue_date) if ext_iss.issue_date else date.today()
                        t_rec = datetime.strptime(ext_iss.time_received, "%H:%M:%S").time() if ext_iss.time_received else None
                        t_res = datetime.strptime(ext_iss.time_resolved, "%H:%M:%S").time() if ext_iss.time_resolved else None

                        # Check for existing issue by SR number and date to prevent duplicate ingestion
                        existing_issue = None
                        if ext_iss.user_sr_no:
                            iss_chk = await db.execute(
                                select(Issue).where(
                                    and_(
                                        Issue.user_sr_no == ext_iss.user_sr_no,
                                        Issue.issue_date == iss_date
                                    )
                                )
                            )
                            existing_issue = iss_chk.scalars().first()

                        if existing_issue:
                            # Update existing issue if resolution has progressed
                            if ext_iss.resolution and not existing_issue.resolution:
                                existing_issue.resolution = ext_iss.resolution
                                existing_issue.resolution_status = ext_iss.resolution_status
                                existing_issue.time_resolved = t_res
                                existing_issue.resolved_by = ext_iss.resolved_by
                                existing_issue.resolution_evidence = ext_iss.resolution_evidence
                                existing_issue.needs_review = ext_iss.needs_review
                                existing_issue.review_reason = ext_iss.review_reason
                            processed += 1
                        else:
                            new_issue = Issue(
                                thread_id=db_thread.id,
                                source_message_id=first_msg_id,
                                issue_date=iss_date,
                                user_sr_no=ext_iss.user_sr_no,
                                issue_raised_by=ext_iss.issue_raised_by,
                                application_name=ext_iss.application_name,
                                type_of_issue=ext_iss.type_of_issue,
                                issue_details=ext_iss.issue_details,
                                resolution=ext_iss.resolution,
                                time_received=t_rec,
                                time_resolved=t_res,
                                resolution_by=ext_iss.resolution_by,
                                socurce="Email",
                                resolved_by=ext_iss.resolved_by,
                                resolution_status=ext_iss.resolution_status,
                                resolution_evidence=ext_iss.resolution_evidence,
                                confidence=ext_iss.confidence,
                                needs_review=ext_iss.needs_review,
                                review_reason=ext_iss.review_reason,
                                extraction_status="completed",
                                ai_model=fireworks_extractor.model if fireworks_extractor.api_key else "deterministic_qwen_aligned"
                            )
                            db.add(new_issue)
                            newly_tracked += 1
                            processed += 1

                    await db.flush()

                except Exception as ex:
                    failed += 1
                    logger.error(f"Failed processing thread {th_data.get('provider_thread_id')}: {ex}")
                    job.log_events.append({
                        "timestamp": datetime.utcnow().isoformat(),
                        "level": "ERROR",
                        "message": f"Failed thread '{th_data.get('subject')}': {str(ex)}"
                    })

            job.processed_count = processed
            job.newly_tracked_count = newly_tracked
            job.failed_count = failed
            job.completed_at = datetime.utcnow()
            
            if failed == 0:
                job.status = "completed"
            elif processed > 0:
                job.status = "partially_completed"
            else:
                job.status = "failed"
                job.error_message = "All fetched items failed extraction."

            # Update provider checkpoint
            if provider_config and next_checkpoint:
                provider_config.sync_checkpoint = next_checkpoint
                provider_config.last_synced_at = datetime.utcnow()

            job.log_events.append({
                "timestamp": datetime.utcnow().isoformat(),
                "level": "INFO",
                "message": f"Job finished. Processed: {processed}, Newly tracked: {newly_tracked}, Failed: {failed}"
            })
            await db.commit()
            await db.refresh(job)
            return job

        except Exception as e:
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            job.log_events.append({
                "timestamp": datetime.utcnow().isoformat(),
                "level": "ERROR",
                "message": f"Job terminated with error: {str(e)}"
            })
            await db.commit()
            await db.refresh(job)
            return job

sync_service = SyncService()
