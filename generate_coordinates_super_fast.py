#!/usr/bin/env python3
"""
SUPER FAST coordinate generator with proper rate limiting and error handling.
This version is much faster than the sequential version while being respectful to the API.
"""

import csv
import json
import asyncio
import aiohttp
import time
import re
from typing import Dict, Tuple, Optional, List

def is_valid_zip(zip_code: str) -> bool:
    """Check if zip code is valid (5 digits)"""
    return bool(re.match(r'^\d{5}$', zip_code.strip()))

async def get_coordinates_async(session: aiohttp.ClientSession, zip_code: str, semaphore: asyncio.Semaphore) -> Tuple[str, Optional[Tuple[float, float]]]:
    """Get coordinates for a zip code with semaphore for rate limiting"""
    async with semaphore:  # Limit concurrent requests
        try:
            url = f"https://nominatim.openstreetmap.org/search?postalcode={zip_code}&country=US&format=json&limit=1"
            headers = {'User-Agent': 'OrganizationSearch/1.0'}
            
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if data and len(data) > 0 and 'lat' in data[0] and 'lon' in data[0]:
                        coords = (float(data[0]['lat']), float(data[0]['lon']))
                        return (zip_code, coords)
                
                return (zip_code, None)
                
        except Exception as e:
            # Don't print errors for individual zip codes to avoid spam
            return (zip_code, None)

async def process_zip_batch(session: aiohttp.ClientSession, zip_batch: List[str], semaphore: asyncio.Semaphore) -> Dict[str, Tuple[float, float]]:
    """Process a batch of zip codes with proper rate limiting"""
    tasks = [get_coordinates_async(session, zip_code, semaphore) for zip_code in zip_batch]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    coordinates_map = {}
    for result in results:
        if isinstance(result, tuple) and len(result) == 2:
            zip_code, coords = result
            if coords:
                coordinates_map[zip_code] = coords
    
    return coordinates_map

def extract_unique_zips(csv_file: str) -> set:
    """Extract all unique valid zip codes from CSV"""
    unique_zips = set()
    
    print(f"Reading CSV file: {csv_file}")
    
    with open(csv_file, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            zip_code = row.get('zip', '').strip()
            if zip_code and is_valid_zip(zip_code):
                unique_zips.add(zip_code)
    
    print(f"Found {len(unique_zips)} unique valid zip codes")
    return unique_zips

async def generate_coordinates_super_fast(csv_file: str, output_file: str = 'zip_coordinates_super_fast.json'):
    """Generate coordinates file using super fast parallel processing with proper rate limiting"""
    
    # Extract unique zip codes
    unique_zips = extract_unique_zips(csv_file)
    
    if not unique_zips:
        print("No valid zip codes found!")
        return
    
    # Configuration for super fast processing
    BATCH_SIZE = 100  # Process 100 zip codes per batch
    MAX_CONCURRENT = 20  # Maximum concurrent requests
    DELAY_BETWEEN_BATCHES = 2  # 2 second delay between batches
    
    print(f"Processing {len(unique_zips)} zip codes in batches of {BATCH_SIZE}")
    print(f"Maximum {MAX_CONCURRENT} concurrent requests")
    print("This will be SUPER FAST while being respectful to the API!")
    
    all_coordinates = {}
    failed_zips = []
    
    # Create semaphore to limit concurrent requests
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    
    # Create async session with optimized settings
    connector = aiohttp.TCPConnector(
        limit=200,  # Total connection pool size
        limit_per_host=50,  # Per-host connection limit
        ttl_dns_cache=300,  # DNS cache TTL
        use_dns_cache=True,
    )
    timeout = aiohttp.ClientTimeout(total=30, connect=10)
    
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        zip_list = sorted(list(unique_zips))
        
        for i in range(0, len(zip_list), BATCH_SIZE):
            batch = zip_list[i:i + BATCH_SIZE]
            batch_num = (i // BATCH_SIZE) + 1
            total_batches = (len(zip_list) + BATCH_SIZE - 1) // BATCH_SIZE
            
            print(f"Processing batch {batch_num}/{total_batches} ({len(batch)} zip codes)...")
            
            start_time = time.time()
            batch_coordinates = await process_zip_batch(session, batch, semaphore)
            end_time = time.time()
            
            # Add successful coordinates
            all_coordinates.update(batch_coordinates)
            
            # Track failed zip codes
            successful_zips = set(batch_coordinates.keys())
            failed_in_batch = [zip_code for zip_code in batch if zip_code not in successful_zips]
            failed_zips.extend(failed_in_batch)
            
            print(f"  Batch completed in {end_time - start_time:.2f} seconds")
            print(f"  Successful: {len(batch_coordinates)}/{len(batch)}")
            print(f"  Total progress: {len(all_coordinates)}/{len(zip_list)} ({len(all_coordinates)/len(zip_list)*100:.1f}%)")
            print(f"  Success rate: {len(all_coordinates)/(len(all_coordinates)+len(failed_zips))*100:.1f}%")
            print("-" * 60)
            
            # Delay between batches to be respectful to the API
            if i + BATCH_SIZE < len(zip_list):
                await asyncio.sleep(DELAY_BETWEEN_BATCHES)
    
    # Save results
    print(f"Saving results to {output_file}...")
    
    result = {
        'metadata': {
            'total_zips_processed': len(unique_zips),
            'successful_zips': len(all_coordinates),
            'failed_zips': len(failed_zips),
            'success_rate': f"{len(all_coordinates)/len(unique_zips)*100:.1f}%",
            'generated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'processing_method': 'Super Fast Parallel Processing',
            'batch_size': BATCH_SIZE,
            'max_concurrent': MAX_CONCURRENT
        },
        'coordinates': {zip_code: {'latitude': coords[0], 'longitude': coords[1]} 
                       for zip_code, coords in all_coordinates.items()},
        'failed_zips': failed_zips
    }
    
    with open(output_file, 'w', encoding='utf-8') as file:
        json.dump(result, file, indent=2, ensure_ascii=False)
    
    print(f"[SUCCESS] Super fast coordinates file generated: {output_file}")
    print(f"[SUMMARY]")
    print(f"   - Total zip codes: {len(unique_zips)}")
    print(f"   - Successful: {len(all_coordinates)}")
    print(f"   - Failed: {len(failed_zips)}")
    print(f"   - Success rate: {len(all_coordinates)/len(unique_zips)*100:.1f}%")
    
    if failed_zips:
        print(f"\n[FAILED ZIP CODES] (first 10)")
        for zip_code in failed_zips[:10]:
            print(f"   - {zip_code}")
        if len(failed_zips) > 10:
            print(f"   ... and {len(failed_zips) - 10} more")

def main():
    csv_file = "01_master_all_states.csv"
    output_file = "zip_coordinates_super_fast.json"
    
    try:
        asyncio.run(generate_coordinates_super_fast(csv_file, output_file))
    except FileNotFoundError:
        print(f"[ERROR] CSV file '{csv_file}' not found!")
        print("Make sure the CSV file is in the same directory as this script.")
    except Exception as e:
        print(f"[ERROR] {e}")

if __name__ == "__main__":
    main()
