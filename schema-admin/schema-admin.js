// Schema Administrator JavaScript
// Main application logic for managing unified tactic schemas

// Global state
const SchemaState = {
    currentSchema: {
        version: 2,
        products: {},
        subproducts: {},
        connections: {} // productId -> [subproductIds]
    },
    currentProduct: null,
    currentSubProduct: null,
    currentTable: null,
    currentExtractor: null,
    currentBenchmark: null,
    unsavedChanges: false,
    activeFilter: null // 'products', 'subproducts', or null
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadSchemaFromStorage();
    renderHierarchyTree();
    updateStatistics();
});

// Event Listeners
function initializeEventListeners() {
    // Product management
    document.getElementById('add-product-btn').addEventListener('click', showAddProductModal);
    document.getElementById('add-subproduct-btn').addEventListener('click', showAddSubProductModal);
    document.getElementById('delete-product-btn').addEventListener('click', deleteCurrentProduct);
    document.getElementById('save-basic-btn').addEventListener('click', saveBasicInfo);
    
    // Modal forms
    document.getElementById('add-product-form').addEventListener('submit', handleAddProduct);
    document.getElementById('add-subproduct-form').addEventListener('submit', handleAddSubProduct);
    document.getElementById('edit-product-form').addEventListener('submit', handleEditProduct);
    document.getElementById('edit-subproduct-form').addEventListener('submit', handleEditSubProduct);
    
    // Modal buttons
    document.getElementById('delete-product-modal-btn').addEventListener('click', handleDeleteProductModal);
    document.getElementById('delete-subproduct-modal-btn').addEventListener('click', handleDeleteSubProductModal);
    
    // Table management
    document.getElementById('add-table-btn').addEventListener('click', addNewTable);
    document.getElementById('save-table-btn').addEventListener('click', saveTable);
    document.getElementById('cancel-table-btn').addEventListener('click', cancelTableEdit);
    document.getElementById('delete-table-btn').addEventListener('click', deleteTable);
    document.getElementById('infer-headers-btn').addEventListener('click', () => {
        document.getElementById('csv-upload').click();
    });
    document.getElementById('csv-upload').addEventListener('change', inferHeadersFromCSV);
    
    // Extractor management
    document.getElementById('add-extractor-btn').addEventListener('click', addNewExtractor);
    document.getElementById('save-extractor-btn').addEventListener('click', saveExtractor);
    document.getElementById('cancel-extractor-btn').addEventListener('click', cancelExtractorEdit);
    document.getElementById('delete-extractor-btn').addEventListener('click', deleteExtractor);
    document.getElementById('test-extractor-btn').addEventListener('click', testExtractor);
    
    // Benchmark management
    document.getElementById('add-benchmark-btn').addEventListener('click', addNewBenchmark);
    document.getElementById('save-benchmark-btn').addEventListener('click', saveBenchmark);
    document.getElementById('cancel-benchmark-btn').addEventListener('click', cancelBenchmarkEdit);
    document.getElementById('delete-benchmark-btn').addEventListener('click', deleteBenchmark);
    
    // AI Config
    document.getElementById('save-ai-btn').addEventListener('click', saveAIConfig);
    
    // Import/Export
    document.getElementById('import-btn').addEventListener('click', showImportModal);
    document.getElementById('export-btn').addEventListener('click', exportSchema);
    document.getElementById('import-file-btn').addEventListener('click', () => {
        document.getElementById('import-file-input').click();
    });
    document.getElementById('import-file-input').addEventListener('change', importSchemaFile);
    document.getElementById('import-legacy-btn').addEventListener('click', importLegacyFormat);
    
    // Testing
    document.getElementById('test-filename-btn').addEventListener('click', testFilenameMapping);
    document.getElementById('test-csv-btn').addEventListener('click', testCSVHeaders);
    
    // Search
    document.getElementById('hierarchy-search').addEventListener('input', filterHierarchy);
    
    // Filter buttons
    document.getElementById('products-count').addEventListener('click', () => toggleFilter('products'));
    document.getElementById('subproducts-count').addEventListener('click', () => toggleFilter('subproducts'));
    
    // Quick actions
    document.querySelectorAll('.action-card').forEach(card => {
        if (card.onclick) return; // Skip if already has onclick
        const text = card.querySelector('h4')?.textContent;
        if (text === 'Add Product') card.addEventListener('click', showAddProductModal);
        if (text === 'Add SubProduct') card.addEventListener('click', showAddSubProductModal);
        if (text === 'Testing Tools') card.addEventListener('click', showTestingInterface);
    });
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => hideModal(e.target.dataset.modal));
    });
    
    // Modal cancel buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => hideModal(e.target.dataset.closeModal));
    });
    
    // Auto-slug generation
    document.getElementById('product-name').addEventListener('input', generateProductSlug);
    document.getElementById('table-title').addEventListener('input', generateTableSlug);
    
    // Modal slug generation
    document.getElementById('new-product-name')?.addEventListener('input', generateNewProductSlug);
    document.getElementById('new-subproduct-name')?.addEventListener('input', generateNewSubProductSlug);
    document.getElementById('edit-product-name')?.addEventListener('input', generateEditProductSlug);
    document.getElementById('edit-subproduct-name')?.addEventListener('input', generateEditSubProductSlug);
    
    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (SchemaState.unsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// Product Management
function addNewProduct() {
    // Legacy function - now replaced by modal-based approach
    showAddProductModal();
}

// Modal Management Functions
function showAddProductModal() {
    // Clear form
    document.getElementById('add-product-form').reset();
    document.getElementById('new-product-slug').textContent = '';
    document.getElementById('add-product-modal').classList.remove('hidden');
}

function showAddSubProductModal() {
    // Clear form and populate products dropdown
    document.getElementById('add-subproduct-form').reset();
    document.getElementById('new-subproduct-slug').textContent = '';
    populateProductsDropdown('subproduct-parent');
    document.getElementById('add-subproduct-modal').classList.remove('hidden');
}

function showEditProductModal(productId) {
    const product = SchemaState.currentSchema.products[productId];
    if (!product) return;
    
    document.getElementById('edit-product-id').value = productId;
    document.getElementById('edit-product-name').value = productId;
    document.getElementById('edit-product-slug').textContent = product.product_slug || '';
    document.getElementById('edit-product-platforms').value = (product.platforms || []).join(', ');
    document.getElementById('edit-product-notes').value = product.notes || '';
    
    document.getElementById('edit-product-modal').classList.remove('hidden');
}

function showEditSubProductModal(subproductId) {
    const subproduct = SchemaState.currentSchema.subproducts[subproductId];
    if (!subproduct) return;
    
    document.getElementById('edit-subproduct-id').value = subproductId;
    document.getElementById('edit-subproduct-name').value = subproductId;
    document.getElementById('edit-subproduct-slug').textContent = subproduct.slug || '';
    document.getElementById('edit-subproduct-description').value = subproduct.description || '';
    
    populateProductsDropdown('edit-subproduct-parent');
    document.getElementById('edit-subproduct-parent').value = subproduct.parent_product || '';
    
    document.getElementById('edit-subproduct-modal').classList.remove('hidden');
}

// Form Handlers
function handleAddProduct(e) {
    e.preventDefault();
    
    const name = document.getElementById('new-product-name').value.trim();
    if (!name) return;
    
    if (SchemaState.currentSchema.products[name]) {
        alert('Product already exists!');
        return;
    }
    
    const platforms = document.getElementById('new-product-platforms').value
        .split(',')
        .map(p => p.trim())
        .filter(p => p);
    
    SchemaState.currentSchema.products[name] = {
        product_slug: generateSlug(name),
        platforms: platforms,
        notes: document.getElementById('new-product-notes').value || '',
        tables: [],
        lumina: {
            extractors: []
        },
        ai: {
            guidelines: '',
            analysis_prompt: '',
            platforms: {},
            benchmarks: {}
        }
    };
    
    SchemaState.unsavedChanges = true;
    hideModal('add-product');
    renderHierarchyTree();
    updateStatistics();
    showNotification('Product created successfully');
}

function handleAddSubProduct(e) {
    e.preventDefault();
    
    const name = document.getElementById('new-subproduct-name').value.trim();
    const parentProduct = document.getElementById('subproduct-parent').value;
    
    if (!name || !parentProduct) {
        alert('Please fill in all required fields');
        return;
    }
    
    if (SchemaState.currentSchema.subproducts[name]) {
        alert('SubProduct already exists!');
        return;
    }
    
    SchemaState.currentSchema.subproducts[name] = {
        slug: generateSlug(name),
        parent_product: parentProduct,
        description: document.getElementById('new-subproduct-description').value || '',
        tactic_types: []
    };
    
    // Add to connections
    if (!SchemaState.currentSchema.connections[parentProduct]) {
        SchemaState.currentSchema.connections[parentProduct] = [];
    }
    SchemaState.currentSchema.connections[parentProduct].push(name);
    
    SchemaState.unsavedChanges = true;
    hideModal('add-subproduct');
    renderHierarchyTree();
    updateStatistics();
    showNotification('SubProduct created successfully');
}

function handleEditProduct(e) {
    e.preventDefault();
    
    const productId = document.getElementById('edit-product-id').value;
    const newName = document.getElementById('edit-product-name').value.trim();
    
    if (!newName) return;
    
    const product = SchemaState.currentSchema.products[productId];
    const platforms = document.getElementById('edit-product-platforms').value
        .split(',')
        .map(p => p.trim())
        .filter(p => p);
    
    // Update product data
    product.product_slug = generateSlug(newName);
    product.platforms = platforms;
    product.notes = document.getElementById('edit-product-notes').value;
    
    // If name changed, update the key
    if (newName !== productId) {
        SchemaState.currentSchema.products[newName] = product;
        delete SchemaState.currentSchema.products[productId];
        
        // Update connections
        if (SchemaState.currentSchema.connections[productId]) {
            SchemaState.currentSchema.connections[newName] = SchemaState.currentSchema.connections[productId];
            delete SchemaState.currentSchema.connections[productId];
        }
        
        // Update subproduct parent references
        Object.values(SchemaState.currentSchema.subproducts).forEach(subproduct => {
            if (subproduct.parent_product === productId) {
                subproduct.parent_product = newName;
            }
        });
    }
    
    SchemaState.unsavedChanges = true;
    hideModal('edit-product');
    renderHierarchyTree();
    updateStatistics();
    showNotification('Product updated successfully');
}

function handleEditSubProduct(e) {
    e.preventDefault();
    
    const subproductId = document.getElementById('edit-subproduct-id').value;
    const newName = document.getElementById('edit-subproduct-name').value.trim();
    const newParent = document.getElementById('edit-subproduct-parent').value;
    
    if (!newName || !newParent) {
        alert('Please fill in all required fields');
        return;
    }
    
    const subproduct = SchemaState.currentSchema.subproducts[subproductId];
    const oldParent = subproduct.parent_product;
    
    // Update subproduct data
    subproduct.slug = generateSlug(newName);
    subproduct.parent_product = newParent;
    subproduct.description = document.getElementById('edit-subproduct-description').value;
    
    // If name changed, update the key
    if (newName !== subproductId) {
        SchemaState.currentSchema.subproducts[newName] = subproduct;
        delete SchemaState.currentSchema.subproducts[subproductId];
        
        // Update connection references
        updateConnectionReferences(oldParent, subproductId, newParent, newName);
    } else if (oldParent !== newParent) {
        // Only parent changed
        updateConnectionReferences(oldParent, subproductId, newParent, subproductId);
    }
    
    SchemaState.unsavedChanges = true;
    hideModal('edit-subproduct');
    renderHierarchyTree();
    updateStatistics();
    showNotification('SubProduct updated successfully');
}

function handleDeleteProductModal() {
    const productId = document.getElementById('edit-product-id').value;
    if (!confirm(`Delete product "${productId}" and all its subproducts?`)) return;
    
    // Delete associated subproducts
    const connectedSubProducts = SchemaState.currentSchema.connections[productId] || [];
    connectedSubProducts.forEach(subproductId => {
        delete SchemaState.currentSchema.subproducts[subproductId];
    });
    
    // Delete product and connections
    delete SchemaState.currentSchema.products[productId];
    delete SchemaState.currentSchema.connections[productId];
    
    SchemaState.unsavedChanges = true;
    hideModal('edit-product');
    renderHierarchyTree();
    updateStatistics();
    showNotification('Product deleted successfully');
}

function handleDeleteSubProductModal() {
    const subproductId = document.getElementById('edit-subproduct-id').value;
    const subproduct = SchemaState.currentSchema.subproducts[subproductId];
    
    if (!confirm(`Delete subproduct "${subproductId}"?`)) return;
    
    // Remove from connections
    const parentProduct = subproduct.parent_product;
    if (SchemaState.currentSchema.connections[parentProduct]) {
        const index = SchemaState.currentSchema.connections[parentProduct].indexOf(subproductId);
        if (index > -1) {
            SchemaState.currentSchema.connections[parentProduct].splice(index, 1);
        }
    }
    
    // Delete subproduct
    delete SchemaState.currentSchema.subproducts[subproductId];
    
    SchemaState.unsavedChanges = true;
    hideModal('edit-subproduct');
    renderHierarchyTree();
    updateStatistics();
    showNotification('SubProduct deleted successfully');
}

// Helper Functions
function populateProductsDropdown(selectId) {
    const select = document.getElementById(selectId);
    const products = Object.keys(SchemaState.currentSchema.products).sort();
    
    // Clear existing options except first
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    // Add product options
    products.forEach(productName => {
        const option = document.createElement('option');
        option.value = productName;
        option.textContent = productName;
        select.appendChild(option);
    });
}

function updateConnectionReferences(oldParent, oldSubproductId, newParent, newSubproductId) {
    // Remove from old parent
    if (SchemaState.currentSchema.connections[oldParent]) {
        const index = SchemaState.currentSchema.connections[oldParent].indexOf(oldSubproductId);
        if (index > -1) {
            SchemaState.currentSchema.connections[oldParent].splice(index, 1);
        }
    }
    
    // Add to new parent
    if (!SchemaState.currentSchema.connections[newParent]) {
        SchemaState.currentSchema.connections[newParent] = [];
    }
    if (!SchemaState.currentSchema.connections[newParent].includes(newSubproductId)) {
        SchemaState.currentSchema.connections[newParent].push(newSubproductId);
    }
}

function deleteCurrentProduct() {
    if (!SchemaState.currentProduct) return;
    if (!confirm(`Delete product "${SchemaState.currentProduct}"?`)) return;
    
    delete SchemaState.currentSchema.products[SchemaState.currentProduct];
    SchemaState.currentProduct = null;
    SchemaState.unsavedChanges = true;
    renderProductList();
    showWelcomeMessage();
}

function selectProduct(productName) {
    SchemaState.currentProduct = productName;
    SchemaState.currentSubProduct = null;
    const product = SchemaState.currentSchema.products[productName];
    
    // Show editor
    document.getElementById('welcome-message').classList.add('hidden');
    document.getElementById('product-editor').classList.remove('hidden');
    
    // Update header
    document.getElementById('product-name-header').textContent = productName;
    
    // Load basic info
    document.getElementById('product-name').value = productName;
    document.getElementById('product-slug').textContent = product.product_slug || '';
    document.getElementById('product-platforms').value = (product.platforms || []).join(', ');
    document.getElementById('product-notes').value = product.notes || '';
    
    // Load tables
    renderTablesList();
    
    // Load extractors
    renderExtractorsList();
    
    // Load AI config
    document.getElementById('ai-guidelines').value = product.ai?.guidelines || '';
    document.getElementById('ai-prompt').value = product.ai?.analysis_prompt || '';
    renderBenchmarksList();
    
    // Switch to basic tab
    switchTab('basic');
    
    // Highlight selected product in hierarchy
    document.querySelectorAll('.product-node').forEach(node => {
        node.classList.remove('active');
    });
    document.querySelectorAll('.subproduct-node').forEach(node => {
        node.classList.remove('active');
    });
    
    const selectedNode = document.querySelector(`.product-node[onclick*="'${productName}'"]`);
    if (selectedNode) selectedNode.classList.add('active');
}

function selectSubProduct(subproductId) {
    SchemaState.currentSubProduct = subproductId;
    const subproduct = SchemaState.currentSchema.subproducts[subproductId];
    
    // For now, select the parent product
    if (subproduct && subproduct.parent_product) {
        selectProduct(subproduct.parent_product);
    }
    
    // Highlight selected subproduct in hierarchy
    document.querySelectorAll('.product-node').forEach(node => {
        node.classList.remove('active');
    });
    document.querySelectorAll('.subproduct-node').forEach(node => {
        node.classList.remove('active');
    });
    
    const selectedNode = document.querySelector(`.subproduct-node[onclick*="'${subproductId}'"]`);
    if (selectedNode) selectedNode.classList.add('active');
}

function saveBasicInfo() {
    if (!SchemaState.currentProduct) return;
    
    const newName = document.getElementById('product-name').value.trim();
    const product = SchemaState.currentSchema.products[SchemaState.currentProduct];
    
    // Update product info
    product.product_slug = generateSlug(newName);
    product.platforms = document.getElementById('product-platforms').value
        .split(',')
        .map(p => p.trim())
        .filter(p => p);
    product.notes = document.getElementById('product-notes').value;
    
    // If name changed, update the key
    if (newName !== SchemaState.currentProduct) {
        SchemaState.currentSchema.products[newName] = product;
        delete SchemaState.currentSchema.products[SchemaState.currentProduct];
        SchemaState.currentProduct = newName;
        renderProductList();
        selectProduct(newName);
    }
    
    SchemaState.unsavedChanges = true;
    showNotification('Basic info saved');
}

// Table Management
function addNewTable() {
    SchemaState.currentTable = {
        title: '',
        table_slug: '',
        filenames: [],
        aliases: [],
        headers: [],
        validator: {}
    };
    showTableEditor();
}

function saveTable() {
    if (!SchemaState.currentProduct) return;
    
    const product = SchemaState.currentSchema.products[SchemaState.currentProduct];
    if (!product.tables) product.tables = [];
    
    const tableData = {
        title: document.getElementById('table-title').value,
        table_slug: generateSlug(document.getElementById('table-title').value),
        filenames: document.getElementById('table-filenames').value
            .split('\n')
            .map(f => f.trim())
            .filter(f => f),
        aliases: document.getElementById('table-aliases').value
            .split('\n')
            .map(a => a.trim())
            .filter(a => a),
        headers: document.getElementById('table-headers').value
            .split('\n')
            .map(h => h.trim())
            .filter(h => h),
        validator: {}
    };
    
    if (SchemaState.currentTable && SchemaState.currentTable.index !== undefined) {
        // Update existing
        product.tables[SchemaState.currentTable.index] = tableData;
    } else {
        // Add new
        product.tables.push(tableData);
    }
    
    SchemaState.unsavedChanges = true;
    SchemaState.currentTable = null;
    renderTablesList();
    hideTableEditor();
    showNotification('Table saved');
}

function deleteTable() {
    if (!SchemaState.currentProduct || !SchemaState.currentTable) return;
    if (!confirm('Delete this table?')) return;
    
    const product = SchemaState.currentSchema.products[SchemaState.currentProduct];
    product.tables.splice(SchemaState.currentTable.index, 1);
    
    SchemaState.unsavedChanges = true;
    SchemaState.currentTable = null;
    renderTablesList();
    hideTableEditor();
}

// Extractor Management
function addNewExtractor() {
    SchemaState.currentExtractor = {
        name: '',
        path: '',
        when: {},
        aggregate: ''
    };
    showExtractorEditor();
}

function saveExtractor() {
    if (!SchemaState.currentProduct) return;
    
    const product = SchemaState.currentSchema.products[SchemaState.currentProduct];
    if (!product.lumina) product.lumina = { extractors: [] };
    if (!product.lumina.extractors) product.lumina.extractors = [];
    
    const extractorData = {
        name: document.getElementById('extractor-name').value,
        path: document.getElementById('extractor-path').value,
        when: tryParseJSON(document.getElementById('extractor-when').value) || {},
        aggregate: document.getElementById('extractor-aggregate').value
    };
    
    if (SchemaState.currentExtractor && SchemaState.currentExtractor.index !== undefined) {
        // Update existing
        product.lumina.extractors[SchemaState.currentExtractor.index] = extractorData;
    } else {
        // Add new
        product.lumina.extractors.push(extractorData);
    }
    
    SchemaState.unsavedChanges = true;
    SchemaState.currentExtractor = null;
    renderExtractorsList();
    hideExtractorEditor();
    showNotification('Extractor saved');
}

function testExtractor() {
    const path = document.getElementById('extractor-path').value;
    const testJson = document.getElementById('test-json').value;
    const aggregate = document.getElementById('extractor-aggregate').value;
    
    if (!path || !testJson) {
        alert('Please provide both a path and test JSON');
        return;
    }
    
    try {
        const data = JSON.parse(testJson);
        const result = extractPath(data, path);
        const aggregated = aggregate ? applyAggregation(result, aggregate) : result;
        
        const resultDiv = document.getElementById('test-result');
        resultDiv.classList.remove('hidden');
        resultDiv.innerHTML = `
            <h4>Extraction Result:</h4>
            <pre>${JSON.stringify(aggregated, null, 2)}</pre>
        `;
    } catch (error) {
        alert('Error testing extractor: ' + error.message);
    }
}

// Benchmark Management
function addNewBenchmark() {
    SchemaState.currentBenchmark = {
        metric: '',
        goal: 0,
        warn_below: 0,
        unit: 'percentage',
        direction: 'higher_better'
    };
    showBenchmarkEditor();
}

function saveBenchmark() {
    if (!SchemaState.currentProduct) return;
    
    const product = SchemaState.currentSchema.products[SchemaState.currentProduct];
    if (!product.ai) product.ai = { benchmarks: {} };
    if (!product.ai.benchmarks) product.ai.benchmarks = {};
    
    const metric = document.getElementById('benchmark-metric').value;
    const benchmarkData = {
        goal: parseFloat(document.getElementById('benchmark-goal').value),
        warn_below: parseFloat(document.getElementById('benchmark-warn').value),
        unit: document.getElementById('benchmark-unit').value,
        direction: document.getElementById('benchmark-direction').value
    };
    
    product.ai.benchmarks[metric] = benchmarkData;
    
    SchemaState.unsavedChanges = true;
    SchemaState.currentBenchmark = null;
    renderBenchmarksList();
    hideBenchmarkEditor();
    showNotification('Benchmark saved');
}

// AI Config
function saveAIConfig() {
    if (!SchemaState.currentProduct) return;
    
    const product = SchemaState.currentSchema.products[SchemaState.currentProduct];
    if (!product.ai) product.ai = {};
    
    product.ai.guidelines = document.getElementById('ai-guidelines').value;
    product.ai.analysis_prompt = document.getElementById('ai-prompt').value;
    
    SchemaState.unsavedChanges = true;
    showNotification('AI configuration saved');
}

// Import/Export
function exportSchema() {
    const dataStr = JSON.stringify(SchemaState.currentSchema, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', 'unified_tactic_schema.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    SchemaState.unsavedChanges = false;
    showNotification('Schema exported successfully');
}

function importSchemaFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const schema = JSON.parse(e.target.result);
            SchemaState.currentSchema = schema;
            SchemaState.unsavedChanges = true;
            renderProductList();
            showWelcomeMessage();
            hideModal('import');
            showNotification('Schema imported successfully');
        } catch (error) {
            alert('Error importing schema: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Testing Functions
function testFilenameMapping() {
    const filename = document.getElementById('test-filename').value;
    if (!filename) return;
    
    const results = [];
    
    // Test against all products and tables
    for (const [productName, product] of Object.entries(SchemaState.currentSchema.products)) {
        for (const table of product.tables || []) {
            let score = 0;
            let matchType = '';
            
            // Check exact filename match
            if (table.filenames && table.filenames.includes(filename)) {
                score = 100;
                matchType = 'Exact Filename';
            }
            // Check alias match
            else if (table.aliases && table.aliases.some(alias => filename.includes(alias))) {
                score = 80;
                matchType = 'Alias Match';
            }
            // Check pattern match
            else if (filename.match(new RegExp(`^report-${product.product_slug}-${table.table_slug}`))) {
                score = 90;
                matchType = 'Pattern Match';
            }
            
            if (score > 0) {
                results.push({
                    product: productName,
                    table: table.title,
                    score,
                    matchType
                });
            }
        }
    }
    
    // Sort by score
    results.sort((a, b) => b.score - a.score);
    
    // Display results
    const resultDiv = document.getElementById('filename-test-result');
    resultDiv.classList.remove('hidden');
    
    if (results.length > 0) {
        resultDiv.innerHTML = `
            <h4>Matching Tables:</h4>
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Table</th>
                        <th>Score</th>
                        <th>Match Type</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(r => `
                        <tr>
                            <td>${r.product}</td>
                            <td>${r.table}</td>
                            <td>${r.score}</td>
                            <td>${r.matchType}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        resultDiv.innerHTML = '<p class="no-results">No matching tables found</p>';
    }
}

function testCSVHeaders() {
    const file = document.getElementById('test-csv').files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const headers = parseCSVHeaders(e.target.result);
        const results = [];
        
        // Test against all tables
        for (const [productName, product] of Object.entries(SchemaState.currentSchema.products)) {
            for (const table of product.tables || []) {
                if (table.headers && table.headers.length > 0) {
                    const similarity = jaccardSimilarity(headers, table.headers);
                    if (similarity > 0) {
                        results.push({
                            product: productName,
                            table: table.title,
                            similarity: Math.round(similarity * 100),
                            matching: headers.filter(h => table.headers.includes(h)),
                            missing: table.headers.filter(h => !headers.includes(h))
                        });
                    }
                }
            }
        }
        
        // Sort by similarity
        results.sort((a, b) => b.similarity - a.similarity);
        
        // Display results
        const resultDiv = document.getElementById('csv-test-result');
        resultDiv.classList.remove('hidden');
        
        if (results.length > 0) {
            resultDiv.innerHTML = `
                <h4>CSV Headers: ${headers.join(', ')}</h4>
                <h4>Matching Tables:</h4>
                ${results.map(r => `
                    <div class="result-card">
                        <h5>${r.product} - ${r.table}</h5>
                        <p>Similarity: ${r.similarity}%</p>
                        <p>Matching: ${r.matching.join(', ') || 'None'}</p>
                        <p>Missing: ${r.missing.join(', ') || 'None'}</p>
                    </div>
                `).join('')}
            `;
        } else {
            resultDiv.innerHTML = '<p class="no-results">No matching tables found</p>';
        }
    };
    reader.readAsText(file);
}

// Utility Functions
function generateSlug(text) {
    return text.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function generateProductSlug() {
    const name = document.getElementById('product-name').value;
    const slug = generateSlug(name);
    document.getElementById('product-slug').textContent = slug;
}

function generateTableSlug() {
    const title = document.getElementById('table-title').value;
    const slug = generateSlug(title);
    document.getElementById('table-slug').textContent = slug;
}

// Modal slug generation functions
function generateNewProductSlug() {
    const name = document.getElementById('new-product-name').value;
    const slug = generateSlug(name);
    document.getElementById('new-product-slug').textContent = slug;
}

function generateNewSubProductSlug() {
    const name = document.getElementById('new-subproduct-name').value;
    const slug = generateSlug(name);
    document.getElementById('new-subproduct-slug').textContent = slug;
}

function generateEditProductSlug() {
    const name = document.getElementById('edit-product-name').value;
    const slug = generateSlug(name);
    document.getElementById('edit-product-slug').textContent = slug;
}

function generateEditSubProductSlug() {
    const name = document.getElementById('edit-subproduct-name').value;
    const slug = generateSlug(name);
    document.getElementById('edit-subproduct-slug').textContent = slug;
}

function parseCSVHeaders(csvText) {
    const lines = csvText.split('\n');
    if (lines.length === 0) return [];
    return lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
}

function inferHeadersFromCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const headers = parseCSVHeaders(e.target.result);
        document.getElementById('table-headers').value = headers.join('\n');
    };
    reader.readAsText(file);
}

function jaccardSimilarity(set1, set2) {
    const intersection = set1.filter(x => set2.includes(x));
    const union = [...new Set([...set1, ...set2])];
    return union.length === 0 ? 0 : intersection.length / union.length;
}

function extractPath(obj, path) {
    const parts = path.split('.');
    let result = obj;
    
    for (const part of parts) {
        if (part.includes('[')) {
            const [key, ...rest] = part.split('[');
            const index = rest.join('[').replace(']', '');
            
            if (key) result = result[key];
            if (index === '') {
                // Array access without index, return all
                result = Array.isArray(result) ? result : [];
            } else {
                result = result[parseInt(index)];
            }
        } else {
            result = result ? result[part] : undefined;
        }
    }
    
    return result;
}

function applyAggregation(data, type) {
    if (!Array.isArray(data)) return data;
    
    switch (type) {
        case 'first':
            return data[0];
        case 'unique':
            return [...new Set(data)];
        case 'sum':
            return data.reduce((a, b) => a + (Number(b) || 0), 0);
        case 'join':
            return data.join(', ');
        default:
            return data;
    }
}

function tryParseJSON(str) {
    try {
        return JSON.parse(str);
    } catch {
        return null;
    }
}

// UI Functions
function renderProductList() {
    // Legacy function - now replaced by hierarchy tree
    renderHierarchyTree();
}

function renderHierarchyTree() {
    const tree = document.getElementById('hierarchy-tree');
    const products = Object.keys(SchemaState.currentSchema.products).sort();
    
    if (products.length === 0) {
        tree.innerHTML = '<div class="empty-state">No products created yet</div>';
        return;
    }
    
    tree.innerHTML = products.map(productName => {
        const product = SchemaState.currentSchema.products[productName];
        const subproducts = SchemaState.currentSchema.connections[productName] || [];
        const tableCount = product.tables?.length || 0;
        
        return `
            <div class="hierarchy-product">
                <div class="product-node" onclick="selectProduct('${productName}')" oncontextmenu="showEditProductModal('${productName}'); return false;">
                    <div class="product-info">
                        <div class="product-name">📦 ${productName}</div>
                        <div class="product-meta">${tableCount} tables</div>
                    </div>
                    <div class="product-actions">
                        <button class="action-btn small" onclick="event.stopPropagation(); showEditProductModal('${productName}')" title="Edit Product">✏️</button>
                    </div>
                </div>
                ${subproducts.length > 0 ? `
                    <div class="subproducts-list">
                        ${subproducts.map(subproductId => {
                            const subproduct = SchemaState.currentSchema.subproducts[subproductId];
                            if (!subproduct) return '';
                            
                            const tacticCount = subproduct.tactic_types?.length || 0;
                            return `
                                <div class="subproduct-node" onclick="selectSubProduct('${subproductId}')" oncontextmenu="showEditSubProductModal('${subproductId}'); return false;">
                                    <div class="subproduct-info">
                                        <div class="subproduct-name">🔗 ${subproductId}</div>
                                        <div class="subproduct-meta">${tacticCount} tactics</div>
                                    </div>
                                    <div class="subproduct-actions">
                                        <button class="action-btn small" onclick="event.stopPropagation(); showEditSubProductModal('${subproductId}')" title="Edit SubProduct">✏️</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function updateStatistics() {
    const productCount = Object.keys(SchemaState.currentSchema.products).length;
    const subproductCount = Object.keys(SchemaState.currentSchema.subproducts).length;
    const connectionCount = Object.keys(SchemaState.currentSchema.connections).reduce((total, productId) => {
        return total + (SchemaState.currentSchema.connections[productId]?.length || 0);
    }, 0);
    const tableCount = Object.values(SchemaState.currentSchema.products).reduce((total, product) => {
        return total + (product.tables?.length || 0);
    }, 0);
    
    // Update sidebar stats with line breaks
    document.getElementById('products-count').innerHTML = `${productCount}<br>Products`;
    document.getElementById('subproducts-count').innerHTML = `${subproductCount}<br>SubProducts`;
    
    // Update welcome section stats
    document.getElementById('total-products-stat').textContent = productCount;
    document.getElementById('total-subproducts-stat').textContent = subproductCount;
    document.getElementById('total-connections-stat').textContent = connectionCount;
    document.getElementById('total-tables-stat').textContent = tableCount;
}

function renderTablesList() {
    if (!SchemaState.currentProduct) return;
    
    const product = SchemaState.currentSchema.products[SchemaState.currentProduct];
    const list = document.getElementById('tables-list');
    
    if (!product.tables || product.tables.length === 0) {
        list.innerHTML = '<p class="empty-message">No tables configured</p>';
        return;
    }
    
    list.innerHTML = product.tables.map((table, index) => `
        <div class="list-item" onclick="editTable(${index})">
            <div class="item-header">
                <h4>${table.title}</h4>
                <span class="item-meta">${table.headers?.length || 0} headers</span>
            </div>
            <div class="item-details">
                <span>Files: ${table.filenames?.join(', ') || 'None'}</span>
            </div>
        </div>
    `).join('');
}

function renderExtractorsList() {
    if (!SchemaState.currentProduct) return;
    
    const product = SchemaState.currentSchema.products[SchemaState.currentProduct];
    const list = document.getElementById('extractors-list');
    
    if (!product.lumina?.extractors || product.lumina.extractors.length === 0) {
        list.innerHTML = '<p class="empty-message">No extractors configured</p>';
        return;
    }
    
    list.innerHTML = product.lumina.extractors.map((extractor, index) => `
        <div class="list-item" onclick="editExtractor(${index})">
            <div class="item-header">
                <h4>${extractor.name}</h4>
                <span class="item-meta">${extractor.aggregate || 'No aggregation'}</span>
            </div>
            <div class="item-details">
                <code>${extractor.path}</code>
            </div>
        </div>
    `).join('');
}

function renderBenchmarksList() {
    if (!SchemaState.currentProduct) return;
    
    const product = SchemaState.currentSchema.products[SchemaState.currentProduct];
    const list = document.getElementById('benchmarks-list');
    
    if (!product.ai?.benchmarks || Object.keys(product.ai.benchmarks).length === 0) {
        list.innerHTML = '<p class="empty-message">No benchmarks configured</p>';
        return;
    }
    
    list.innerHTML = Object.entries(product.ai.benchmarks).map(([metric, benchmark]) => `
        <div class="list-item" onclick="editBenchmark('${metric}')">
            <div class="item-header">
                <h4>${metric}</h4>
                <span class="item-meta">${benchmark.unit}</span>
            </div>
            <div class="item-details">
                Goal: ${benchmark.goal} | Warn: ${benchmark.warn_below} | ${benchmark.direction.replace('_', ' ')}
            </div>
        </div>
    `).join('');
}

function filterProducts() {
    // Legacy function - now replaced by hierarchy filter
    filterHierarchy();
}

function filterHierarchy() {
    const search = document.getElementById('hierarchy-search').value.toLowerCase();
    const productNodes = document.querySelectorAll('.hierarchy-product');
    
    productNodes.forEach(productNode => {
        const productName = productNode.querySelector('.product-name').textContent.toLowerCase();
        const subproductNodes = productNode.querySelectorAll('.subproduct-node');
        
        let productVisible = !search || productName.includes(search);
        let hasVisibleSubproducts = false;
        
        // Apply active filter
        if (SchemaState.activeFilter === 'products') {
            // Only show products (hide subproducts)
            subproductNodes.forEach(subproductNode => {
                subproductNode.style.display = 'none';
            });
        } else if (SchemaState.activeFilter === 'subproducts') {
            // Only show subproducts that match search
            subproductNodes.forEach(subproductNode => {
                const subproductName = subproductNode.querySelector('.subproduct-name').textContent.toLowerCase();
                const subproductVisible = !search || subproductName.includes(search);
                subproductNode.style.display = subproductVisible ? 'flex' : 'none';
                if (subproductVisible) hasVisibleSubproducts = true;
            });
            // Hide products when showing only subproducts
            productVisible = false;
        } else {
            // Normal search behavior (show both)
            subproductNodes.forEach(subproductNode => {
                const subproductName = subproductNode.querySelector('.subproduct-name').textContent.toLowerCase();
                const subproductVisible = !search || subproductName.includes(search);
                subproductNode.style.display = subproductVisible ? 'flex' : 'none';
                if (subproductVisible) hasVisibleSubproducts = true;
            });
        }
        
        // Show product if it matches or has visible subproducts (unless filtered out)
        const shouldShowProduct = SchemaState.activeFilter === 'subproducts' ? hasVisibleSubproducts : 
                                 (productVisible || hasVisibleSubproducts);
        productNode.style.display = shouldShowProduct ? 'block' : 'none';
    });
}

function toggleFilter(filterType) {
    const productsBtn = document.getElementById('products-count');
    const subproductsBtn = document.getElementById('subproducts-count');
    
    // Clear previous active states
    productsBtn.classList.remove('active');
    subproductsBtn.classList.remove('active');
    
    // Toggle filter
    if (SchemaState.activeFilter === filterType) {
        // Turn off filter
        SchemaState.activeFilter = null;
    } else {
        // Set new filter
        SchemaState.activeFilter = filterType;
        if (filterType === 'products') {
            productsBtn.classList.add('active');
        } else if (filterType === 'subproducts') {
            subproductsBtn.classList.add('active');
        }
    }
    
    // Apply filter
    filterHierarchy();
}

// Tab Management
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `${tabName}-tab`);
    });
}

// Editor Management
function editTable(index) {
    const product = SchemaState.currentSchema.products[SchemaState.currentProduct];
    const table = product.tables[index];
    
    SchemaState.currentTable = { ...table, index };
    
    document.getElementById('table-title').value = table.title || '';
    document.getElementById('table-slug').textContent = table.table_slug || '';
    document.getElementById('table-filenames').value = (table.filenames || []).join('\n');
    document.getElementById('table-aliases').value = (table.aliases || []).join('\n');
    document.getElementById('table-headers').value = (table.headers || []).join('\n');
    
    showTableEditor();
}

function editExtractor(index) {
    const product = SchemaState.currentSchema.products[SchemaState.currentProduct];
    const extractor = product.lumina.extractors[index];
    
    SchemaState.currentExtractor = { ...extractor, index };
    
    document.getElementById('extractor-name').value = extractor.name || '';
    document.getElementById('extractor-path').value = extractor.path || '';
    document.getElementById('extractor-when').value = JSON.stringify(extractor.when || {}, null, 2);
    document.getElementById('extractor-aggregate').value = extractor.aggregate || '';
    
    showExtractorEditor();
}

function editBenchmark(metric) {
    const product = SchemaState.currentSchema.products[SchemaState.currentProduct];
    const benchmark = product.ai.benchmarks[metric];
    
    SchemaState.currentBenchmark = { ...benchmark, metric };
    
    document.getElementById('benchmark-metric').value = metric;
    document.getElementById('benchmark-goal').value = benchmark.goal;
    document.getElementById('benchmark-warn').value = benchmark.warn_below;
    document.getElementById('benchmark-unit').value = benchmark.unit;
    document.getElementById('benchmark-direction').value = benchmark.direction;
    
    showBenchmarkEditor();
}

// Show/Hide Functions
function showTableEditor() {
    document.getElementById('table-editor').classList.remove('hidden');
}

function hideTableEditor() {
    document.getElementById('table-editor').classList.add('hidden');
}

function cancelTableEdit() {
    SchemaState.currentTable = null;
    hideTableEditor();
}

function showExtractorEditor() {
    document.getElementById('extractor-editor').classList.remove('hidden');
}

function hideExtractorEditor() {
    document.getElementById('extractor-editor').classList.add('hidden');
}

function cancelExtractorEdit() {
    SchemaState.currentExtractor = null;
    hideExtractorEditor();
}

function showBenchmarkEditor() {
    document.getElementById('benchmark-editor').classList.remove('hidden');
}

function hideBenchmarkEditor() {
    document.getElementById('benchmark-editor').classList.add('hidden');
}

function cancelBenchmarkEdit() {
    SchemaState.currentBenchmark = null;
    hideBenchmarkEditor();
}

function deleteBenchmark() {
    if (!SchemaState.currentProduct || !SchemaState.currentBenchmark) return;
    if (!confirm('Delete this benchmark?')) return;
    
    const product = SchemaState.currentSchema.products[SchemaState.currentProduct];
    delete product.ai.benchmarks[SchemaState.currentBenchmark.metric];
    
    SchemaState.unsavedChanges = true;
    SchemaState.currentBenchmark = null;
    renderBenchmarksList();
    hideBenchmarkEditor();
}

function deleteExtractor() {
    if (!SchemaState.currentProduct || !SchemaState.currentExtractor) return;
    if (!confirm('Delete this extractor?')) return;
    
    const product = SchemaState.currentSchema.products[SchemaState.currentProduct];
    product.lumina.extractors.splice(SchemaState.currentExtractor.index, 1);
    
    SchemaState.unsavedChanges = true;
    SchemaState.currentExtractor = null;
    renderExtractorsList();
    hideExtractorEditor();
}

function showWelcomeMessage() {
    document.getElementById('welcome-message').classList.remove('hidden');
    document.getElementById('product-editor').classList.add('hidden');
}

function showImportModal() {
    document.getElementById('import-modal').classList.remove('hidden');
}

function hideModal(modalName) {
    document.getElementById(`${modalName}-modal`).classList.add('hidden');
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

function showTestingTab() {
    if (!SchemaState.currentProduct) {
        // Select first product if available
        const firstProduct = Object.keys(SchemaState.currentSchema.products)[0];
        if (firstProduct) {
            selectProduct(firstProduct);
        } else {
            alert('Please add a product first');
            return;
        }
    }
    switchTab('testing');
}

function showTestingInterface() {
    showTestingTab();
}

// Storage Functions
function loadSchemaFromStorage() {
    const stored = localStorage.getItem('schemaAdmin');
    if (stored) {
        try {
            SchemaState.currentSchema = JSON.parse(stored);
        } catch (error) {
            console.error('Error loading stored schema:', error);
        }
    }
}

function saveSchemaToStorage() {
    localStorage.setItem('schemaAdmin', JSON.stringify(SchemaState.currentSchema));
}

// Auto-save periodically
setInterval(() => {
    if (SchemaState.unsavedChanges) {
        saveSchemaToStorage();
    }
}, 30000); // Every 30 seconds

// Legacy Import
function importLegacyFormat() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const legacy = JSON.parse(event.target.result);
                convertLegacySchema(legacy);
                hideModal('import');
                showNotification('Legacy schema converted successfully');
            } catch (error) {
                alert('Error converting legacy schema: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function convertLegacySchema(legacy) {
    // Convert old csv-headers.json format to new unified schema
    SchemaState.currentSchema = {
        version: 1,
        products: {}
    };
    
    // Process each tactic in legacy format
    for (const [tacticName, tacticData] of Object.entries(legacy)) {
        SchemaState.currentSchema.products[tacticName] = {
            product_slug: generateSlug(tacticName),
            platforms: [],
            notes: '',
            tables: [{
                title: 'Default',
                table_slug: 'default',
                filenames: tacticData.filenames || [],
                aliases: [],
                headers: tacticData.headers || [],
                validator: {}
            }],
            lumina: {
                extractors: []
            },
            ai: {
                guidelines: '',
                analysis_prompt: '',
                platforms: {},
                benchmarks: {}
            }
        };
    }
    
    renderProductList();
    showWelcomeMessage();
}