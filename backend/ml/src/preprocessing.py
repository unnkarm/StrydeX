import pandas as pd
from pathlib import Path

# -----------------------------
# Project folder paths
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

RAW_DIR = BASE_DIR / "datasets" / "raw"
PROCESSED_DIR = BASE_DIR / "datasets" / "processed"

# Create processed folder if it doesn't exist
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


# -----------------------------
# Clean dataframe
# -----------------------------
def clean_dataframe(df):
    """Basic cleaning for all datasets."""

    # Remove duplicates
    df = df.drop_duplicates()

    # Fill missing values
    for col in df.columns:

        if pd.api.types.is_numeric_dtype(df[col]):
            df[col] = df[col].fillna(df[col].median())

        else:
            df[col] = df[col].fillna("Unknown")

    # Standardize column names
    df.columns = (
        df.columns.str.strip()
        .str.lower()
        .str.replace(" ", "_")
        .str.replace("-", "_")
    )

    return df


# -----------------------------
# Process every CSV
# -----------------------------
def process_all_csvs():

    csv_files = list(RAW_DIR.glob("*.csv"))

    if len(csv_files) == 0:
        print("❌ No CSV files found!")
        print(f"Expected location: {RAW_DIR}")
        return

    print(f"\nFound {len(csv_files)} CSV files.\n")

    for csv_file in csv_files:

        print(f"Processing: {csv_file.name}")

        try:
            df = pd.read_csv(csv_file)

        except UnicodeDecodeError:
            df = pd.read_csv(csv_file, encoding="latin1")

        except Exception as e:
            print(f"❌ Error reading {csv_file.name}")
            print(e)
            continue

        df = clean_dataframe(df)

        output_file = PROCESSED_DIR / csv_file.name

        df.to_csv(output_file, index=False)

        print(f"✅ Saved: {output_file.name}\n")

    print("===================================")
    print("🎉 All datasets cleaned successfully!")
    print("===================================")


# -----------------------------
# Main
# -----------------------------
if __name__ == "__main__":
    process_all_csvs()
