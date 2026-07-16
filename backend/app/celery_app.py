import os

from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery("smartretail", broker=REDIS_URL, backend=REDIS_URL, include=["app.tasks.reports"])

celery_app.conf.timezone = "UTC"
celery_app.conf.beat_schedule = {
    "daily-report": {
        "task": "app.tasks.reports.send_daily_report",
        "schedule": crontab(hour=21, minute=0),
    },
    "weekly-report": {
        "task": "app.tasks.reports.send_weekly_report",
        "schedule": crontab(hour=20, minute=0, day_of_week=0),  # Sunday
    },
    "monthly-report": {
        "task": "app.tasks.reports.send_monthly_report",
        "schedule": crontab(hour=21, minute=0, day_of_month=1),
    },
}
