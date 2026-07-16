from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.assistant import AssistantAnswer, AssistantQuestion
from app.services.assistant import ask_business_question
from app.services.auth import get_current_owner

router = APIRouter(prefix="/assistant", tags=["Assistant"])


@router.post("/ask", response_model=AssistantAnswer)
def ask(data: AssistantQuestion, db: Session = Depends(get_db), _=Depends(get_current_owner)):
    if not data.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    try:
        answer = ask_business_question(db, data.question)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"AI assistant is temporarily unavailable: {exc}")
    return {"answer": answer}
