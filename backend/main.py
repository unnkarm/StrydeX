from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import Base, engine
import models  # noqa: F401 (ensures models are registered before create_all)
from routers import (
    analytics_router,
    athlete_router,
    auth_router,
    performance_router,
    portfolio_router,
    scout_router,
    video_router,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="StrydeX API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(athlete_router.router)
app.include_router(performance_router.router)
app.include_router(video_router.router)
app.include_router(portfolio_router.router)
app.include_router(scout_router.router)
app.include_router(analytics_router.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "StrydeX API"}
