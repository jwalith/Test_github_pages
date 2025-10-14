#!/usr/bin/env python3
"""
Incremental coordinate updater.
Compares CSV with existing JSON and fetches only new zip codes.
"""

import csv
import json
import requests
import time
import re
from typing import Set, Dict, Tuple

def is_valid_zip(zip_code: str) -> bool:
    """Check if zip code is valid (5 digits)"""
    return bool(re.match(r'^\d{5}$', zip_code.strip()))

def get_coordinates_from_zip(zip_code: str) -> Tuple[float, float]:
    """Get coordinates for a zip code using Nominatim API"""
    try:
        url = f"https://nominatim.openstreetmap.org/search?postalcode={zip_code}&country=US&format=json&limit=1"
        headers = {'User-Agent': 'OrganizationSearch/1.0'}
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if data and len(data) > 0 and 'lat' in data[0] and 'lon' in data[0]:
            return (float(data[0]['lat']), float(data[0]['lon']))
        
        raise Exception('No coordinates found')
        
    except Exception as e:
        print(f"Error getting coordinates for {zip_code}: {e}")
        raise

def extract_zip_codes_from_csv(csv_file: str) -> Set[str]:
    """Extract all unique valid zip codes from CSV"""
    unique_zips = set()
    
    print(f"Reading CSV file: {csv_file}")
    
    with open(csv_file, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            zip_code = row.get('zip', '').strip()
            if zip_code and is_valid_zip(zip_code):
                unique_zips.add(zip_code)
    
    print(f"Found {len(unique_zips)} unique valid zip codes in CSV")
    return unique_zips

def load_existing_coordinates(json_file: str) -> Dict[str, Dict[str, float]]:
    """Load existing coordinates from JSON file"""
    try:
        with open(json_file, 'r', encoding='utf-8') as file:
            data = json.load(file)
            return data.get('coordinates', {})
    except FileNotFoundError:
        print(f"JSON file {json_file} not found. Starting fresh.")
        return {}
    except Exception as e:
        print(f"Error loading JSON file: {e}")
        return {}

def save_coordinates(json_file: str, coordinates: Dict[str, Dict[str, float]], failed_zips: list):
    """Save coordinates to JSON file"""
    result = {
        'metadata': {
            'total_zips': len(coordinates),
            'failed_zips': len(failed_zips),
            'last_updated': time.strftime('%Y-%m-%d %H:%M:%S'),
            'source': 'Incremental Update'
        },
        'coordinates': coordinates,
        'failed_zips': failed_zips
    }
    
    with open(json_file, 'w', encoding='utf-8') as file:
        json.dump(result, file, indent=2, ensure_ascii=False)
    
    print(f"Saved {len(coordinates)} coordinates to {json_file}")

def update_coordinates(csv_file: str, json_file: str):
    """Update coordinates incrementally"""
    print("=== Incremental Coordinate Update ===")
    
    # Extract zip codes from CSV
    csv_zips = extract_zip_codes_from_csv(csv_file)
    
    # Load existing coordinates
    existing_coords = load_existing_coordinates(json_file)
    existing_zips = set(existing_coords.keys())
    
    print(f"Existing coordinates: {len(existing_zips)} zip codes")
    
    # Find new zip codes
    new_zips = csv_zips - existing_zips
    
    if not new_zips:
        print("✅ No new zip codes found. No update needed.")
        return
    
    print(f"🆕 Found {len(new_zips)} new zip codes to process:")
    for zip_code in sorted(new_zips):
        print(f"   - {zip_code}")
    
    # Fetch coordinates for new zip codes
    new_coordinates = {}
    failed_zips = []
    
    print(f"\nFetching coordinates for {len(new_zips)} new zip codes...")
    
    for i, zip_code in enumerate(sorted(new_zips), 1):
        print(f"Processing {i}/{len(new_zips)}: {zip_code}", end=" ")
        
        try:
            coords = get_coordinates_from_zip(zip_code)
            new_coordinates[zip_code] = {
                'latitude': coords[0],
                'longitude': coords[1]
            }
            print(f"[OK] ({coords[0]:.4f}, {coords[1]:.4f})")
        except Exception as e:
            failed_zips.append(zip_code)
            print("[FAILED]")
        
        # Be respectful to the API
        time.sleep(1)
    
    # Merge with existing coordinates
    all_coordinates = {**existing_coords, **new_coordinates}
    
    # Save updated coordinates
    save_coordinates(json_file, all_coordinates, failed_zips)
    
    print(f"\n=== Update Complete ===")
    print(f"✅ Successfully processed: {len(new_coordinates)}/{len(new_zips)}")
    print(f"❌ Failed: {len(failed_zips)}")
    print(f"📊 Total coordinates: {len(all_coordinates)}")
    
    if failed_zips:
        print(f"\nFailed zip codes:")
        for zip_code in failed_zips:
            print(f"   - {zip_code}")

def main():
    csv_file = "01_master_all_states.csv"
    json_file = "zip_coordinates.json"
    
    try:
        update_coordinates(csv_file, json_file)
    except FileNotFoundError:
        print(f"❌ Error: CSV file '{csv_file}' not found!")
        print("Make sure the CSV file is in the same directory as this script.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
