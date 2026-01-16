import pandas as pd
import re

# filenames
file_10k = 'Top_10000_Movies_IMDb.csv'  
file_tmdb = 'TMDB_all_movies.csv'       
output_file = 'AITUCAP_Final_Database.csv'

print("⏳ Loading datasets... (This might take a second)")
df_10k = pd.read_csv(file_10k)
df_tmdb = pd.read_csv(file_tmdb, low_memory=False)

# 1. Clean the 10k Join Key (Extracting ID from Link)
print("🔧 Extracting IMDb IDs from links...")
def extract_id(url):
    if isinstance(url, str):
        match = re.search(r'(tt\d+)', url)
        if match:
            return match.group(1)
    return None

df_10k['join_key'] = df_10k['Link'].apply(extract_id)

# 2. Prepare the TMDB data
# We use 'title' because that's what you said the 1M file uses
cols_to_keep = ['imdb_id', 'poster_path', 'budget', 'release_date', 'revenue', 'title']
tmdb_clean = df_tmdb[cols_to_keep].copy()
tmdb_clean['imdb_id'] = tmdb_clean['imdb_id'].astype(str).str.strip()
tmdb_clean = tmdb_clean.drop_duplicates(subset=['imdb_id'])

# 3. Merge
print("🔗 Merging datasets...")
merged_df = pd.merge(
    df_10k, 
    tmdb_clean, 
    left_on='join_key', 
    right_on='imdb_id', 
    how='left'
)

# 4. Fix Poster URLs
print("🎨 Fixing poster URLs...")
base_url = "https://image.tmdb.org/t/p/w500"
merged_df['poster_full_url'] = merged_df['poster_path'].apply(
    lambda x: f"{base_url}{x}" if pd.notnull(x) else None
)

# 5. Save the result first (Safe move)
print("💾 Saving final merged dataset...")
final_df = merged_df.drop(columns=['join_key', 'imdb_id', 'poster_path'])
final_df.to_csv(output_file, index=False)

# 6. Report failures
missing_matches = merged_df[merged_df['imdb_id'].isnull()]
print("-" * 40)
print(f"✅ Total Movies Processed: {len(merged_df)}")
print(f"❌ Movies with NO MATCH: {len(missing_matches)}")
print("-" * 40)

if len(missing_matches) > 0:
    print("Sample of movies that didn't match:")
    # Using 'Movie Name' because that is your 10k column name
    try:
        print(missing_matches[['Movie Name', 'join_key']].head(10))
    except KeyError:
        print("Could not print specific names, check 'missing_movies_report.csv'")
    
    missing_matches.to_csv('missing_movies_report.csv', index=False)

print(f"🎉 DONE! Open '{output_file}' to see your 10k movies with posters and budgets.")