import joblib
import pandas as pd
from pathlib import Path

from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder

# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

PROCESSED_DIR = BASE_DIR / "datasets" / "processed"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
ENCODER_DIR = ARTIFACTS_DIR / "encoders"

ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
ENCODER_DIR.mkdir(parents=True, exist_ok=True)

# --------------------------------------------------
# Load Dataset
# --------------------------------------------------

injury_df = pd.read_csv(
    PROCESSED_DIR / "collegiate_athlete_injury_dataset.csv"
)

# --------------------------------------------------
# Features
# --------------------------------------------------

X = injury_df[
    [
        "age",
        "gender",
        "height_cm",
        "weight_kg",
        "position",
        "training_intensity",
        "training_hours_per_week",
        "recovery_days_per_week",
        "match_count_per_week",
        "rest_between_events_days",
        "fatigue_score",
        "performance_score",
        "team_contribution_score",
        "load_balance_score",
        "acl_risk_score",
    ]
]

y = injury_df["injury_indicator"]

# --------------------------------------------------
# Preprocessing
# --------------------------------------------------

categorical_features = [
    "gender",
    "position",
]

numeric_features = [
    "age",
    "height_cm",
    "weight_kg",
    "training_intensity",
    "training_hours_per_week",
    "recovery_days_per_week",
    "match_count_per_week",
    "rest_between_events_days",
    "fatigue_score",
    "performance_score",
    "team_contribution_score",
    "load_balance_score",
    "acl_risk_score",
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

# --------------------------------------------------
# Split raw rows before fitting preprocessing so the holdout remains unseen.
# --------------------------------------------------

X_train_raw, X_test_raw, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y,
)

X_train = preprocessor.fit_transform(X_train_raw)
X_test = preprocessor.transform(X_test_raw)

# --------------------------------------------------
# Save
# --------------------------------------------------

joblib.dump(
    preprocessor,
    ENCODER_DIR / "injury_preprocessor_v2.joblib",
)

joblib.dump(
    {
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "split_strategy": "stratified_holdout",
    },
    ARTIFACTS_DIR / "injury_dataset_v2.joblib",
)

print("✅ Injury feature engineering completed.")
print(f"Training samples: {X_train.shape[0]}")
print(f"Testing samples: {X_test.shape[0]}")
print(f"Features: {X_train.shape[1]}")
print("\nClass Distribution:")
print(y.value_counts())
