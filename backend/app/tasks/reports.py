from app.celery_app import celery_app
from app.database import SessionLocal
from app.services.reports import generate_and_send_report


def _run(report_type: str) -> None:
    db = SessionLocal()
    try:
        generate_and_send_report(db, report_type)
    finally:
        db.close()


@celery_app.task(name="app.tasks.reports.send_daily_report")
def send_daily_report() -> None:
    _run("daily")


@celery_app.task(name="app.tasks.reports.send_weekly_report")
def send_weekly_report() -> None:
    _run("weekly")


@celery_app.task(name="app.tasks.reports.send_monthly_report")
def send_monthly_report() -> None:
    _run("monthly")
