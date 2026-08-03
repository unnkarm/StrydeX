import pandas as pd
from pathlib import Path

# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

PROCESSED_DIR = BASE_DIR / "datasets" / "processed"

OUTPUT_FILE = PROCESSED_DIR / "readiness_dataset.csv"

# --------------------------------------------------
# Load datasets
# --------------------------------------------------

activity = pd.read_csv(PROCESSED_DIR / "dailyActivity_merged.csv")
sleep = pd.read_csv(PROCESSED_DIR / "sleepDay_merged.csv")
heart = pd.read_csv(PROCESSED_DIR / "heartrate_seconds_merged.csv")

# --------------------------------------------------
# Standardize column names
# --------------------------------------------------

activity.columns = activity.columns.str.lower()
sleep.columns = sleep.columns.str.lower()
heart.columns = heart.columns.str.lower()

# --------------------------------------------------
# Convert dates
# --------------------------------------------------

activity["activitydate"] = pd.to_datetime(activity["activitydate"])

sleep["sleepday"] = pd.to_datetime(sleep["sleepday"]).dt.date

heart["time"] = pd.to_datetime(heart["time"])
heart["date"] = heart["time"].dt.date

activity["date"] = activity["activitydate"].dt.date

# --------------------------------------------------
# Average heart rate per day
# --------------------------------------------------

heart_daily = (
    heart
    .groupby(["id", "date"])["value"]
    .mean()
    .reset_index()
)

heart_daily.rename(
    columns={"value": "avg_heart_rate"},
    inplace=True
)

# --------------------------------------------------
# Merge datasets
# --------------------------------------------------

df = activity.merge(
    sleep,
    left_on=["id", "date"],
    right_on=["id", "sleepday"],
    how="left"
)

df = df.merge(
    heart_daily,
    on=["id", "date"],
    how="left"
)

# --------------------------------------------------
# Keep useful columns
# --------------------------------------------------

df = df[
    [
        "id",
        "date",
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

# --------------------------------------------------
# Fill missing values
# --------------------------------------------------

df.fillna(df.median(numeric_only=True), inplace=True)

# --------------------------------------------------
# Save
# --------------------------------------------------

df.to_csv(OUTPUT_FILE, index=False)

print("✅ Readiness dataset created")
print(df.shape)
print(df.head())
