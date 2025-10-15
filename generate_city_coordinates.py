#!/usr/bin/env python3
"""
Generate coordinates for cities where zip codes are missing.
This script processes only rows with missing zip codes and valid city+state.
"""

import csv
import json
import requests
import time
from collections import defaultdict

def load_csv_data(filename):
    """Load CSV data and filter for rows with missing zip codes."""
    organizations = []
    missing_zip_count = 0
    
    print("Loading CSV data...")
    
    with open(filename, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            # Clean the data
            zip_code = row.get('zip', '').strip()
            city = row.get('city', '').strip()
            state = row.get('state', '').strip()
            
            # Only process rows where zip is missing but city+state exist
            if not zip_code and city and state:
                organizations.append({
                    'city': city,
                    'state': state,
                    'name': row.get('name', '').strip(),
                    'type': row.get('housing_type', '').strip()
                })
                missing_zip_count += 1
    
    print(f"Found {missing_zip_count} organizations with missing zip codes")
    return organizations

def get_unique_cities(organizations):
    """Extract unique city+state combinations."""
    unique_cities = set()
    city_counts = defaultdict(int)
    
    for org in organizations:
        city_key = f"{org['city']}, {org['state']}"
        unique_cities.add(city_key)
        city_counts[city_key] += 1
    
    print(f"Found {len(unique_cities)} unique cities with missing zip codes")
    
    # Show some examples
    print("\nSample cities to process:")
    for i, city in enumerate(sorted(unique_cities)[:10]):
        count = city_counts[city]
        print(f"  {i+1}. {city} ({count} organizations)")
    
    if len(unique_cities) > 10:
        print(f"  ... and {len(unique_cities) - 10} more")
    
    return sorted(unique_cities), city_counts

def get_city_coordinates(city_state, max_retries=3):
    """Get coordinates for a city using Nominatim API."""
    url = "https://nominatim.openstreetmap.org/search"
    
    params = {
        'q': city_state,
        'format': 'json',
        'limit': 1,
        'countrycodes': 'us'  # Focus on US cities
    }
    
    headers = {
        'User-Agent': 'Organization Search Tool (contact@example.com)'
    }
    
    for attempt in range(max_retries):
        try:
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data and len(data) > 0:
                result = data[0]
                return {
                    'latitude': float(result['lat']),
                    'longitude': float(result['lon']),
                    'display_name': result.get('display_name', city_state)
                }
            else:
                print(f"  No results found for: {city_state}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"  Error fetching {city_state} (attempt {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2)  # Wait before retry
            else:
                return None
    
    return None

def generate_city_coordinates():
    """Main function to generate city coordinates."""
    csv_filename = '01_master_all_states.csv'
    output_filename = 'city_coordinates.json'
    
    print("=== City Coordinates Generator ===")
    print("Processing cities with missing zip codes...")
    
    # Load and filter CSV data
    organizations = load_csv_data(csv_filename)
    
    if not organizations:
        print("No organizations found with missing zip codes!")
        return
    
    # Get unique cities
    unique_cities, city_counts = get_unique_cities(organizations)
    
    # Generate coordinates
    city_coordinates = {}
    successful = 0
    failed = 0
    
    print(f"\nFetching coordinates for {len(unique_cities)} cities...")
    print("This may take a while due to API rate limits...")
    
    for i, city_state in enumerate(unique_cities, 1):
        print(f"[{i}/{len(unique_cities)}] Processing: {city_state}")
        
        coordinates = get_city_coordinates(city_state)
        
        if coordinates:
            city_coordinates[city_state] = coordinates
            successful += 1
            print(f"  Success: {coordinates['latitude']:.4f}, {coordinates['longitude']:.4f}")
        else:
            failed += 1
            print(f"  Failed to get coordinates")
        
        # Rate limiting - be respectful to the API
        time.sleep(1)  # 1 second between requests
    
    # Save results
    print(f"\nSaving results to {output_filename}...")
    
    result_data = {
        'metadata': {
            'total_cities': len(unique_cities),
            'successful': successful,
            'failed': failed,
            'generated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'description': 'Coordinates for cities with missing zip codes'
        },
        'city_coordinates': city_coordinates
    }
    
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(result_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n=== Results ===")
    print(f"Total cities processed: {len(unique_cities)}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print(f"Success rate: {(successful/len(unique_cities)*100):.1f}%")
    print(f"Output saved to: {output_filename}")
    
    if failed > 0:
        print(f"\nNote: {failed} cities failed to get coordinates.")
        print("You may want to check these manually or retry later.")

if __name__ == "__main__":
    generate_city_coordinates()
