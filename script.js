// Global variables
let organizationsData = [];
let isIframeMode = false;
let isDataLoaded = false;

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
const resultsSection = document.getElementById('resultsSection');
const noResults = document.getElementById('noResults');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const resultsContainer = document.getElementById('resultsContainer');
const resultCount = document.getElementById('resultCount');

// CSV URL from your GitHub repository
const CSV_URL = 'https://raw.githubusercontent.com/jwalith/Test_github_pages/main/01_master_all_states.csv';

// Event listeners
searchBtn.addEventListener('click', handleSearch);
zipInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleSearch();
    }
});
clearFiltersBtn.addEventListener('click', clearFilters);
searchWithFiltersBtn.addEventListener('click', handleSearchWithFilters);

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
    
    card.innerHTML = `
        <h3>${org.name}</h3>
        <div class="result-details">
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

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseCSV,
        searchByZipCode
    };
}