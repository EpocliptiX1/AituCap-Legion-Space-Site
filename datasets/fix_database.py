import pandas as pd
import sqlite3
import os

# --- CONFIGURATION ---
EXCEL_FILE = r"C:\Users\Damir\Desktop\javascript database splitter - Copy (5)\datasets\kazData.xlsx"     # Your source file
NEW_DB_NAME = 'kazakh_library.db' # The new separate DB we are creating
TABLE_NAME = 'kaz_movies'        # The table name inside the DB

def convert_excel_to_sql():
    # 1. Check if file exists
    if not os.path.exists(EXCEL_FILE):
        print(f"❌ Error: Could not find '{EXCEL_FILE}'")
        return

    print(f"DTO: Reading '{EXCEL_FILE}'...")
    
    try:
        # 2. Load Excel into a DataFrame (Pandas table)
        df = pd.read_excel(EXCEL_FILE)
        
        # Optional: Clean column names (removes spaces, makes lowercase for easier SQL)
        # Example: "Movie Name" becomes "movie_name"
        df.columns = [c.strip().replace(" ", "_").lower() for c in df.columns]
        
        print(f"✅ Data Loaded. Found {len(df)} movies.")
        print(f"   Columns found: {list(df.columns)}")

        # 3. Connect to (or create) the new SQLite Database
        conn = sqlite3.connect(NEW_DB_NAME)
        cursor = conn.cursor()

        # 4. Write data to SQL
        # if_exists='replace' means if you run this script twice, it overwrites (good for testing)
        df.to_sql(TABLE_NAME, conn, if_exists='replace', index=False)
        
        print(f"✅ Success! Created database '{NEW_DB_NAME}' with table '{TABLE_NAME}'.")

        # 5. Verification: Print first 3 rows to prove it worked
        print("\n--- PREVIEW OF SAVED DATA ---")
        cursor.execute(f"SELECT * FROM {TABLE_NAME} LIMIT 3")
        rows = cursor.fetchall()
        for row in rows:
            print(row)

        conn.close()

    except Exception as e:
        print(f"❌ An error occurred: {e}")

if __name__ == "__main__":
    convert_excel_to_sql()