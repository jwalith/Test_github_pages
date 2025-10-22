// Global variables
let organizationsData = [];
let isIframeMode = false;
let isDataLoaded = false;
let organizationsWithCoords = [];
let zipCoordinatesData = null;
let cityCoordinatesData = null;

// Check if running in iframe
if (window.self !== window.top) {
    isIframeMode = true;
    document.body.classList.add('iframe-mode');
}

// DOM elements
const zipInput = document.getElementById('zipInput');
const stateSelect = document.getElementById('stateSelect');
const housingTypeSelect = document.getElementById('housingTypeSelect');
const proximityServiceType = document.getElementById('proximityServiceType');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const searchWithFiltersBtn = document.getElementById('searchWithFiltersBtn');
const proximitySearchBtn = document.getElementById('proximitySearchBtn');
const resultsSection = document.getElementById('resultsSection');
const noResults = document.getElementById('noResults');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const resultsContainer = document.getElementById('resultsContainer');
const resultCount = document.getElementById('resultCount');
const newSearchBtn = document.getElementById('newSearchBtn');
const tryAgainBtn = document.getElementById('tryAgainBtn');
const expandSearchBtn = document.getElementById('expandSearchBtn');
const retryBtn = document.getElementById('retryBtn');

// URLs from your GitHub repository
const CSV_URL = 'https://raw.githubusercontent.com/jwalith/Test_github_pages/main/01_master_all_states.csv';
const ZIP_COORDINATES_URL = 'https://raw.githubusercontent.com/jwalith/Test_github_pages/main/zip_coordinates.json';
const CITY_COORDINATES_URL = 'https://raw.githubusercontent.com/jwalith/Test_github_pages/main/city_coordinates.json';

// Event listeners
zipInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleSearchWithFilters();
    }
});
clearFiltersBtn.addEventListener('click', clearFilters);
searchWithFiltersBtn.addEventListener('click', handleSearchWithFilters);
proximitySearchBtn.addEventListener('click', handleProximitySearch);
newSearchBtn.addEventListener('click', resetToSearch);
tryAgainBtn.addEventListener('click', resetToSearch);
expandSearchBtn.addEventListener('click', expandSearch);
retryBtn.addEventListener('click', retryLoadData);

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadDataFromCSV();
});

async function loadDataFromCSV() {
    showLoading();
    
    try {
        const response = await fetch(CSV_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        organizationsData = parseCSV(csvText);
        
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
            
            // Ensure we have required fields - include all records regardless of zip code
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
    
    return organizations;
}

// Helper functions
function validateZipCode(zipCode) {
    return /^\d{5}(-\d{4})?$/.test(zipCode);
}

function checkDataLoaded() {
    if (!isDataLoaded) {
        showUserMessage('Data is still loading. Please wait a moment and try again.', 'warning');
        return false;
    }
    return true;
}

function getRadiusSelect() {
    const radiusSelect = document.getElementById('radiusSelect');
    if (!radiusSelect) {
        console.error('Radius select element not found');
        showUserMessage('Error: Search radius selector not found', 'error');
        return null;
    }
    return radiusSelect;
}

// Removed handleSearch function - now using unified handleSearchWithFilters

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
            
            // Also populate the proximity service type dropdown
            const proximityOption = document.createElement('option');
            proximityOption.value = type;
            proximityOption.textContent = type;
            proximityServiceType.appendChild(proximityOption);
        }
    });
}

function clearFilters() {
    zipInput.value = '';
    stateSelect.value = '';
    housingTypeSelect.value = '';
    proximityServiceType.value = '';
    hideAllSections();
}

// New helper functions for better UX
function resetToSearch() {
    hideAllSections();
    zipInput.focus();
}

function expandSearch() {
    // Increase search radius and try again
    const radiusSelect = getRadiusSelect();
    if (radiusSelect) {
        const currentRadius = parseInt(radiusSelect.value);
        const newRadius = Math.min(currentRadius * 2, 50);
        radiusSelect.value = newRadius;
        
        // Try the last search again with expanded radius
        if (zipInput.value.trim()) {
            handleSearch();
        } else {
            handleProximitySearch();
        }
    }
}

function retryLoadData() {
    hideAllSections();
    loadDataFromCSV();
}

function showUserMessage(message, type = 'info') {
    // Create a more user-friendly message system
    const messageDiv = document.createElement('div');
    messageDiv.className = `user-message ${type}`;
    messageDiv.innerHTML = `
        <div class="message-content">
            <span class="message-icon">${type === 'error' ? '⚠️' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span class="message-text">${message}</span>
            <button class="message-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Add styles if not already added
    if (!document.getElementById('message-styles')) {
        const style = document.createElement('style');
        style.id = 'message-styles';
        style.textContent = `
            .user-message {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1000;
                max-width: 400px;
                animation: slideIn 0.3s ease;
            }
            .user-message.error { border-left: 4px solid #ef4444; }
            .user-message.warning { border-left: 4px solid #f59e0b; }
            .user-message.info { border-left: 4px solid #3b82f6; }
            .message-content {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                gap: 8px;
            }
            .message-icon { font-size: 18px; }
            .message-text { flex: 1; font-size: 14px; }
            .message-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #6b7280;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(messageDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.remove();
        }
    }, 5000);
}

function handleSearchWithFilters() {
    if (!checkDataLoaded()) return;
    
    const zipCode = zipInput.value.trim();
    const selectedState = stateSelect.value;
    const selectedHousingType = housingTypeSelect.value;
    
    // Check if at least one search criteria is provided
    if (!zipCode && !selectedState && !selectedHousingType) {
        showUserMessage('Please enter a zip code, select a state, or choose a service type to search', 'warning');
        return;
    }
    
    // Validate zip code if provided
    if (zipCode && !validateZipCode(zipCode)) {
        showUserMessage('Please enter a valid zip code (e.g., 12345)', 'warning');
        return;
    }
    
    // Perform search with filters
    const results = searchWithFilters();
    displayResults(results, {
        zipCode: zipCode,
        state: selectedState,
        housingType: selectedHousingType,
        searchType: zipCode ? 'zip' : 'filters'
    });
}

// Handle proximity search using current location
async function handleProximitySearch() {
    if (!checkDataLoaded()) return;
    
    const radiusSelect = getRadiusSelect();
    if (!radiusSelect) return;
    
    const selectedHousingType = proximityServiceType.value;
    const radiusMiles = parseInt(radiusSelect.value);
    
    if (isNaN(radiusMiles) || radiusMiles <= 0) {
        showUserMessage('Please select a valid search radius', 'warning');
        return;
    }
    
    try {
        showLoading();
        
        // Show a more specific loading message for location
        const loadingElement = document.querySelector('.loading-content p');
        if (loadingElement) {
            loadingElement.textContent = 'Getting your location...';
        }
        
        const location = await getCurrentLocation();
        
        // Update loading message
        if (loadingElement) {
            loadingElement.textContent = 'Searching for nearby services...';
        }
        
        const results = searchByProximityWithFilters(location.latitude, location.longitude, radiusMiles, selectedHousingType);
        
        displayResults(results, {
            housingType: selectedHousingType,
            radius: radiusMiles,
            searchType: 'proximity'
        });
    } catch (error) {
        console.error('Error getting location:', error);
        hideLoading();
        
        // Provide more specific error messages based on the error type
        let errorMessage = 'Unable to get your location. ';
        
        if (error.code === 1) {
            errorMessage += 'Location access was denied. Please allow location access and try again.';
        } else if (error.code === 2) {
            errorMessage += 'Location is unavailable. Please check your internet connection and try again.';
        } else if (error.code === 3) {
            errorMessage += 'Location request timed out. Please try again.';
        } else {
            errorMessage += 'Please check your browser permissions or try searching by zip code instead.';
        }
        
        showUserMessage(errorMessage, 'error');
    }
}

// Handle proximity search using zip code - REMOVED since we simplified to only have direct zip search and current location search

function displayResults(results, searchContext = {}) {
    hideAllSections();
    
    if (results.length === 0) {
        noResults.style.display = 'block';
        
        // Generate specific "no results" message based on search context
        const message = generateNoResultsMessage(searchContext);
        const messageDiv = noResults.querySelector('.no-results-message');
        messageDiv.innerHTML = `<p>${message}</p>`;
        
        // Scroll to no results section
        setTimeout(() => {
            noResults.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
        return;
    }
    
    resultsSection.style.display = 'block';
    resultCount.textContent = `${results.length} service${results.length !== 1 ? 's' : ''} found`;
    
    resultsContainer.innerHTML = '';
    
    results.forEach(org => {
        const resultCard = createResultCard(org);
        resultsContainer.appendChild(resultCard);
    });
    
    // Scroll to results section
    setTimeout(() => {
        resultsSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 100);
}

function generateNoResultsMessage(searchContext) {
    const { zipCode, state, housingType, radius, searchType } = searchContext;
    
    let message = "No services found";
    
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
    } else if (state) {
        filters.push(`in ${state}`);
    }
    
    if (state && zipCode) {
        filters.push(`in ${state}`);
    }
    
    if (filters.length > 0) {
        message += ` ${filters.join(' ')}`;
    }
    
    return message + ". Try expanding your search or checking nearby areas.";
}

function createResultCard(org) {
    const card = document.createElement('div');
    card.className = 'result-card';
    
    // Add distance info if available
    const distanceInfo = org.distance ? `
        <div class="detail-item distance-item">
            <span class="detail-label">Distance</span>
            <span class="detail-value distance-value">${org.distance} miles away</span>
        </div>
    ` : '';
    
    card.innerHTML = `
        <h3>${org.name}</h3>
        <div class="result-details">
            ${distanceInfo}
            <div class="detail-item">
                <span class="detail-label">Service Type</span>
                <span class="detail-value">${org.type}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Location</span>
                <span class="detail-value">${org.city}, ${org.state} ${org.zip || ''}</span>
            </div>
            ${org.address ? `
            <div class="detail-item">
                <span class="detail-label">Address</span>
                <span class="detail-value">${org.address}</span>
            </div>
            ` : ''}
            ${org.phone ? `
            <div class="detail-item contact-item">
                <span class="detail-label">📞 Phone</span>
                <span class="detail-value">
                    <a href="tel:${org.phone}" class="contact-link phone-link" title="Click to call">
                        ${org.phone}
                    </a>
                </span>
            </div>
            ` : ''}
            ${org.email ? `
            <div class="detail-item contact-item">
                <span class="detail-label">✉️ Email</span>
                <span class="detail-value">
                    <a href="mailto:${org.email}" class="contact-link email-link" title="Click to send email">
                        ${org.email}
                    </a>
                </span>
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
                timeout: 15000, // Increased timeout to 15 seconds
                maximumAge: 300000 // 5 minutes
            }
        );
    });
}

// Get coordinates for a zip code from the loaded JSON data
function getCoordinatesFromZip(zipCode) {
    // Access the globally stored zip coordinates data
    if (!window.zipCoordinatesData) {
        throw new Error('Zip coordinates data not loaded yet');
    }
    
    const coords = window.zipCoordinatesData.coordinates[zipCode];
    
    if (coords && coords.latitude && coords.longitude) {
        return {
            latitude: coords.latitude,
            longitude: coords.longitude
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
        
        // Store globally for access by other functions
        window.zipCoordinatesData = zipCoordinatesData;
        window.cityCoordinatesData = cityCoordinatesData;
        
        // City coordinates are optional (may not exist yet)
        if (cityResponse.ok) {
            cityCoordinatesData = await cityResponse.json();
            window.cityCoordinatesData = cityCoordinatesData;
        } else {
            console.log('City coordinates file not found - will only use zip coordinates');
        }
        
        // Add coordinates to organizations
        organizationsData.forEach(org => {
            let latitude = null;
            let longitude = null;
            let coordinateSource = 'none';
            
            // Try zip coordinates first (but skip empty zip codes)
            if (org.zip && org.zip.trim() !== '' && zipCoordinatesData.coordinates[org.zip]) {
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
        
        // Log basic statistics
        const zipCount = organizationsWithCoords.filter(org => org.coordinateSource === 'zip').length;
        const cityCount = organizationsWithCoords.filter(org => org.coordinateSource === 'city').length;
        const noCoordsCount = organizationsWithCoords.filter(org => org.coordinateSource === 'none').length;
        
        console.log(`Coordinates loaded: ${zipCount} zip-based, ${cityCount} city-based, ${noCoordsCount} no coordinates`);
        
    } catch (error) {
        console.error('Error loading coordinates from JSON:', error);
        showUserMessage('Error loading coordinates. Please check if coordinate files exist on GitHub.', 'error');
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