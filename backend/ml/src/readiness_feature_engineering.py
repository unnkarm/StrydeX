import joblib
import pandas as pd
from pathlib import Path

from sklearn.model_selection import train_test_split

# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

PROCESSED_DIR = BASE_DIR / "datasets" / "processed"
ARTIFACTS_DIR = BASE_DIR / "artifacts"

ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

# --------------------------------------------------
# Load Dataset
# --------------------------------------------------

df = pd.read_csv(
    PROCESSED_DIR / "readiness_dataset.csv"
)

# --------------------------------------------------
# Create Readiness Score (0-100)
# --------------------------------------------------

sleep_score = (df["totalminutesasleep"] / 480 * 100).clip(0, 100)

activity_score = (df["veryactiveminutes"] / 30 * 100).clip(0, 100)

heart_score = (
    (100 - abs(df["avg_heart_rate"] - 70))
).clip(0, 100)

sedentary_penalty = (
    df["sedentaryminutes"] / 1000 * 20
).clip(0, 20)

df["readiness_score"] = (
    0.4 * sleep_score
    + 0.3 * activity_score
    + 0.3 * heart_score
    - sedentary_penalty
)

df["readiness_score"] = df["readiness_score"].clip(0, 100)

# --------------------------------------------------
# Features
# --------------------------------------------------

X = df[
    [
        "totalsteps",
        "calories",
        "veryactiveminutes",
        "fairlyactiveminutes",
        "lightlyactiveminutes",
        "sedentaryminutes",
        "totalminutesasleep",
        "totaltimeinbed",
        "avg_heart_rate",
    ]
]

y = df["readiness_score"]

# --------------------------------------------------
# Train/Test Split
# --------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
)

# --------------------------------------------------
# Save Dataset
# --------------------------------------------------

joblib.dump(
    {
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
    },
    ARTIFACTS_DIR / "readiness_dataset.joblib",
)

print("✅ Readiness feature engineering completed.")
print(f"Training samples: {len(X_train)}")
print(f"Testing samples: {len(X_test)}")
print(f"Target range: {y.min():.2f} - {y.max():.2f}")
