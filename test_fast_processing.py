#!/usr/bin/env python3
"""
Test the fast parallel processing with just 100 zip codes
"""

import csv
import json
import asyncio
import aiohttp
import time
import re

def is_valid_zip(zip_code: str) -> bool:
    return bool(re.match(r'^\d{5}$', zip_code.strip()))

async def get_coordinates_async(session: aiohttp.ClientSession, zip_code: str):
    try:
        url = f"https://nominatim.openstreetmap.org/search?postalcode={zip_code}&country=US&format=json&limit=1"
        headers = {'User-Agent': 'OrganizationSearch/1.0'}
        
        async with session.get(url, headers=headers, timeout=10) as response:
            if response.status == 200:
                data = await response.json()
                if data and len(data) > 0 and 'lat' in data[0] and 'lon' in data[0]:
                    return (zip_code, (float(data[0]['lat']), float(data[0]['lon'])))
            return (zip_code, None)
    except Exception as e:
        print(f"Error for {zip_code}: {e}")
        return (zip_code, None)

async def test_fast_processing():
    print("Testing FAST parallel processing with 100 zip codes...")
    
    # Get first 100 valid zip codes
    unique_zips = set()
    with open('01_master_all_states.csv', 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            zip_code = row.get('zip', '').strip()
            if zip_code and is_valid_zip(zip_code):
                unique_zips.add(zip_code)
                if len(unique_zips) >= 100:
                    break
    
    test_zips = sorted(list(unique_zips))[:100]
    print(f"Testing with {len(test_zips)} zip codes")
    
    # Fast parallel processing
    BATCH_SIZE = 20  # Process 20 at a time
    all_coordinates = {}
    
    start_time = time.time()
    
    connector = aiohttp.TCPConnector(limit=50, limit_per_host=25)
    timeout = aiohttp.ClientTimeout(total=30)
    
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        for i in range(0, len(test_zips), BATCH_SIZE):
            batch = test_zips[i:i + BATCH_SIZE]
            print(f"Processing batch {i//BATCH_SIZE + 1}: {len(batch)} zip codes...")
            
            tasks = [get_coordinates_async(session, zip_code) for zip_code in batch]
            results = await asyncio.gather(*tasks)
            
            for zip_code, coords in results:
                if coords:
                    all_coordinates[zip_code] = coords
            
            print(f"  Successful: {len([r for r in results if r[1]])}/{len(batch)}")
            
            # Small delay between batches
            if i + BATCH_SIZE < len(test_zips):
                await asyncio.sleep(0.5)
    
    end_time = time.time()
    total_time = end_time - start_time
    
    print(f"\n[RESULTS]")
    print(f"Total time: {total_time:.2f} seconds")
    print(f"Successful: {len(all_coordinates)}/{len(test_zips)}")
    print(f"Success rate: {len(all_coordinates)/len(test_zips)*100:.1f}%")
    print(f"Time per zip: {total_time/len(test_zips):.3f} seconds")
    
    # Estimate full processing time
    total_zips = 13672  # From your earlier run
    estimated_time = (total_time / len(test_zips)) * total_zips
    print(f"\n[ESTIMATE FOR FULL DATASET]")
    print(f"Estimated time for {total_zips} zip codes: {estimated_time/60:.1f} minutes")
    print(f"That's {estimated_time/3600:.1f} hours (vs 3.8 hours for sequential)")

if __name__ == "__main__":
    asyncio.run(test_fast_processing())
