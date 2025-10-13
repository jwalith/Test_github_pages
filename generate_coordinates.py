#!/usr/bin/env python3
"""
Script to generate coordinates for all valid zip codes in the CSV file.
This will create a separate JSON file with zip code to coordinates mapping.
"""

import csv
import json
import requests
import time
import re
from typing import Dict, Tuple, Optional

def is_valid_zip(zip_code: str) -> bool:
    """Check if zip code is valid (5 digits)"""
    return bool(re.match(r'^\d{5}$', zip_code.strip()))

def get_coordinates_from_zip(zip_code: str) -> Optional[Tuple[float, float]]:
    """Get coordinates for a zip code using Nominatim API"""
    try:
        url = f"https://nominatim.openstreetmap.org/search?postalcode={zip_code}&country=US&format=json&limit=1"
        headers = {
            'User-Agent': 'OrganizationSearch/1.0'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if data and len(data) > 0 and 'lat' in data[0] and 'lon' in data[0]:
            return (float(data[0]['lat']), float(data[0]['lon']))
        
        return None
        
    except Exception as e:
        print(f"Error getting coordinates for {zip_code}: {e}")
        return None

def extract_unique_zips(csv_file: str) -> set:
    """Extract all unique valid zip codes from CSV"""
    unique_zips = set()
    
    print(f"Reading CSV file: {csv_file}")
    
    with open(csv_file, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            # Try different possible zip code column names
            zip_code = None
            for col in ['zip', 'zip code', 'zipcode', 'postal_code']:
                if col in row and row[col]:
                    zip_code = row[col].strip()
                    break
            
            if zip_code and is_valid_zip(zip_code):
                unique_zips.add(zip_code)
    
    print(f"Found {len(unique_zips)} unique valid zip codes")
    return unique_zips

def generate_coordinates_file(csv_file: str, output_file: str = 'zip_coordinates.json'):
    """Generate coordinates file for all unique zip codes"""
    
    # Extract unique zip codes
    unique_zips = extract_unique_zips(csv_file)
    
    # Get coordinates for each zip code
    coordinates_map = {}
    failed_zips = []
    
    print(f"Getting coordinates for {len(unique_zips)} zip codes...")
    print("This may take a while due to API rate limits...")
    
    for i, zip_code in enumerate(sorted(unique_zips), 1):
        print(f"Processing {i}/{len(unique_zips)}: {zip_code}", end=" ")
        
        coords = get_coordinates_from_zip(zip_code)
        
        if coords:
            coordinates_map[zip_code] = {
                'latitude': coords[0],
                'longitude': coords[1]
            }
            print(f"[OK] ({coords[0]:.4f}, {coords[1]:.4f})")
        else:
            failed_zips.append(zip_code)
            print("[FAILED]")
        
        # Be respectful to the API - wait 1 second between requests
        time.sleep(1)
        
        # Save progress every 100 zip codes
        if i % 100 == 0:
            print(f"\nProgress: {i}/{len(unique_zips)} completed")
            print(f"Successfully processed: {len(coordinates_map)}")
            print(f"Failed: {len(failed_zips)}")
            print("-" * 50)
    
    # Save results
    print(f"\nSaving results to {output_file}...")
    
    result = {
        'metadata': {
            'total_zips_processed': len(unique_zips),
            'successful_zips': len(coordinates_map),
            'failed_zips': len(failed_zips),
            'generated_at': time.strftime('%Y-%m-%d %H:%M:%S')
        },
        'coordinates': coordinates_map,
        'failed_zips': failed_zips
    }
    
    with open(output_file, 'w', encoding='utf-8') as file:
        json.dump(result, file, indent=2, ensure_ascii=False)
    
    print(f"[SUCCESS] Coordinates file generated: {output_file}")
    print(f"[SUMMARY]")
    print(f"   - Total zip codes: {len(unique_zips)}")
    print(f"   - Successful: {len(coordinates_map)}")
    print(f"   - Failed: {len(failed_zips)}")
    print(f"   - Success rate: {len(coordinates_map)/len(unique_zips)*100:.1f}%")
    
    if failed_zips:
        print(f"\n[FAILED ZIP CODES]")
        for zip_code in failed_zips[:10]:  # Show first 10
            print(f"   - {zip_code}")
        if len(failed_zips) > 10:
            print(f"   ... and {len(failed_zips) - 10} more")

if __name__ == "__main__":
    csv_file = "01_master_all_states.csv"
    output_file = "zip_coordinates.json"
    
    try:
        generate_coordinates_file(csv_file, output_file)
    except FileNotFoundError:
        print(f"[ERROR] CSV file '{csv_file}' not found!")
        print("Make sure the CSV file is in the same directory as this script.")
    except Exception as e:
        print(f"[ERROR] {e}")
