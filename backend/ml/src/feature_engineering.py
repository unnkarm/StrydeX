import joblib
import pandas as pd
from pathlib import Path

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.model_selection import GroupShuffleSplit

# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

PROCESSED_DIR = BASE_DIR / "datasets" / "processed"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
ENCODER_DIR = ARTIFACTS_DIR / "encoders"

# Create folders
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
ENCODER_DIR.mkdir(parents=True, exist_ok=True)

# --------------------------------------------------
# Load Dataset
# --------------------------------------------------

performance_df = pd.read_csv(
    PROCESSED_DIR / "sports_performance_data.csv"
)

# --------------------------------------------------
# Select Features
# --------------------------------------------------

X = performance_df[
    [
        "sport_type",
        "event",
        "training_hours_per_week",
        "average_heart_rate",
        "bmi",
        "sleep_hours_per_night",
        "daily_caloric_intake",
        "hydration_level",
        "injury_history",
        "previous_competition_performance",
        "training_intensity",
        "resting_heart_rate",
        "body_fat_percentage",
        "vo2_max",
        "event_distance",
        "altitude_training",
        "mental_focus_level",
    ]
]

y = performance_df["performance_metric"]

# --------------------------------------------------
# Preprocessing
# --------------------------------------------------

categorical_features = [
    "sport_type",
    "event",
    "injury_history",
    "altitude_training",
    "training_intensity",
    "mental_focus_level",
]

numeric_features = [
    "training_hours_per_week",
    "average_heart_rate",
    "bmi",
    "sleep_hours_per_night",
    "daily_caloric_intake",
    "hydration_level",
    "previous_competition_performance",
    "resting_heart_rate",
    "body_fat_percentage",
    "vo2_max",
    "event_distance",
]

preprocessor = ColumnTransformer(
    transformers=[
        (
            "cat",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features,
        ),
        (
            "num",
            "passthrough",
            numeric_features,
        ),
    ]
)

# -----------------------------
# Split raw rows by athlete before fitting preprocessing.
# This prevents one athlete appearing in both train and test and prevents
# the encoder from learning anything from the holdout set.
# -----------------------------

splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.2,
    random_state=42,
)
train_index, test_index = next(
    splitter.split(X, y, groups=performance_df["athlete_id"])
)

X_train_raw = X.iloc[train_index]
X_test_raw = X.iloc[test_index]
y_train = y.iloc[train_index]
y_test = y.iloc[test_index]

X_train = preprocessor.fit_transform(X_train_raw)
X_test = preprocessor.transform(X_test_raw)

# -----------------------------
# Save Preprocessor
# -----------------------------

joblib.dump(
    preprocessor,
    ENCODER_DIR / "performance_preprocessor_v2.joblib",
)

# -----------------------------
# Save Dataset
# -----------------------------

joblib.dump(
    {
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "split_strategy": "grouped_by_athlete",
        "train_athlete_ids": sorted(
            performance_df.iloc[train_index]["athlete_id"].unique().tolist()
        ),
        "test_athlete_ids": sorted(
            performance_df.iloc[test_index]["athlete_id"].unique().tolist()
        ),
    },
    ARTIFACTS_DIR / "performance_dataset_v2.joblib",
)

print("✅ Feature engineering completed.")
print(f"Training samples: {X_train.shape[0]}")
print(f"Testing samples: {X_test.shape[0]}")
print(f"Features: {X_train.shape[1]}")
print("Target Range:")
print("Min:", y.min())
print("Max:", y.max())
