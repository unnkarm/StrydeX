import joblib
import pandas as pd
from pathlib import Path

from sklearn.model_selection import GroupShuffleSplit

from readiness_scoring import calculate_readiness_score

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

df["readiness_score"] = df.apply(
    lambda row: calculate_readiness_score(
        total_minutes_asleep=row["totalminutesasleep"],
        very_active_minutes=row["veryactiveminutes"],
        average_heart_rate=row["avg_heart_rate"],
        sedentary_minutes=row["sedentaryminutes"],
    ),
    axis=1,
)

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

splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.2,
    random_state=42,
)
train_index, test_index = next(splitter.split(X, y, groups=df["id"]))
X_train = X.iloc[train_index]
X_test = X.iloc[test_index]
y_train = y.iloc[train_index]
y_test = y.iloc[test_index]

# --------------------------------------------------
# Save Dataset
# --------------------------------------------------

joblib.dump(
    {
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "split_strategy": "grouped_by_athlete",
    },
    ARTIFACTS_DIR / "readiness_dataset_v2.joblib",
)

print("✅ Readiness feature engineering completed.")
print(f"Training samples: {len(X_train)}")
print(f"Testing samples: {len(X_test)}")
print(f"Target range: {y.min():.2f} - {y.max():.2f}")
