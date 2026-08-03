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
# Load Dataset
# --------------------------------------------------

data = joblib.load(
    ARTIFACTS_DIR / "readiness_dataset.joblib"
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
    n_jobs=-1,
)

model.fit(X_train, y_train)

# --------------------------------------------------
# Predict
# --------------------------------------------------

predictions = model.predict(X_test)

# --------------------------------------------------
# Evaluate
# --------------------------------------------------

mae = mean_absolute_error(y_test, predictions)
rmse = mean_squared_error(y_test, predictions) ** 0.5
r2 = r2_score(y_test, predictions)

print("\n===== Readiness Model Results =====")
print(f"MAE  : {mae:.2f}")
print(f"RMSE : {rmse:.2f}")
print(f"R²   : {r2:.4f}")

# --------------------------------------------------
# Save Model
# --------------------------------------------------

joblib.dump(
    model,
    MODELS_DIR / "readiness_model.joblib"
)

print("\n✅ Readiness model saved successfully!")
