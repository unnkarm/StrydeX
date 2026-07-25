from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=schemas.TokenResponse)
def signup(req: schemas.SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if req.role not in [r.value for r in models.Role]:
        raise HTTPException(status_code=400, detail="Invalid role")

    user = models.User(email=req.email, hashed_password=hash_password(req.password), role=req.role)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return schemas.TokenResponse(access_token=token)


@router.post("/login", response_model=schemas.TokenResponse)
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.id)
    return schemas.TokenResponse(access_token=token)


@router.get("/me", response_model=schemas.MeResponse)
def me(user: models.User = Depends(get_current_user)):
    return schemas.MeResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        has_profile=user.athlete_profile is not None,
    )
