import joblib
import pandas as pd
from pathlib import Path

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.model_selection import train_test_split

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

# FIX: Properly initialize the ColumnTransformer
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

# --------------------------------------------------
# Fit
# --------------------------------------------------

X_processed = preprocessor.fit_transform(X)

# -----------------------------
# Split Dataset
# -----------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X_processed,
    y,
    test_size=0.2,
    random_state=42,
    shuffle=True
)

# -----------------------------
# Save Preprocessor
# -----------------------------

joblib.dump(
    preprocessor,
    ENCODER_DIR / "performance_preprocessor.joblib",
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
    },
    ARTIFACTS_DIR / "performance_dataset.joblib",
)

print("✅ Feature engineering completed.")
print(f"Training samples: {X_train.shape[0]}")
print(f"Testing samples: {X_test.shape[0]}")
print(f"Features: {X_train.shape[1]}")
print("Target Range:")
print("Min:", y.min())
print("Max:", y.max())
