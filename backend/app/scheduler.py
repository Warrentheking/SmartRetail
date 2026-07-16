import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import SessionLocal
from app.services.reports import generate_and_send_report

logger = logging.getLogger("smartretail.scheduler")

scheduler = BackgroundScheduler(timezone="UTC")


def _run_report(report_type: str) -> None:
    db = SessionLocal()
    try:
        generate_and_send_report(db, report_type)
        logger.info("Scheduled %s report sent", report_type)
    except Exception:
        logger.exception("Scheduled %s report failed", report_type)
    finally:
        db.close()


def start_scheduler() -> None:
    """Runs the daily/weekly/monthly report jobs in-process, matching the
    schedule from the original Celery beat config - no Redis/Docker needed,
    since this just runs a background thread inside the FastAPI process."""
    scheduler.add_job(
        _run_report, CronTrigger(hour=21, minute=0), args=["daily"],
        id="daily-report", replace_existing=True,
    )
    scheduler.add_job(
        _run_report, CronTrigger(day_of_week="sun", hour=20, minute=0), args=["weekly"],
        id="weekly-report", replace_existing=True,
    )
    scheduler.add_job(
        _run_report, CronTrigger(day=1, hour=21, minute=0), args=["monthly"],
        id="monthly-report", replace_existing=True,
    )
    scheduler.start()
    logger.info("Report scheduler started (daily 21:00 UTC, weekly Sun 20:00 UTC, monthly 1st 21:00 UTC)")
