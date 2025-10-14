#!/usr/bin/env python3
"""
Test script to verify the incremental update functionality
"""

import json
import csv

def test_incremental_update():
    """Test the incremental update logic"""
    print("Testing incremental update functionality...")
    
    # Load existing coordinates
    try:
        with open('zip_coordinates.json', 'r', encoding='utf-8') as file:
            existing_data = json.load(file)
            existing_coords = existing_data.get('coordinates', {})
            print(f"[OK] Loaded existing coordinates: {len(existing_coords)} zip codes")
    except Exception as e:
        print(f"[ERROR] Error loading existing coordinates: {e}")
        return
    
    # Extract zip codes from CSV
    csv_zips = set()
    try:
        with open('01_master_all_states.csv', 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                zip_code = row.get('zip', '').strip()
                if zip_code and len(zip_code) == 5 and zip_code.isdigit():
                    csv_zips.add(zip_code)
        print(f"[OK] Extracted zip codes from CSV: {len(csv_zips)} zip codes")
    except Exception as e:
        print(f"[ERROR] Error reading CSV: {e}")
        return
    
    # Find missing zip codes
    existing_zips = set(existing_coords.keys())
    missing_zips = csv_zips - existing_zips
    
    print(f"\n[ANALYSIS]")
    print(f"   - CSV zip codes: {len(csv_zips)}")
    print(f"   - Existing coordinates: {len(existing_zips)}")
    print(f"   - Missing zip codes: {len(missing_zips)}")
    
    if missing_zips:
        print(f"\n[NEW ZIP CODES] (first 10):")
        for zip_code in sorted(list(missing_zips))[:10]:
            print(f"   - {zip_code}")
        if len(missing_zips) > 10:
            print(f"   ... and {len(missing_zips) - 10} more")
        
        print(f"\n[INFO] To update: Run 'python update_coordinates.py'")
        print(f"   This will fetch coordinates for {len(missing_zips)} missing zip codes")
    else:
        print(f"\n[SUCCESS] No missing zip codes found!")
        print(f"   All CSV zip codes have coordinates")

if __name__ == "__main__":
    test_incremental_update()
