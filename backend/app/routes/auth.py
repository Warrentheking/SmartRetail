from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserLogin, UserCreate, UserUpdate, UserResponse, Token
from app.services.auth import hash_password, verify_password, create_access_token, get_current_user, get_current_owner

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    token = create_access_token(data={
        "sub": str(user.user_id),
        "role": user.role,
        "name": user.name
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "user_id": user.user_id
    }

@router.post("/create-user", response_model=UserResponse)
def create_user(user_data: UserCreate, db: Session = Depends(get_db), _: User = Depends(get_current_owner)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), _=Depends(get_current_owner)):
    return db.query(User).order_by(User.role, User.name).all()


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int, data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_owner)
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.email and data.email != user.email:
        existing = db.query(User).filter(User.email == data.email, User.user_id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = data.email

    if data.role and data.role != user.role:
        if user.role == "owner" and data.role != "owner":
            owner_count = db.query(func.count(User.user_id)).filter(User.role == "owner").scalar()
            if owner_count <= 1:
                raise HTTPException(status_code=400, detail="Cannot demote the last owner account")
        user.role = data.role

    if data.name:
        user.name = data.name

    if data.password:
        user.password_hash = hash_password(data.password)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_owner)):
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="You cannot remove your own account")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == "owner":
        owner_count = db.query(func.count(User.user_id)).filter(User.role == "owner").scalar()
        if owner_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last owner account")

    try:
        db.delete(user)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="This account has associated records (e.g. sales they voided) and can't be removed.",
        )
    return {"message": "User removed"}