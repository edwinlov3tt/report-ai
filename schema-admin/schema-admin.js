// Schema Administrator JavaScript
// Main application logic for managing unified tactic schemas

// Global state
const SchemaState = {
    currentSchema: {
        version: 1,
        products: {}
    },
    currentProduct: null,
    currentTable: null,
    currentExtractor: null,
    currentBenchmark: null,
    unsavedChanges: false
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadSchemaFromStorage();
    renderProductList();
});

// Event Listeners
function initializeEventListeners() {
    // Product management
    document.getElementById('add-product-btn').addEventListener('click', addNewProduct);
    document.getElementById('delete-product-btn').addEventListener('click', deleteCurrentProduct);
    document.getElementById('save-basic-btn').addEventListener('click', saveBasicInfo);
    
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
    document.getElementById('product-search').addEventListener('input', filterProducts);
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => hideModal(e.target.dataset.modal));
    });
    
    // Auto-slug generation
    document.getElementById('product-name').addEventListener('input', generateProductSlug);
    document.getElementById('table-title').addEventListener('input', generateTableSlug);
    
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
    const name = prompt('Enter product name:');
    if (!name) return;
    
    const slug = generateSlug(name);
    if (SchemaState.currentSchema.products[name]) {
        alert('Product already exists!');
        return;
    }
    
    SchemaState.currentSchema.products[name] = {
        product_slug: slug,
        platforms: [],
        notes: '',
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
    
    SchemaState.currentProduct = name;
    SchemaState.unsavedChanges = true;
    renderProductList();
    selectProduct(name);
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
    
    // Highlight selected product
    document.querySelectorAll('.product-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.product === productName) {
            item.classList.add('active');
        }
    });
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
    const list = document.getElementById('product-list');
    const products = Object.keys(SchemaState.currentSchema.products).sort();
    
    list.innerHTML = products.map(name => `
        <div class="product-item ${name === SchemaState.currentProduct ? 'active' : ''}" 
             data-product="${name}" 
             onclick="selectProduct('${name}')">
            <span class="product-name">${name}</span>
            <span class="product-count">${SchemaState.currentSchema.products[name].tables?.length || 0} tables</span>
        </div>
    `).join('');
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
    const search = document.getElementById('product-search').value.toLowerCase();
    const items = document.querySelectorAll('.product-item');
    
    items.forEach(item => {
        const name = item.dataset.product.toLowerCase();
        const product = SchemaState.currentSchema.products[item.dataset.product];
        const platforms = (product.platforms || []).join(' ').toLowerCase();
        const notes = (product.notes || '').toLowerCase();
        
        const visible = !search || 
                       name.includes(search) || 
                       platforms.includes(search) || 
                       notes.includes(search);
        
        item.style.display = visible ? 'flex' : 'none';
    });
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