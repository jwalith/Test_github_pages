# Zip Code Coordinates Generator

This script generates a JSON file with coordinates for all valid zip codes in your CSV file.

## Quick Start

### 1. Test First (Recommended)
```bash
python test_coordinates.py
```
This will test coordinate lookup for a few sample zip codes to make sure everything works.

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Generate Full Coordinates File
```bash
python generate_coordinates.py
```

## What It Does

1. **Reads your CSV file** (`01_master_all_states.csv`)
2. **Extracts all unique valid zip codes** (5-digit numbers only)
3. **Gets coordinates** for each zip code using Nominatim API
4. **Saves results** to `zip_coordinates.json`

## Output File Structure

```json
{
  "metadata": {
    "total_zips_processed": 5000,
    "successful_zips": 4850,
    "failed_zips": 150,
    "generated_at": "2024-01-15 14:30:00"
  },
  "coordinates": {
    "10001": {
      "latitude": 40.7505,
      "longitude": -73.9934
    },
    "90210": {
      "latitude": 34.0901,
      "longitude": -118.4065
    }
  },
  "failed_zips": ["12345", "67890"]
}
```

## Expected Results

- **Processing Time**: ~1-2 hours (due to API rate limits)
- **Success Rate**: ~95-98% (some zip codes might not be found)
- **File Size**: ~1-2 MB JSON file

## After Generation

Once you have `zip_coordinates.json`, you can:

1. **Upload it to GitHub** alongside your other files
2. **Update your JavaScript** to load coordinates from this file instead of making API calls
3. **Eliminate the 5-15 minute loading time** - coordinates will be instant!

## Notes

- **API Rate Limit**: 1 request per second (built into the script)
- **Progress Saving**: Script saves progress every 100 zip codes
- **Error Handling**: Failed zip codes are logged and saved separately
- **Respectful Usage**: Includes proper User-Agent header

## Troubleshooting

- **"CSV file not found"**: Make sure `01_master_all_states.csv` is in the same directory
- **"No module named requests"**: Run `pip install requests`
- **API errors**: The script will continue and log failed zip codes
