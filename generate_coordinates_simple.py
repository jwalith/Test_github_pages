#!/usr/bin/env python3
"""
Simplified script to generate coordinates for zip codes.
This version processes only the first 100 zip codes for testing.
"""

import csv
import json
import requests
import time
import re

def is_valid_zip(zip_code):
    """Check if zip code is valid (5 digits)"""
    return bool(re.match(r'^\d{5}$', zip_code.strip()))

def get_coordinates_from_zip(zip_code):
    """Get coordinates for a zip code using Nominatim API"""
    try:
        url = f"https://nominatim.openstreetmap.org/search?postalcode={zip_code}&country=US&format=json&limit=1"
        headers = {'User-Agent': 'OrganizationSearch/1.0'}
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if data and len(data) > 0 and 'lat' in data[0] and 'lon' in data[0]:
            return (float(data[0]['lat']), float(data[0]['lon']))
        
        return None
        
    except Exception as e:
        print(f"Error getting coordinates for {zip_code}: {e}")
        return None

def main():
    print("Starting coordinate generation...")
    
    # Read CSV and extract unique zip codes
    unique_zips = set()
    
    try:
        with open('01_master_all_states.csv', 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                zip_code = row.get('zip', '').strip()
                if zip_code and is_valid_zip(zip_code):
                    unique_zips.add(zip_code)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return
    
    print(f"Found {len(unique_zips)} unique valid zip codes")
    
    # Process only first 100 zip codes for testing
    test_zips = sorted(list(unique_zips))[:100]
    print(f"Processing first {len(test_zips)} zip codes for testing...")
    
    coordinates_map = {}
    failed_zips = []
    
    for i, zip_code in enumerate(test_zips, 1):
        print(f"Processing {i}/{len(test_zips)}: {zip_code}", end=" ")
        
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
        
        time.sleep(1)  # Be respectful to API
    
    # Save results
    result = {
        'metadata': {
            'total_zips_processed': len(test_zips),
            'successful_zips': len(coordinates_map),
            'failed_zips': len(failed_zips),
            'generated_at': time.strftime('%Y-%m-%d %H:%M:%S')
        },
        'coordinates': coordinates_map,
        'failed_zips': failed_zips
    }
    
    with open('zip_coordinates_test.json', 'w', encoding='utf-8') as file:
        json.dump(result, file, indent=2, ensure_ascii=False)
    
    print(f"\n[SUCCESS] Test coordinates file generated: zip_coordinates_test.json")
    print(f"[SUMMARY]")
    print(f"   - Total zip codes: {len(test_zips)}")
    print(f"   - Successful: {len(coordinates_map)}")
    print(f"   - Failed: {len(failed_zips)}")
    print(f"   - Success rate: {len(coordinates_map)/len(test_zips)*100:.1f}%")

if __name__ == "__main__":
    main()
