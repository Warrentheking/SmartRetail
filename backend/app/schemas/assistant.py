from pydantic import BaseModel


class AssistantQuestion(BaseModel):
    question: str


class AssistantAnswer(BaseModel):
    answer: str
