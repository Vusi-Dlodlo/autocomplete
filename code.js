document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const searchInput = document.getElementById('workitemSearch');
    const resultsContainer = document.getElementById('searchResults');
    const spinner = document.getElementById('searchSpinner');
    const showAllBtn = document.getElementById('showAllBtn');
    const searchAllBtn = document.getElementById('searchAllBtn');

    // Thymeleaf input fields
    const workitemIdInput = document.getElementById('workitemIdInput');
    const workitemNameInput = document.getElementById('workitemNameInput');
    const workitemEmailInput = document.getElementById('workitemEmailInput');
    const workitemDescriptionInput = document.getElementById('workitemDescriptionInput');
    const workitemVersionInput = document.getElementById('workitemVersionInput');

    // Check if there are initial values from Thymeleaf
    const initialWorkitemId = /*[[${id}]]*/ '';
    const initialWorkitemName = /*[[${name}]]*/ '';
    const initialWorkitemEmail = /*[[${email}]]*/ '';
    const initialWorkitemDescription = /*[[${description}]]*/ '';
    const initialWorkitemVersion = /*[[${version}]]*/ '';

    // If we have initial values, set the search input value and other Thymeleaf inputs
    if (initialWorkitemId && initialWorkitemName) {
        searchInput.value = initialWorkitemName;
        workitemIdInput.value = initialWorkitemId;
        workitemNameInput.value = initialWorkitemName;
        workitemEmailInput.value = initialWorkitemEmail;
        workitemDescriptionInput.value = initialWorkitemDescription;
        workitemVersionInput.value = initialWorkitemVersion;
    }

    let debounceTimer;
    let lastQuery = '';
    let allWorkitems = []; // Cache all workitems for client-side filtering

    // Fetch all workitems on page load for faster client-side filtering
    fetchAllWorkitems()
        .then(workitems => {
            allWorkitems = workitems;
            console.log('Cached ' + workitems.length + ' workitems for faster searching');
        })
        .catch(error => {
            console.error('Error pre-fetching workitems:', error);
        });

    // Show results as soon as the user starts typing (from first character)
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        lastQuery = query;

        clearTimeout(debounceTimer);

        // Show loading spinner
        spinner.style.display = 'block';

        debounceTimer = setTimeout(() => {
            if (query === '') {
                // If empty query, don't show any results
                resultsContainer.style.display = 'none';
                showAllBtn.style.display = 'none';
                spinner.style.display = 'none';
            } else {
                // Use client-side filtering for immediate results
                if (allWorkitems.length > 0) {
                    const filteredWorkitems = filterWorkitemsByName(allWorkitems, query);

                    showAllBtn.style.display = filteredWorkitems.length === 0 ? 'block' : 'none';
                    displayResults(filteredWorkitems, query);
                    resultsContainer.style.display = 'block';
                    spinner.style.display = 'none';
                } else {
                    // Fallback to server-side search if client-side cache is not available
                    searchWorkitemsByName(query)
                        .then(results => {
                            showAllBtn.style.display = results.length === 0 ? 'block' : 'none';
                            displayResults(results, query);
                            resultsContainer.style.display = 'block';
                            spinner.style.display = 'none';
                        })
                        .catch(error => {
                            console.error('Error searching workitems:', error);
                            resultsContainer.innerHTML = `
                                        <div class="no-results">
                                            <div>Error searching workitems. Please try again.</div>
                                        </div>
                                    `;
                            resultsContainer.style.display = 'block';
                            spinner.style.display = 'none';
                        });
                }
            }
        }, 300);
    });

    // Show all workitems when clicking the "Show all" button
    showAllBtn.addEventListener('click', function() {
        fetchAndDisplayAllWorkitems();
    });

    // Show all workitems when clicking the "Search All Workitems" button
    searchAllBtn.addEventListener('click', function() {
        fetchAndDisplayAllWorkitems();
    });

    // Function to fetch and display all workitems
    function fetchAndDisplayAllWorkitems() {
        spinner.style.display = 'block';

        if (allWorkitems.length > 0) {
            // Use cached workitems if available
            displayResults(allWorkitems, '');
            resultsContainer.style.display = 'block';
            showAllBtn.style.display = 'none';
            spinner.style.display = 'none';
        } else {
            fetchAllWorkitems()
                .then(workitems => {
                    allWorkitems = workitems; // Cache for future use
                    displayResults(workitems, '');
                    resultsContainer.style.display = 'block';
                    showAllBtn.style.display = 'none';
                    spinner.style.display = 'none';
                })
                .catch(error => {
                    console.error('Error fetching all workitems:', error);
                    resultsContainer.innerHTML = `
                                <div class="no-results">
                                    <div>Error fetching workitems. Please try again.</div>
                                </div>
                            `;
                    resultsContainer.style.display = 'block';
                    spinner.style.display = 'none';
                });
        }
    }

    // Don't show dropdown on focus - wait for user to type
    searchInput.addEventListener('focus', function() {
        resultsContainer.style.display = 'none';

        if (lastQuery && !resultsContainer.querySelector('.autocomplete-item')) {
            showAllBtn.style.display = 'block';
        } else {
            showAllBtn.style.display = 'none';
        }
    });

    // Function to search workitems by name from the database
    async function searchWorkitemsByName(query) {
        try {
            if (allWorkitems.length > 0) {
                return filterWorkitemsByName(allWorkitems, query);
            }

            const response = await fetch(`/api/workitems/search?keyword=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            return await response.json();
        } catch (error) {
            console.error('Error searching workitems:', error);
            throw error;
        }
    }

    // Function to filter workitems by name on client side
    function filterWorkitemsByName(workitems, query) {
        if (!query) return workitems;

        const lowerQuery = query.toLowerCase();

        return workitems.filter(workitem => {
            const workitemName = (workitem.name || '').toLowerCase();
            return workitemName.includes(lowerQuery);
        });
    }

    // Function to fetch all workitems
    async function fetchAllWorkitems() {
        try {
            const response = await fetch('/api/workitems');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching all workitems:', error);
            throw error;
        }
    }

    // Function to display results
    function displayResults(workitems, query) {
        resultsContainer.innerHTML = '';

        if (workitems.length === 0) {
            resultsContainer.innerHTML = `
                        <div class="no-results">
                            <div>No workitems found${query ? ` for "${query}"` : ''}</div>
                        </div>
                    `;
            resultsContainer.style.display = 'block';
            return;
        }

        if (query) {
            workitems = sortWorkitemsByNameRelevance(workitems, query);
        }

        workitems.forEach(workitem => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';

            const name = workitem.name || 'Unnamed Workitem';
            const email = workitem.email || 'No Email';
            const description = workitem.description || 'No Description';
            const version = workitem.version || 'N/A';

            const highlightedName = query ? highlightMatch(name, query) : name;

            div.innerHTML = `
                <div class="autocomplete-item-name">${highlightedName}</div>
                <div class="autocomplete-item-details">
                    <span>Email: ${email}</span>
                    <span>Description: ${description}</span>
                    <span>Version: ${version}</span>
                </div>
            `;

            div.addEventListener('click', () => {
                selectWorkitem(workitem);
                resultsContainer.style.display = 'none';
                showAllBtn.style.display = 'none';
                searchInput.value = name;
            });

            resultsContainer.appendChild(div);
        });

        resultsContainer.style.display = 'block';
    }

    // Sort workitems by name relevance
    function sortWorkitemsByNameRelevance(workitems, query) {
        const lowerQuery = query.toLowerCase();

        return workitems.sort((a, b) => {
            const aName = (a.name || '').toLowerCase();
            const bName = (b.name || '').toLowerCase();

            const aStartsWithQuery = aName.startsWith(lowerQuery);
            const bStartsWithQuery = bName.startsWith(lowerQuery);

            if (aStartsWithQuery && !bStartsWithQuery) return -1;
            if (!aStartsWithQuery && bStartsWithQuery) return 1;

            const aContainsWordQuery = new RegExp('\\b' + escapeRegExp(lowerQuery) + '\\b').test(aName);
            const bContainsWordQuery = new RegExp('\\b' + escapeRegExp(lowerQuery) + '\\b').test(bName);

            if (aContainsWordQuery && !bContainsWordQuery) return -1;
            if (!aContainsWordQuery && bContainsWordQuery) return 1;

            const aContainsQuery = aName.includes(lowerQuery);
            const bContainsQuery = bName.includes(lowerQuery);

            if (aContainsQuery && !bContainsQuery) return -1;
            if (!aContainsQuery && bContainsQuery) return 1;

            return aName.length - bName.length;
        });
    }

    // Select a workitem, update Thymeleaf inputs
    function selectWorkitem(workitem) {
        workitemIdInput.value = workitem.id || '';
        workitemNameInput.value = workitem.name || '';
        workitemEmailInput.value = workitem.email || '';
        workitemDescriptionInput.value = workitem.description || '';
        workitemVersionInput.value = workitem.version || '';

        console.log('Selected workitem:', JSON.stringify({
            id: workitem.id,
            name: workitem.name,
            email: workitem.email,
            description: workitem.description,
            version: workitem.version
        }));

        // Submit or further processing can be done here
    }

    // Highlight matching text
    function highlightMatch(text, query) {
        if (!query || !text) return text || '';

        const escapedQuery = escapeRegExp(query);
        const regex = new RegExp(`(${escapedQuery})`, 'gi');

        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    // Escape regex special chars
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    }

    // Close autocomplete on outside click
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) &&
            !resultsContainer.contains(e.target) &&
            !showAllBtn.contains(e.target) &&
            !searchAllBtn.contains(e.target)) {
            resultsContainer.style.display = 'none';

            if (lastQuery && !resultsContainer.querySelector('.autocomplete-item')) {
                showAllBtn.style.display = 'block';
            } else {
                showAllBtn.style.display = 'none';
            }
        }
    });
});

