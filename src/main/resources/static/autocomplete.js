document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const searchInput = document.getElementById('productSearch');
    const resultsContainer = document.getElementById('searchResults');
    const spinner = document.getElementById('searchSpinner');
    const showAllBtn = document.getElementById('showAllBtn');
    const searchAllBtn = document.getElementById('searchAllBtn');

    // Thymeleaf input fields
    const productIdInput = document.getElementById('productIdInput');
    const productNameInput = document.getElementById('productNameInput');

    // Check if there are initial values from Thymeleaf
    const initialProductId = /*[[${productId}]]*/ '';
    const initialProductName = /*[[${productName}]]*/ '';

    // If we have initial values, set the search input value
    if (initialProductId && initialProductName) {
        searchInput.value = initialProductName;
    }

    let debounceTimer;
    let lastQuery = '';
    let allProducts = []; // Cache all products for client-side filtering

    // Fetch all products on page load for faster client-side filtering
    fetchAllProducts()
        .then(products => {
            allProducts = products;
            console.log('Cached ' + products.length + ' products for faster searching');
        })
        .catch(error => {
            console.error('Error pre-fetching products:', error);
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
                if (allProducts.length > 0) {
                    const filteredProducts = filterProductsByName(allProducts, query);

                    showAllBtn.style.display = filteredProducts.length === 0 ? 'block' : 'none';
                    displayResults(filteredProducts, query);
                    resultsContainer.style.display = 'block';
                    spinner.style.display = 'none';
                } else {
                    // Fallback to server-side search if client-side cache is not available
                    searchProductsByName(query)
                        .then(results => {
                            showAllBtn.style.display = results.length === 0 ? 'block' : 'none';
                            displayResults(results, query);
                            resultsContainer.style.display = 'block';
                            spinner.style.display = 'none';
                        })
                        .catch(error => {
                            console.error('Error searching products:', error);
                            resultsContainer.innerHTML = `
                                        <div class="no-results">
                                            <div>Error searching products. Please try again.</div>
                                        </div>
                                    `;
                            resultsContainer.style.display = 'block';
                            spinner.style.display = 'none';
                        });
                }
            }
        }, 300);
    });

    // Show all products when clicking the "Show all" button
    showAllBtn.addEventListener('click', function() {
        fetchAndDisplayAllProducts();
    });

    // Show all products when clicking the "Search All Products" button
    searchAllBtn.addEventListener('click', function() {
        fetchAndDisplayAllProducts();
    });

    // Function to fetch and display all products
    function fetchAndDisplayAllProducts() {
        spinner.style.display = 'block';

        if (allProducts.length > 0) {
            // Use cached products if available
            displayResults(allProducts, '');
            resultsContainer.style.display = 'block';
            showAllBtn.style.display = 'none';
            spinner.style.display = 'none';
        } else {
            fetchAllProducts()
                .then(products => {
                    allProducts = products; // Cache for future use
                    displayResults(products, '');
                    resultsContainer.style.display = 'block';
                    showAllBtn.style.display = 'none';
                    spinner.style.display = 'none';
                })
                .catch(error => {
                    console.error('Error fetching all products:', error);
                    resultsContainer.innerHTML = `
                                <div class="no-results">
                                    <div>Error fetching products. Please try again.</div>
                                </div>
                            `;
                    resultsContainer.style.display = 'block';
                    spinner.style.display = 'none';
                });
        }
    }

    // Don't show dropdown on focus - wait for user to type
    searchInput.addEventListener('focus', function() {
        // Don't show anything on focus, wait for user to type
        resultsContainer.style.display = 'none';

        // Only show "Show all" button if there's a query and no results
        if (lastQuery && !resultsContainer.querySelector('.autocomplete-item')) {
            showAllBtn.style.display = 'block';
        } else {
            showAllBtn.style.display = 'none';
        }
    });

    // Function to search products by name from the database
    async function searchProductsByName(query) {
        try {
            // First try client-side filtering if we have all products cached
            if (allProducts.length > 0) {
                return filterProductsByName(allProducts, query);
            }

            // Otherwise, use server-side search
            const response = await fetch(`/api/products/search?keyword=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            return await response.json();
        } catch (error) {
            console.error('Error searching products:', error);
            throw error;
        }
    }

    // Function to filter products by name only on client side
    function filterProductsByName(products, query) {
        if (!query) return products;

        const lowerQuery = query.toLowerCase();

        return products.filter(product => {
            // Check if product name contains the query
            const productName = (product.name || '').toLowerCase();
            return productName.includes(lowerQuery);
        });
    }

    // Function to fetch all products
    async function fetchAllProducts() {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching all products:', error);
            throw error;
        }
    }

    function displayResults(products, query) {
        resultsContainer.innerHTML = '';

        if (products.length === 0) {
            resultsContainer.innerHTML = `
                        <div class="no-results">
                            <div>No products found${query ? ` for "${query}"` : ''}</div>
                        </div>
                    `;
            resultsContainer.style.display = 'block';
            return;
        }

        // Sort products by relevance if we have a query
        if (query) {
            products = sortProductsByNameRelevance(products, query);
        }

        products.forEach(product => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';

            // Safely get product properties with fallbacks
            const productName = product.name || 'Unnamed Product';
            const productCategory = product.category || 'Uncategorized';
            const productPrice = product.price || 0;

            // Highlight matching text in name
            const highlightedName = query ? highlightMatch(productName, query) : productName;

            div.innerHTML = `
                        <div class="autocomplete-item-name">${highlightedName}</div>
                        <div class="autocomplete-item-details">
                            <span>${productCategory}</span>
                            <span>$${productPrice.toFixed(2)}</span>
                        </div>
                    `;

            div.addEventListener('click', () => {
                selectProduct(product);
                resultsContainer.style.display = 'none';
                showAllBtn.style.display = 'none'; // Hide button after selection
                searchInput.value = productName;
            });

            resultsContainer.appendChild(div);
        });

        resultsContainer.style.display = 'block';
    }

    // Sort products by name relevance to the query
    function sortProductsByNameRelevance(products, query) {
        const lowerQuery = query.toLowerCase();

        return products.sort((a, b) => {
            const aName = (a.name || '').toLowerCase();
            const bName = (b.name || '').toLowerCase();

            // Exact matches at the beginning get highest priority
            const aStartsWithQuery = aName.startsWith(lowerQuery);
            const bStartsWithQuery = bName.startsWith(lowerQuery);

            if (aStartsWithQuery && !bStartsWithQuery) return -1;
            if (!aStartsWithQuery && bStartsWithQuery) return 1;

            // Next priority: contains the query as a whole word
            const aContainsWordQuery = new RegExp('\\b' + escapeRegExp(lowerQuery) + '\\b').test(aName);
            const bContainsWordQuery = new RegExp('\\b' + escapeRegExp(lowerQuery) + '\\b').test(bName);

            if (aContainsWordQuery && !bContainsWordQuery) return -1;
            if (!aContainsWordQuery && bContainsWordQuery) return 1;

            // Next priority: contains the query anywhere
            const aContainsQuery = aName.includes(lowerQuery);
            const bContainsQuery = bName.includes(lowerQuery);

            if (aContainsQuery && !bContainsQuery) return -1;
            if (!aContainsQuery && bContainsQuery) return 1;

            // If both contain the query, sort by name length (shorter names first)
            return aName.length - bName.length;
        });
    }

    function selectProduct(product) {
        // Update the Thymeleaf input values
        productIdInput.value = product.id || '';
        productNameInput.value = product.name || '';

        console.log('Selected product: ' + JSON.stringify({
            id: product.id,
            name: product.name
        }));

        // In a real application, you might want to submit these values to the server
        // or update a hidden form that will be submitted later
    }

    // Highlight matching text in product name
    function highlightMatch(text, query) {
        if (!query || !text) return text || '';

        // Escape special regex characters in the query
        const escapedQuery = escapeRegExp(query);

        // Create a regex that matches the query (case insensitive)
        const regex = new RegExp(`(${escapedQuery})`, 'gi');

        // Replace matches with highlighted version
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    // Helper function to escape regex special characters
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Close autocomplete when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) &&
            !resultsContainer.contains(e.target) &&
            !showAllBtn.contains(e.target) &&
            !searchAllBtn.contains(e.target)) {
            resultsContainer.style.display = 'none';

            // Only show "Show all" button if there's a query and no results were found
            if (lastQuery && !resultsContainer.querySelector('.autocomplete-item')) {
                showAllBtn.style.display = 'block';
            } else {
                showAllBtn.style.display = 'none';
            }
        }
    });

    // Code tabs functionality
    const codeTabs = document.querySelectorAll('.code-tab');
    const codeContents = document.querySelectorAll('.code-content');

    codeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            codeTabs.forEach(t => t.classList.remove('active'));
            codeContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.querySelector(`.code-content[data-content="${tabId}"]`).classList.add('active');
        });
    });
});document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const searchInput = document.getElementById('productSearch');
    const resultsContainer = document.getElementById('searchResults');
    const spinner = document.getElementById('searchSpinner');
    const showAllBtn = document.getElementById('showAllBtn');
    const searchAllBtn = document.getElementById('searchAllBtn');

    // Thymeleaf input fields
    const productIdInput = document.getElementById('productIdInput');
    const productNameInput = document.getElementById('productNameInput');

    // Check if there are initial values from Thymeleaf
    const initialProductId = /*[[${productId}]]*/ '';
    const initialProductName = /*[[${productName}]]*/ '';

    // If we have initial values, set the search input value
    if (initialProductId && initialProductName) {
        searchInput.value = initialProductName;
    }

    let debounceTimer;
    let lastQuery = '';
    let allProducts = []; // Cache all products for client-side filtering

    // Fetch all products on page load for faster client-side filtering
    fetchAllProducts()
        .then(products => {
            allProducts = products;
            console.log('Cached ' + products.length + ' products for faster searching');
        })
        .catch(error => {
            console.error('Error pre-fetching products:', error);
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
                if (allProducts.length > 0) {
                    const filteredProducts = filterProductsByName(allProducts, query);

                    showAllBtn.style.display = filteredProducts.length === 0 ? 'block' : 'none';
                    displayResults(filteredProducts, query);
                    resultsContainer.style.display = 'block';
                    spinner.style.display = 'none';
                } else {
                    // Fallback to server-side search if client-side cache is not available
                    searchProductsByName(query)
                        .then(results => {
                            showAllBtn.style.display = results.length === 0 ? 'block' : 'none';
                            displayResults(results, query);
                            resultsContainer.style.display = 'block';
                            spinner.style.display = 'none';
                        })
                        .catch(error => {
                            console.error('Error searching products:', error);
                            resultsContainer.innerHTML = `
                                        <div class="no-results">
                                            <div>Error searching products. Please try again.</div>
                                        </div>
                                    `;
                            resultsContainer.style.display = 'block';
                            spinner.style.display = 'none';
                        });
                }
            }
        }, 300);
    });

    // Show all products when clicking the "Show all" button
    showAllBtn.addEventListener('click', function() {
        fetchAndDisplayAllProducts();
    });

    // Show all products when clicking the "Search All Products" button
    searchAllBtn.addEventListener('click', function() {
        fetchAndDisplayAllProducts();
    });

    // Function to fetch and display all products
    function fetchAndDisplayAllProducts() {
        spinner.style.display = 'block';

        if (allProducts.length > 0) {
            // Use cached products if available
            displayResults(allProducts, '');
            resultsContainer.style.display = 'block';
            showAllBtn.style.display = 'none';
            spinner.style.display = 'none';
        } else {
            fetchAllProducts()
                .then(products => {
                    allProducts = products; // Cache for future use
                    displayResults(products, '');
                    resultsContainer.style.display = 'block';
                    showAllBtn.style.display = 'none';
                    spinner.style.display = 'none';
                })
                .catch(error => {
                    console.error('Error fetching all products:', error);
                    resultsContainer.innerHTML = `
                                <div class="no-results">
                                    <div>Error fetching products. Please try again.</div>
                                </div>
                            `;
                    resultsContainer.style.display = 'block';
                    spinner.style.display = 'none';
                });
        }
    }

    // Don't show dropdown on focus - wait for user to type
    searchInput.addEventListener('focus', function() {
        // Don't show anything on focus, wait for user to type
        resultsContainer.style.display = 'none';

        // Only show "Show all" button if there's a query and no results
        if (lastQuery && !resultsContainer.querySelector('.autocomplete-item')) {
            showAllBtn.style.display = 'block';
        } else {
            showAllBtn.style.display = 'none';
        }
    });

    // Function to search products by name from the database
    async function searchProductsByName(query) {
        try {
            // First try client-side filtering if we have all products cached
            if (allProducts.length > 0) {
                return filterProductsByName(allProducts, query);
            }

            // Otherwise, use server-side search
            const response = await fetch(`/api/products/search?keyword=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            return await response.json();
        } catch (error) {
            console.error('Error searching products:', error);
            throw error;
        }
    }

    // Function to filter products by name only on client side
    function filterProductsByName(products, query) {
        if (!query) return products;

        const lowerQuery = query.toLowerCase();

        return products.filter(product => {
            // Check if product name contains the query
            const productName = (product.name || '').toLowerCase();
            return productName.includes(lowerQuery);
        });
    }

    // Function to fetch all products
    async function fetchAllProducts() {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching all products:', error);
            throw error;
        }
    }

    function displayResults(products, query) {
        resultsContainer.innerHTML = '';

        if (products.length === 0) {
            resultsContainer.innerHTML = `
                        <div class="no-results">
                            <div>No products found${query ? ` for "${query}"` : ''}</div>
                        </div>
                    `;
            resultsContainer.style.display = 'block';
            return;
        }

        // Sort products by relevance if we have a query
        if (query) {
            products = sortProductsByNameRelevance(products, query);
        }

        products.forEach(product => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';

            // Safely get product properties with fallbacks
            const productName = product.name || 'Unnamed Product';
            const productCategory = product.category || 'Uncategorized';
            const productPrice = product.price || 0;

            // Highlight matching text in name
            const highlightedName = query ? highlightMatch(productName, query) : productName;

            div.innerHTML = `
                        <div class="autocomplete-item-name">${highlightedName}</div>
                        <div class="autocomplete-item-details">
                            <span>${productCategory}</span>
                            <span>$${productPrice.toFixed(2)}</span>
                        </div>
                    `;

            div.addEventListener('click', () => {
                selectProduct(product);
                resultsContainer.style.display = 'none';
                showAllBtn.style.display = 'none'; // Hide button after selection
                searchInput.value = productName;
            });

            resultsContainer.appendChild(div);
        });

        resultsContainer.style.display = 'block';
    }

    // Sort products by name relevance to the query
    function sortProductsByNameRelevance(products, query) {
        const lowerQuery = query.toLowerCase();

        return products.sort((a, b) => {
            const aName = (a.name || '').toLowerCase();
            const bName = (b.name || '').toLowerCase();

            // Exact matches at the beginning get highest priority
            const aStartsWithQuery = aName.startsWith(lowerQuery);
            const bStartsWithQuery = bName.startsWith(lowerQuery);

            if (aStartsWithQuery && !bStartsWithQuery) return -1;
            if (!aStartsWithQuery && bStartsWithQuery) return 1;

            // Next priority: contains the query as a whole word
            const aContainsWordQuery = new RegExp('\\b' + escapeRegExp(lowerQuery) + '\\b').test(aName);
            const bContainsWordQuery = new RegExp('\\b' + escapeRegExp(lowerQuery) + '\\b').test(bName);

            if (aContainsWordQuery && !bContainsWordQuery) return -1;
            if (!aContainsWordQuery && bContainsWordQuery) return 1;

            // Next priority: contains the query anywhere
            const aContainsQuery = aName.includes(lowerQuery);
            const bContainsQuery = bName.includes(lowerQuery);

            if (aContainsQuery && !bContainsQuery) return -1;
            if (!aContainsQuery && bContainsQuery) return 1;

            // If both contain the query, sort by name length (shorter names first)
            return aName.length - bName.length;
        });
    }

    function selectProduct(product) {
        // Update the Thymeleaf input values
        productIdInput.value = product.id || '';
        productNameInput.value = product.name || '';

        console.log('Selected product: ' + JSON.stringify({
            id: product.id,
            name: product.name
        }));

        // In a real application, you might want to submit these values to the server
        // or update a hidden form that will be submitted later
    }

    // Highlight matching text in product name
    function highlightMatch(text, query) {
        if (!query || !text) return text || '';

        // Escape special regex characters in the query
        const escapedQuery = escapeRegExp(query);

        // Create a regex that matches the query (case insensitive)
        const regex = new RegExp(`(${escapedQuery})`, 'gi');

        // Replace matches with highlighted version
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    // Helper function to escape regex special characters
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Close autocomplete when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) &&
            !resultsContainer.contains(e.target) &&
            !showAllBtn.contains(e.target) &&
            !searchAllBtn.contains(e.target)) {
            resultsContainer.style.display = 'none';

            // Only show "Show all" button if there's a query and no results were found
            if (lastQuery && !resultsContainer.querySelector('.autocomplete-item')) {
                showAllBtn.style.display = 'block';
            } else {
                showAllBtn.style.display = 'none';
            }
        }
    });

    // Code tabs functionality
    const codeTabs = document.querySelectorAll('.code-tab');
    const codeContents = document.querySelectorAll('.code-content');

    codeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            codeTabs.forEach(t => t.classList.remove('active'));
            codeContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.querySelector(`.code-content[data-content="${tabId}"]`).classList.add('active');
        });
    });
});