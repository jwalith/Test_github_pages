// Global variables
let organizationsData = [];
let isIframeMode = false;
let isDataLoaded = false;
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
const ZIP_COORDINATES_URL = 'https://raw.githubusercontent.com/jwalith/Test_github_pages/main/zip_coordinates.json';
const CITY_COORDINATES_URL = 'https://raw.githubusercontent.com/jwalith/Test_github_pages/main/city_coordinates.json';

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

// Helper functions
function validateZipCode(zipCode) {
    return /^\d{5}(-\d{4})?$/.test(zipCode);
}

function checkDataLoaded() {
    if (!isDataLoaded) {
        alert('Data is still loading. Please wait a moment and try again.');
        return false;
    }
    return true;
}

function getRadiusSelect() {
    const radiusSelect = document.getElementById('radiusSelect');
    if (!radiusSelect) {
        console.error('Radius select element not found');
        alert('Error: Radius selector not found');
        return null;
    }
    return radiusSelect;
}

function handleSearch() {
    if (!checkDataLoaded()) return;
    
    const zipCode = zipInput.value.trim();
    
    if (!zipCode) {
        alert('Please enter a zip code');
        return;
    }
    
    if (!validateZipCode(zipCode)) {
        alert('Please enter a valid zip code (e.g., 12345 or 12345-6789)');
        return;
    }
    
    const results = searchByZipCode(zipCode);
    displayResults(results, {
        zipCode: zipCode,
        searchType: 'zip'
    });
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
    if (!checkDataLoaded()) return;
    
    const zipCode = zipInput.value.trim();
    const selectedState = stateSelect.value;
    const selectedHousingType = housingTypeSelect.value;
    
    if (zipCode && !validateZipCode(zipCode)) {
        alert('Please enter a valid zip code (e.g., 12345 or 12345-6789)');
        return;
    }
    
    if (!zipCode && !selectedState && !selectedHousingType) {
        alert('Please select at least one filter (zip code, state, or housing type)');
        return;
    }
    
    const results = searchWithFilters();
    displayResults(results, {
        zipCode: zipCode,
        state: selectedState,
        housingType: selectedHousingType,
        searchType: 'filters'
    });
}

// Handle proximity search using current location
async function handleProximitySearch() {
    if (!checkDataLoaded()) return;
    
    const radiusSelect = getRadiusSelect();
    if (!radiusSelect) return;
    
    const selectedHousingType = housingTypeSelect.value;
    const radiusMiles = parseInt(radiusSelect.value);
    
    try {
        showLoading();
        const location = await getCurrentLocation();
        
        const results = searchByProximityWithFilters(location.latitude, location.longitude, radiusMiles, selectedHousingType);
        
        displayResults(results, {
            housingType: selectedHousingType,
            radius: radiusMiles,
            searchType: 'proximity'
        });
    } catch (error) {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please check your browser permissions or try searching by zip code instead.');
        hideLoading();
    }
}

// Handle proximity search using zip code
async function handleProximitySearchByZip() {
    if (!checkDataLoaded()) return;
    
    const zipCode = zipInput.value.trim();
    const radiusSelect = getRadiusSelect();
    if (!radiusSelect) return;
    
    const selectedHousingType = housingTypeSelect.value;
    const radiusMiles = parseInt(radiusSelect.value);
    
    if (!zipCode) {
        alert('Please enter a zip code for proximity search');
        return;
    }
    
    if (!validateZipCode(zipCode)) {
        alert('Please enter a valid zip code (e.g., 12345 or 12345-6789)');
        return;
    }
    
    try {
        showLoading();
        const coords = getCoordinatesFromZip(zipCode);
        
        const results = searchByProximityWithFilters(coords.latitude, coords.longitude, radiusMiles, selectedHousingType);
        
        displayResults(results, {
            zipCode: zipCode,
            housingType: selectedHousingType,
            radius: radiusMiles,
            searchType: 'proximity'
        });
    } catch (error) {
        console.error('Error getting coordinates:', error);
        alert('Unable to get coordinates for that zip code. Please try a different zip code.');
        hideLoading();
    }
}

function displayResults(results, searchContext = {}) {
    hideAllSections();
    
    if (results.length === 0) {
        noResults.style.display = 'block';
        
        // Generate specific "no results" message based on search context
        const message = generateNoResultsMessage(searchContext);
        noResults.innerHTML = `<p>${message}</p>`;
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

function generateNoResultsMessage(searchContext) {
    const { zipCode, state, housingType, radius, searchType } = searchContext;
    
    let message = "No organizations found";
    
    // Build the message based on applied filters
    const filters = [];
    
    if (housingType) {
        filters.push(`"${housingType}"`);
    }
    
    if (searchType === 'proximity') {
        if (radius) {
            filters.push(`within ${radius} miles`);
        }
        if (zipCode) {
            filters.push(`of zip code ${zipCode}`);
        } else {
            filters.push(`near your location`);
        }
    } else if (zipCode) {
        filters.push(`in zip code ${zipCode}`);
    }
    
    if (state) {
        filters.push(`in ${state}`);
    }
    
    if (filters.length > 0) {
        message += ` ${filters.join(' ')}`;
    }
    
    return message + ".";
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
    
    // Add coordinate source info for proximity searches
    const coordinateSourceInfo = org.coordinateSource && org.distance ? `
        <div class="detail-item coordinate-source">
            <span class="detail-label">Location</span>
            <span class="detail-value">${org.coordinateSource === 'zip' ? 'Precise (zip code)' : 'Approximate (city center)'}</span>
        </div>
    ` : '';
    
    card.innerHTML = `
        <h3>${org.name}</h3>
        <div class="result-details">
            ${distanceInfo}
            ${coordinateSourceInfo}
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
                <span class="detail-value">${org.zip || 'N/A'}</span>
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
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
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

// Get coordinates for a zip code from the loaded JSON data
function getCoordinatesFromZip(zipCode) {
    // Find the zip coordinates in our loaded data
    const zipCoords = organizationsWithCoords.find(org => org.zip === zipCode);
    
    if (zipCoords && zipCoords.latitude && zipCoords.longitude) {
        return {
            latitude: zipCoords.latitude,
            longitude: zipCoords.longitude
        };
    }
    
    // If not found in our data, throw an error
    throw new Error(`No coordinates found for zip code ${zipCode}`);
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

// Load coordinates from JSON files (instant)
async function loadCoordinatesFromJSON() {
    organizationsWithCoords = [];
    
    try {
        // Load both zip and city coordinates
        const [zipResponse, cityResponse] = await Promise.all([
            fetch(ZIP_COORDINATES_URL),
            fetch(CITY_COORDINATES_URL)
        ]);
        
        if (!zipResponse.ok) {
            throw new Error(`HTTP error loading zip coordinates! status: ${zipResponse.status}`);
        }
        
        const zipCoordinatesData = await zipResponse.json();
        let cityCoordinatesData = null;
        
        // City coordinates are optional (may not exist yet)
        if (cityResponse.ok) {
            cityCoordinatesData = await cityResponse.json();
        } else {
            console.log('City coordinates file not found - will only use zip coordinates');
        }
        
        // Add coordinates to organizations
        organizationsData.forEach(org => {
            let latitude = null;
            let longitude = null;
            let coordinateSource = 'none';
            
            // Try zip coordinates first
            if (org.zip && zipCoordinatesData.coordinates[org.zip]) {
                const coords = zipCoordinatesData.coordinates[org.zip];
                latitude = coords.latitude;
                longitude = coords.longitude;
                coordinateSource = 'zip';
            }
            // Fall back to city coordinates if zip not available
            else if (cityCoordinatesData && org.city && org.state) {
                const cityKey = `${org.city}, ${org.state}`;
                const cityCoords = cityCoordinatesData.city_coordinates[cityKey];
                if (cityCoords) {
                    latitude = cityCoords.latitude;
                    longitude = cityCoords.longitude;
                    coordinateSource = 'city';
                }
            }
            
            organizationsWithCoords.push({
                ...org,
                latitude: latitude,
                longitude: longitude,
                coordinateSource: coordinateSource
            });
        });
        
        // Log statistics
        const zipCount = organizationsWithCoords.filter(org => org.coordinateSource === 'zip').length;
        const cityCount = organizationsWithCoords.filter(org => org.coordinateSource === 'city').length;
        const noCoordsCount = organizationsWithCoords.filter(org => org.coordinateSource === 'none').length;
        
        console.log(`Coordinates loaded: ${zipCount} zip-based, ${cityCount} city-based, ${noCoordsCount} no coordinates`);
        
    } catch (error) {
        console.error('Error loading coordinates from JSON:', error);
        alert('Error loading coordinates. Please check if coordinate files exist on GitHub.');
        throw error; // Stop execution instead of falling back
    }
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