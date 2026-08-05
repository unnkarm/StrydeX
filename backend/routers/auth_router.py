import logging
import os
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_reset_token,
    get_current_user,
    verify_reset_token,
)
from email_service import send_password_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


# ----------------------------
# Signup
# ----------------------------
@router.post("/signup", response_model=schemas.TokenResponse)
def signup(
    req: schemas.SignupRequest,
    db: Session = Depends(get_db),
):
    existing = (
        db.query(models.User)
        .filter(models.User.email == req.email)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    if req.role not in [r.value for r in models.Role]:
        raise HTTPException(
            status_code=400,
            detail="Invalid role",
        )

    user = models.User(
        email=req.email,
        hashed_password=hash_password(req.password),
        role=req.role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)

    return schemas.TokenResponse(
        access_token=token
    )


# ----------------------------
# Login (Swagger OAuth2 Compatible)
# ----------------------------
@router.post("/login", response_model=schemas.TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(models.User)
        .filter(models.User.email == form_data.username)
        .first()
    )

    if not user or not verify_password(
        form_data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    token = create_access_token(user.id)

    return schemas.TokenResponse(
        access_token=token
    )


# ----------------------------
# Forgot password
# ----------------------------
@router.post("/forgot-password", response_model=schemas.MessageResponse)
def forgot_password(
    req: schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.email == str(req.email)).first()

    if user:
        token = create_reset_token(user.id)
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
        reset_link = f"{frontend_url}/reset-password?{urlencode({'token': token})}"
        try:
            send_password_reset_email(user.email, reset_link)
        except Exception:
            # Keep the public response identical so this endpoint cannot be used
            # to discover which email addresses have accounts.
            logger.exception("Unable to send password reset email")

    return schemas.MessageResponse(
        message="If an account exists for that email, a reset link has been sent."
    )


# ----------------------------
# Reset password
# ----------------------------
@router.post("/reset-password", response_model=schemas.MessageResponse)
def reset_password(
    req: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    user_id = verify_reset_token(req.token)
    if user_id is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token",
        )

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token",
        )

    if not req.new_password:
        raise HTTPException(
            status_code=400,
            detail="Password cannot be empty",
        )

    user.hashed_password = hash_password(req.new_password)
    db.commit()

    return schemas.MessageResponse(message="Password updated successfully.")


# ----------------------------
# Current User
# ----------------------------
@router.get("/me", response_model=schemas.MeResponse)
def me(
    user: models.User = Depends(get_current_user),
):
    return schemas.MeResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        has_profile=user.athlete_profile is not None,
    )
