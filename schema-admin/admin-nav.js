// Admin Navigation Component
class AdminNavigation {
    constructor() {
        this.currentPath = window.location.pathname;
        // Set collapsed to true by default, only expand if explicitly set to false
        this.isCollapsed = localStorage.getItem('admin-nav-collapsed') !== 'false';
        this.init();
    }

    init() {
        this.createNavigation();
        // Use setTimeout to ensure DOM is ready after innerHTML manipulation
        setTimeout(() => this.bindEvents(), 10);
    }

    createNavigation() {
        const navHTML = `
            <div class="admin-nav ${this.isCollapsed ? 'collapsed' : ''}">
                <div class="nav-header">
                    <div class="nav-brand">
                        <span class="brand-icon">⚙️</span>
                        <span class="brand-text">Schema Admin</span>
                    </div>
                    <button class="nav-toggle" id="nav-toggle">
                        <span class="toggle-icon">${this.isCollapsed ? '→' : '←'}</span>
                    </button>
                </div>
                
                <nav class="nav-menu">
                    <div class="nav-section">
                        <h3 class="nav-section-title">Configuration</h3>
                        <ul class="nav-links">
                            <li class="nav-item">
                                <a href="/schema-admin/" class="nav-link ${this.isCurrentPath('/schema-admin/', true) ? 'active' : ''}">
                                    <span class="nav-icon">🏠</span>
                                    <span class="nav-text">Schema Admin</span>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a href="/schema-admin/sections-manager/" class="nav-link ${this.isCurrentPath('/schema-admin/sections-manager') ? 'active' : ''}">
                                    <span class="nav-icon">📑</span>
                                    <span class="nav-text">Report Sections</span>
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div class="nav-section">
                        <h3 class="nav-section-title">Testing & Development</h3>
                        <ul class="nav-links">
                            <li class="nav-item">
                                <a href="/schema-admin/ai-testing/" class="nav-link ${this.isCurrentPath('/schema-admin/ai-testing') ? 'active' : ''}">
                                    <span class="nav-icon">🧪</span>
                                    <span class="nav-text">AI Testing</span>
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div class="nav-section">
                        <h3 class="nav-section-title">Data Management</h3>
                        <ul class="nav-links">
                            <li class="nav-item">
                                <a href="/schema-admin/schema-export/" class="nav-link ${this.isCurrentPath('/schema-admin/schema-export') ? 'active' : ''}">
                                    <span class="nav-icon">💾</span>
                                    <span class="nav-text">Schema Export</span>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a href="/schema-admin/backup/" class="nav-link ${this.isCurrentPath('/schema-admin/backup') ? 'active' : ''}">
                                    <span class="nav-icon">📦</span>
                                    <span class="nav-text">Backup & Restore</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </nav>

                <div class="nav-footer">
                    <div class="nav-user">
                        <span class="user-icon">👤</span>
                        <span class="user-text">Admin User</span>
                    </div>
                    <a href="/" class="nav-link back-to-app">
                        <span class="nav-icon">↩️</span>
                        <span class="nav-text">Back to App</span>
                    </a>
                </div>
            </div>
        `;

        // Insert navigation at the beginning of body
        document.body.insertAdjacentHTML('afterbegin', navHTML);
        
        // Add main content wrapper
        const existingContent = document.body.innerHTML.replace(navHTML, '');
        document.body.innerHTML = navHTML + `
            <div class="admin-main-content ${this.isCollapsed ? 'nav-collapsed' : ''}">
                ${existingContent}
            </div>
        `;
    }

    bindEvents() {
        const toggleBtn = document.getElementById('nav-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleNavigation());
        }

        // Handle escape key to collapse nav
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.isCollapsed) {
                this.toggleNavigation();
            }
        });
    }

    toggleNavigation() {
        const nav = document.querySelector('.admin-nav');
        const mainContent = document.querySelector('.admin-main-content');
        const toggleIcon = document.querySelector('.toggle-icon');
        
        this.isCollapsed = !this.isCollapsed;
        
        nav.classList.toggle('collapsed', this.isCollapsed);
        mainContent.classList.toggle('nav-collapsed', this.isCollapsed);
        toggleIcon.textContent = this.isCollapsed ? '→' : '←';
        
        localStorage.setItem('admin-nav-collapsed', this.isCollapsed);
    }

    isCurrentPath(path, exact = false) {
        const normalizedCurrent = this.currentPath.replace(/\/$/, '');
        const normalizedPath = path.replace(/\/$/, '');
        
        if (exact) {
            // For Schema Admin home, only match exact path
            return normalizedCurrent === normalizedPath || normalizedCurrent === normalizedPath + '/';
        }
        
        return normalizedCurrent === normalizedPath || 
               normalizedCurrent === normalizedPath + '/' ||
               normalizedCurrent.startsWith(normalizedPath + '/');
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.adminNav = new AdminNavigation();
});