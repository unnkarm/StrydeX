import joblib
from pathlib import Path

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
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
    ARTIFACTS_DIR / "injury_dataset.joblib"
)

X_train = data["X_train"]
X_test = data["X_test"]
y_train = data["y_train"]
y_test = data["y_test"]

# --------------------------------------------------
# Train Model
# --------------------------------------------------

model = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    class_weight="balanced",
    n_jobs=-1,
)

model.fit(X_train, y_train)

# --------------------------------------------------
# Predictions
# --------------------------------------------------

predictions = model.predict(X_test)
probabilities = model.predict_proba(X_test)[:, 1]

# --------------------------------------------------
# Evaluation
# --------------------------------------------------

print("\n===== Injury Model Results =====")

print(f"Accuracy : {accuracy_score(y_test, predictions):.4f}")
print(f"Precision: {precision_score(y_test, predictions):.4f}")
print(f"Recall   : {recall_score(y_test, predictions):.4f}")
print(f"F1 Score : {f1_score(y_test, predictions):.4f}")
print(f"ROC-AUC  : {roc_auc_score(y_test, probabilities):.4f}")

print("\nConfusion Matrix")
print(confusion_matrix(y_test, predictions))

print("\nClassification Report")
print(classification_report(y_test, predictions))

# --------------------------------------------------
# Save Model
# --------------------------------------------------

joblib.dump(
    model,
    MODELS_DIR / "injury_model.joblib"
)

print("\n✅ Injury model saved successfully!")
