import sys
from pathlib import Path

# Add backend directory to path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models

client = TestClient(app)

# Create a test athlete in the db
db = SessionLocal()
try:
    # Clear existing if any
    db.query(models.User).filter(models.User.email == "test@strydex.com").delete()
    db.commit()

    # Add user
    user = models.User(email="test@strydex.com", hashed_password="hashed_password_placeholder", role="athlete")
    db.add(user)
    db.commit()
    db.refresh(user)

    # Add profile
    profile = models.AthleteProfile(
        user_id=user.id,
        username="unnkx",
        name="Unnita Roy",
        age=20,
        sport="Running",
        position="Sprinter",
        verified=True
    )
    db.add(profile)
    db.commit()
    print("Created athlete profile in DB successfully!")
except Exception as e:
    print("DB setup error:", e)
finally:
    db.close()

print("\nTesting GET /portfolio/unnkx:")
try:
    response = client.get("/portfolio/unnkx")
    print("Status Code:", response.status_code)
    print("Response JSON/Text:", response.text)
except Exception as e:
    import traceback
    traceback.print_exc()
