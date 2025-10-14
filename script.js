// Global variables
let organizationsData = [];
let isIframeMode = false;
let isDataLoaded = false;
let userLocation = null;
let organizationsWithCoords = [];

// Check if running in iframe
if (window.self !== window.top) {
    isIframeMode = true;
    document.body.classList.add('iframe-mode');
}

// DOM elements
const zipInput = document.getElementById('zipInput');
const searchBtn = document.getElementById('searchBtn');
const stateSelect = document.getElementById('stateSelect');
const housingTypeSelect = document.getElementById('housingTypeSelect');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const searchWithFiltersBtn = document.getElementById('searchWithFiltersBtn');
const proximitySearchBtn = document.getElementById('proximitySearchBtn');
const proximitySearchByZipBtn = document.getElementById('proximitySearchByZipBtn');
const resultsSection = document.getElementById('resultsSection');
const noResults = document.getElementById('noResults');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const resultsContainer = document.getElementById('resultsContainer');
const resultCount = document.getElementById('resultCount');

// URLs from your GitHub repository
const CSV_URL = 'https://raw.githubusercontent.com/jwalith/Test_github_pages/main/01_master_all_states.csv';
const COORDINATES_URL = 'https://raw.githubusercontent.com/jwalith/Test_github_pages/main/zip_coordinates.json';

// Event listeners
searchBtn.addEventListener('click', handleSearch);
zipInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleSearch();
    }
});
clearFiltersBtn.addEventListener('click', clearFilters);
searchWithFiltersBtn.addEventListener('click', handleSearchWithFilters);
proximitySearchBtn.addEventListener('click', handleProximitySearch);
proximitySearchByZipBtn.addEventListener('click', handleProximitySearchByZip);

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Organization Search System loaded');
    loadDataFromCSV();
});

async function loadDataFromCSV() {
    showLoading();
    
    try {
        console.log('Fetching data from:', CSV_URL);
        const response = await fetch(CSV_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('CSV data received, length:', csvText.length);
        
        organizationsData = parseCSV(csvText);
        console.log('Parsed organizations:', organizationsData.length);
        
        // Populate dropdowns with unique values
        populateStateDropdown();
        populateHousingTypeDropdown();
        
        // Load coordinates from JSON file (instant)
        await loadCoordinatesFromJSON();
        
        isDataLoaded = true;
        hideLoading();
        
        // If in iframe, notify parent window
        if (isIframeMode) {
            window.parent.postMessage({
                type: 'search-system-ready',
                message: 'Search system is ready',
                dataCount: organizationsData.length
            }, '*');
        }
        
    } catch (err) {
        console.error('Error loading CSV data:', err);
        hideLoading();
        showError();
    }
}

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const organizations = [];
    
    if (lines.length < 2) {
        console.warn('CSV file appears to be empty or invalid');
        return organizations;
    }
    
    // Get headers (first line)
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    console.log('CSV Headers:', headers);
    
    // Process data lines
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const values = line.split(',').map(v => v.trim());
        
        if (values.length >= headers.length) {
            const org = {};
            
            // Map values to headers
            headers.forEach((header, index) => {
                org[header] = values[index] || '';
            });
            
            // Ensure we have required fields
            if (org.zip || org['zip code'] || org.zipcode) {
                organizations.push({
                    name: org.name || org.organization || org['org name'] || 'Unknown',
                    type: org.housing_type || org.type || org.category || org['org type'] || 'Unknown',
                    zip: String(org.zip || org['zip code'] || org.zipcode || ''),
                    city: org.city || 'Unknown',
                    county: org.county || org['county name'] || 'Unknown',
                    state: org.state || org['state code'] || 'Unknown',
                    phone: org.phone || '',
                    email: org.email || '',
                    address: org.address || ''
                });
            }
        }
    }
    
    return organizations;
}

function handleSearch() {
    if (!isDataLoaded) {
        alert('Data is still loading. Please wait a moment and try again.');
        return;
    }
    
    const zipCode = zipInput.value.trim();
    
    if (!zipCode) {
        alert('Please enter a zip code');
        return;
    }
    
    // Validate zip code format (basic validation)
    if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
        alert('Please enter a valid zip code (e.g., 12345 or 12345-6789)');
        return;
    }
    
    const results = searchByZipCode(zipCode);
    displayResults(results);
}

function searchByZipCode(zipCode) {
    // Normalize zip code (remove dashes and extra spaces)
    const normalizedZip = zipCode.replace(/\D/g, '');
    
    return organizationsData.filter(org => {
        const orgZip = org.zip.replace(/\D/g, '');
        return orgZip === normalizedZip;
    });
}

function searchWithFilters() {
    const zipCode = zipInput.value.trim();
    const selectedState = stateSelect.value;
    const selectedHousingType = housingTypeSelect.value;
    
    let results = organizationsData;
    
    // Filter by zip code if provided
    if (zipCode) {
        const normalizedZip = zipCode.replace(/\D/g, '');
        results = results.filter(org => {
            const orgZip = org.zip.replace(/\D/g, '');
            return orgZip === normalizedZip;
        });
    }
    
    // Filter by state if selected
    if (selectedState) {
        results = results.filter(org => org.state === selectedState);
    }
    
    // Filter by housing type if selected
    if (selectedHousingType) {
        results = results.filter(org => org.type === selectedHousingType);
    }
    
    return results;
}

function populateStateDropdown() {
    const states = [...new Set(organizationsData.map(org => org.state))].sort();
    
    states.forEach(state => {
        if (state && state.length === 2) { // Only add valid state codes
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            stateSelect.appendChild(option);
        }
    });
}

function populateHousingTypeDropdown() {
    const housingTypes = [...new Set(organizationsData.map(org => org.type))].sort();
    
    housingTypes.forEach(type => {
        if (type && type !== 'Unknown') {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            housingTypeSelect.appendChild(option);
        }
    });
}

function clearFilters() {
    zipInput.value = '';
    stateSelect.value = '';
    housingTypeSelect.value = '';
    hideAllSections();
}

function handleSearchWithFilters() {
    if (!isDataLoaded) {
        alert('Data is still loading. Please wait a moment and try again.');
        return;
    }
    
    const zipCode = zipInput.value.trim();
    const selectedState = stateSelect.value;
    const selectedHousingType = housingTypeSelect.value;
    
    // Validate zip code if provided
    if (zipCode && !/^\d{5}(-\d{4})?$/.test(zipCode)) {
        alert('Please enter a valid zip code (e.g., 12345 or 12345-6789)');
        return;
    }
    
    // Check if at least one filter is selected
    if (!zipCode && !selectedState && !selectedHousingType) {
        alert('Please select at least one filter (zip code, state, or housing type)');
        return;
    }
    
    const results = searchWithFilters();
    displayResults(results);
}

// Handle proximity search using current location
async function handleProximitySearch() {
    console.log('Proximity search button clicked');
    
    if (!isDataLoaded) {
        alert('Data is still loading. Please wait a moment and try again.');
        return;
    }
    
    const radiusSelect = document.getElementById('radiusSelect');
    const selectedHousingType = housingTypeSelect.value;
    
    if (!radiusSelect) {
        console.error('Radius select element not found');
        alert('Error: Radius selector not found');
        return;
    }
    
    const radiusMiles = parseInt(radiusSelect.value);
    console.log('Selected radius:', radiusMiles);
    console.log('Selected housing type:', selectedHousingType || 'All Types');
    
    try {
        showLoading();
        console.log('Getting current location...');
        const location = await getCurrentLocation();
        console.log('Location obtained:', location);
        
        console.log('Searching organizations with coordinates and filters...');
        const results = searchByProximityWithFilters(location.latitude, location.longitude, radiusMiles, selectedHousingType);
        console.log('Found results:', results.length);
        
        displayResults(results);
    } catch (error) {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please check your browser permissions or try searching by zip code instead.');
        hideLoading();
    }
}

// Handle proximity search using zip code
async function handleProximitySearchByZip() {
    console.log('Proximity search by zip button clicked');
    
    if (!isDataLoaded) {
        alert('Data is still loading. Please wait a moment and try again.');
        return;
    }
    
    const zipCode = zipInput.value.trim();
    const radiusSelect = document.getElementById('radiusSelect');
    const selectedHousingType = housingTypeSelect.value;
    
    if (!radiusSelect) {
        console.error('Radius select element not found');
        alert('Error: Radius selector not found');
        return;
    }
    
    const radiusMiles = parseInt(radiusSelect.value);
    console.log('Selected radius:', radiusMiles);
    console.log('Selected housing type:', selectedHousingType || 'All Types');
    console.log('Zip code entered:', zipCode);
    
    if (!zipCode) {
        alert('Please enter a zip code for proximity search');
        return;
    }
    
    // Validate zip code format
    if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
        alert('Please enter a valid zip code (e.g., 12345 or 12345-6789)');
        return;
    }
    
    try {
        showLoading();
        console.log('Getting coordinates for zip code:', zipCode);
        const coords = await getCoordinatesFromZip(zipCode);
        console.log('Coordinates obtained:', coords);
        
        console.log('Searching organizations with coordinates and filters...');
        const results = searchByProximityWithFilters(coords.latitude, coords.longitude, radiusMiles, selectedHousingType);
        console.log('Found results:', results.length);
        
        displayResults(results);
    } catch (error) {
        console.error('Error getting coordinates:', error);
        alert('Unable to get coordinates for that zip code. Please try a different zip code.');
        hideLoading();
    }
}

function displayResults(results) {
    hideAllSections();
    
    if (results.length === 0) {
        noResults.style.display = 'block';
        return;
    }
    
    resultsSection.style.display = 'block';
    resultCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''} found`;
    
    resultsContainer.innerHTML = '';
    
    results.forEach(org => {
        const resultCard = createResultCard(org);
        resultsContainer.appendChild(resultCard);
    });
}

function createResultCard(org) {
    const card = document.createElement('div');
    card.className = 'result-card';
    
    // Add distance info if available
    const distanceInfo = org.distance ? `
        <div class="detail-item distance-item">
            <span class="detail-label">Distance</span>
            <span class="detail-value distance-value">${org.distance} miles</span>
        </div>
    ` : '';
    
    card.innerHTML = `
        <h3>${org.name}</h3>
        <div class="result-details">
            ${distanceInfo}
            <div class="detail-item">
                <span class="detail-label">Type</span>
                <span class="detail-value">${org.type}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">City</span>
                <span class="detail-value">${org.city}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">State</span>
                <span class="detail-value">${org.state}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Zip Code</span>
                <span class="detail-value">${org.zip}</span>
            </div>
            ${org.address ? `
            <div class="detail-item">
                <span class="detail-label">Address</span>
                <span class="detail-value">${org.address}</span>
            </div>
            ` : ''}
            ${org.phone ? `
            <div class="detail-item">
                <span class="detail-label">Phone</span>
                <span class="detail-value">${org.phone}</span>
            </div>
            ` : ''}
            ${org.email ? `
            <div class="detail-item">
                <span class="detail-label">Email</span>
                <span class="detail-value">${org.email}</span>
            </div>
            ` : ''}
        </div>
    `;
    
    return card;
}

function showLoading() {
    hideAllSections();
    loading.style.display = 'block';
}

function hideLoading() {
    loading.style.display = 'none';
}

function showError() {
    hideAllSections();
    error.style.display = 'block';
}

function hideAllSections() {
    resultsSection.style.display = 'none';
    noResults.style.display = 'none';
    loading.style.display = 'none';
    error.style.display = 'none';
}

// Listen for messages from parent window (if in iframe)
window.addEventListener('message', function(event) {
    if (event.data.type === 'search-by-zip') {
        zipInput.value = event.data.zipCode;
        handleSearch();
    }
});

// Geolocation and Distance Functions
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                resolve(userLocation);
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    });
}

// Convert zip code to coordinates using a free geocoding service
async function getCoordinatesFromZip(zipCode) {
    try {
        // Using Nominatim (OpenStreetMap) API - more reliable and CORS-friendly
        const response = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=US&format=json&limit=1`, {
            headers: {
                'User-Agent': 'OrganizationSearch/1.0' // Required by Nominatim
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Failed to get coordinates for zip code`);
        }
        
        const data = await response.json();
        
        if (data && data.length > 0 && data[0].lat && data[0].lon) {
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon)
            };
        }
        throw new Error('No coordinates found for zip code');
    } catch (error) {
        console.error('Error getting coordinates:', error);
        throw error;
    }
}

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in miles
}

// Load coordinates from JSON file (instant)
async function loadCoordinatesFromJSON() {
    console.log('Loading coordinates from JSON file...');
    organizationsWithCoords = [];
    
    try {
        const response = await fetch(COORDINATES_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const coordinatesData = await response.json();
        console.log('Coordinates loaded:', Object.keys(coordinatesData.coordinates).length, 'zip codes');
        
        // Add coordinates to organizations
        organizationsData.forEach(org => {
            const coords = coordinatesData.coordinates[org.zip];
            organizationsWithCoords.push({
                ...org,
                latitude: coords ? coords.latitude : null,
                longitude: coords ? coords.longitude : null
            });
        });
        
        console.log(`Added coordinates to ${organizationsWithCoords.length} organizations`);
        
    } catch (error) {
        console.error('Error loading coordinates from JSON:', error);
        alert('Error loading coordinates. Please check if zip_coordinates.json file exists on GitHub.');
        throw error; // Stop execution instead of falling back
    }
}

// Add coordinates to organization data (fallback method)
async function addCoordinatesToOrganizations() {
    console.log('Adding coordinates to organizations...');
    organizationsWithCoords = [];
    
    // Check if we already have coordinates saved locally
    const savedCoordinates = localStorage.getItem('zipCoordinates');
    if (savedCoordinates) {
        console.log('Found saved coordinates in localStorage, loading...');
        const coordinates = JSON.parse(savedCoordinates);
        console.log(`Loaded ${Object.keys(coordinates).length} saved coordinates`);
        
        // Add coordinates to organizations
        organizationsData.forEach(org => {
            const coords = coordinates[org.zip];
            organizationsWithCoords.push({
                ...org,
                latitude: coords ? coords.latitude : null,
                longitude: coords ? coords.longitude : null
            });
        });
        
        console.log(`Added coordinates to ${organizationsWithCoords.length} organizations`);
        return;
    }
    
    // Process organizations in batches to avoid overwhelming the API
    const batchSize = 5; // Reduced batch size to be more respectful to the API
    
    // Filter out invalid zip codes (only keep valid 5-digit zip codes)
    const validZips = [...new Set(organizationsData.map(org => org.zip))]
        .filter(zip => /^\d{5}$/.test(zip)); // Only 5-digit zip codes
    
    console.log(`Found ${validZips.length} valid zip codes out of ${[...new Set(organizationsData.map(org => org.zip))].length} total`);
    
    const zipCoordinates = {};
    
    // Update loading message
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.innerHTML = `
            <div class="spinner"></div>
            <p>Loading coordinates... (${validZips.length} valid zip codes to process)</p>
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
        `;
    }
    
    // Get coordinates for valid zip codes only
    for (let i = 0; i < validZips.length; i += batchSize) {
        const batch = validZips.slice(i, i + batchSize);
        const promises = batch.map(async (zip) => {
            try {
                const coords = await getCoordinatesFromZip(zip);
                zipCoordinates[zip] = coords;
                return { zip, coords };
            } catch (error) {
                console.warn(`Failed to get coordinates for zip ${zip}:`, error);
                return { zip, coords: null };
            }
        });
        
        await Promise.all(promises);
        
        // Update progress
        const progress = ((i + batchSize) / validZips.length) * 100;
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = `${Math.min(progress, 100)}%`;
        }
        
        // Longer delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Save coordinates to localStorage for future use
    console.log('Saving coordinates to localStorage for future use...');
    localStorage.setItem('zipCoordinates', JSON.stringify(zipCoordinates));
    console.log(`Saved ${Object.keys(zipCoordinates).length} coordinates to localStorage`);
    
    // Add coordinates to organizations
    organizationsData.forEach(org => {
        const coords = zipCoordinates[org.zip];
        organizationsWithCoords.push({
            ...org,
            latitude: coords ? coords.latitude : null,
            longitude: coords ? coords.longitude : null
        });
    });
    
    console.log(`Added coordinates to ${organizationsWithCoords.length} organizations`);
}


// Search organizations within a certain radius with housing type filter
function searchByProximityWithFilters(userLat, userLon, radiusMiles, housingType = '') {
    return organizationsWithCoords.filter(org => {
        // Filter by housing type first (if specified)
        if (housingType && org.type !== housingType) {
            return false;
        }
        
        // Then filter by distance
        if (!org.latitude || !org.longitude) return false;
        
        const distance = calculateDistance(userLat, userLon, org.latitude, org.longitude);
        return distance <= radiusMiles;
    }).map(org => {
        const distance = calculateDistance(userLat, userLon, org.latitude, org.longitude);
        return {
            ...org,
            distance: Math.round(distance * 10) / 10 // Round to 1 decimal place
        };
    }).sort((a, b) => a.distance - b.distance); // Sort by distance
}

// Search organizations within a certain radius (legacy function for backward compatibility)
function searchByProximity(userLat, userLon, radiusMiles) {
    return searchByProximityWithFilters(userLat, userLon, radiusMiles, '');
}

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseCSV,
        searchByZipCode,
        calculateDistance,
        searchByProximity
    };
}