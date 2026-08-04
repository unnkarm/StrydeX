import json
import joblib
import numpy as np
from pathlib import Path

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    fbeta_score,
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
    ARTIFACTS_DIR / "injury_dataset_v2.joblib"
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

# Select a classification threshold using out-of-fold training predictions.
# F2 weights recall more heavily because missed injuries are the costly error.
cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
oof_probabilities = cross_val_predict(
    model,
    X_train,
    y_train,
    cv=cv,
    method="predict_proba",
    n_jobs=-1,
)[:, 1]

thresholds = np.linspace(0.05, 0.80, 76)
threshold_scores = []
for threshold in thresholds:
    threshold_predictions = (oof_probabilities >= threshold).astype(int)
    threshold_scores.append(
        fbeta_score(y_train, threshold_predictions, beta=2, zero_division=0)
    )

decision_threshold = float(thresholds[int(np.argmax(threshold_scores))])
model.fit(X_train, y_train)

# --------------------------------------------------
# Predictions
# --------------------------------------------------

predictions = (model.predict_proba(X_test)[:, 1] >= decision_threshold).astype(int)
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
print(f"Threshold: {decision_threshold:.2f} (selected by training-only F2)")

print("\nConfusion Matrix")
print(confusion_matrix(y_test, predictions))

print("\nClassification Report")
print(classification_report(y_test, predictions))

# --------------------------------------------------
# Save Model
# --------------------------------------------------

joblib.dump(
    model,
    MODELS_DIR / "injury_model_v2.joblib"
)

with (MODELS_DIR / "injury_model_v2_metadata.json").open("w") as handle:
    json.dump(
        {
            "decision_threshold": decision_threshold,
            "threshold_objective": "out-of-fold F2",
            "split_strategy": data.get("split_strategy"),
        },
        handle,
        indent=2,
    )

print("\nCandidate saved as injury_model_v2.joblib; existing model preserved.")
