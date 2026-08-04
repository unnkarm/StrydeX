import joblib
from pathlib import Path

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

ARTIFACTS_DIR = BASE_DIR / "artifacts"
MODELS_DIR = ARTIFACTS_DIR / "models"

MODELS_DIR.mkdir(parents=True, exist_ok=True)

# --------------------------------------------------
# Load Processed Dataset
# --------------------------------------------------

data = joblib.load(
    ARTIFACTS_DIR / "performance_dataset_v2.joblib"
)

X_train = data["X_train"]
X_test = data["X_test"]
y_train = data["y_train"]
y_test = data["y_test"]

# --------------------------------------------------
# Train Model
# --------------------------------------------------

model = RandomForestRegressor(
    n_estimators=200,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

# --------------------------------------------------
# Predictions
# --------------------------------------------------

predictions = model.predict(X_test)

# --------------------------------------------------
# Evaluation
# --------------------------------------------------

mae = mean_absolute_error(y_test, predictions)
rmse = mean_squared_error(y_test, predictions) ** 0.5
r2 = r2_score(y_test, predictions)

print("\n===== Performance Model Results =====")
print(f"MAE  : {mae:.2f}")
print(f"RMSE : {rmse:.2f}")
print(f"R²   : {r2:.4f}")

baseline_predictions = [float(y_train.mean())] * len(y_test)
baseline_mae = mean_absolute_error(y_test, baseline_predictions)
baseline_rmse = mean_squared_error(y_test, baseline_predictions) ** 0.5
print(f"Baseline MAE  : {baseline_mae:.2f}")
print(f"Baseline RMSE : {baseline_rmse:.2f}")
if r2 <= 0 or mae >= baseline_mae:
    print("WARNING: Candidate does not beat the mean baseline; do not deploy it.")

# --------------------------------------------------
# Save Model
# --------------------------------------------------

joblib.dump(
    model,
    MODELS_DIR / "performance_model_v2.joblib"
)

print("\nCandidate saved as performance_model_v2.joblib; existing model preserved.")
