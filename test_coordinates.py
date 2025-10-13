#!/usr/bin/env python3
"""
Quick test script to generate coordinates for a few zip codes first.
Run this to test before running the full script.
"""

import requests
import json
import time

def test_coordinates():
    """Test getting coordinates for a few zip codes"""
    test_zips = ["10001", "90210", "60601", "33101", "75201"]  # NYC, Beverly Hills, Chicago, Miami, Dallas
    
    print("Testing coordinate lookup for sample zip codes...")
    
    for zip_code in test_zips:
        try:
            url = f"https://nominatim.openstreetmap.org/search?postalcode={zip_code}&country=US&format=json&limit=1"
            headers = {'User-Agent': 'OrganizationSearch/1.0'}
            
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data and len(data) > 0:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                print(f"✅ {zip_code}: ({lat:.4f}, {lon:.4f})")
            else:
                print(f"❌ {zip_code}: No data found")
                
        except Exception as e:
            print(f"❌ {zip_code}: Error - {e}")
        
        time.sleep(1)  # Be respectful to API

if __name__ == "__main__":
    test_coordinates()
