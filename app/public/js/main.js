/**
 * Main Application
 * Initializes and coordinates the game's client-side functionality
 */
const App = (function() {
    // Private properties
    let currentUser = null;
    let currentCharacter = null;
    let currentView = null;
    let views = {};
    
    /**
     * Initialize the application
     */
    function init() {
        // Register views
        views = {
            login: LoginView,
            character: CharacterView,
            stats: StatsView,
            inventory: InventoryView,
            shop: ShopView,
            rotation: RotationView,
            battle: BattleView,
            challenge: ChallengeView,
            adventure: AdventureView
        };
        
        // Set up navigation event listeners
        document.querySelectorAll('[data-view]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const viewName = e.target.getAttribute('data-view');
                navigateTo(viewName);
            });
        });
        
        // Set up logout button
        document.getElementById('logout-btn').addEventListener('click', logout);
        
        // Check authentication state
        checkAuth();
    }
    
    /**
     * Check if user is authenticated
     */
    function checkAuth() {
        // Make API request to check auth status
        fetch('/api/auth/status')
            .then(response => response.json())
            .then(data => {
                if (data.authenticated) {
                    // User is logged in
                    currentUser = data.user;
                    
                    // Check if user has a character
                    return fetch('/api/character/list');
                } else {
                    // User is not logged in
                    showLoginView();
                }
            })
            .then(response => {
                if (response) return response.json();
            })
            .then(data => {
                if (data && data.characters && data.characters.length > 0) {
                    // User has at least one character
                    currentCharacter = data.characters[0];
                    showGameInterface();
                    navigateTo('stats');
                    updateGoldDisplay();
                } else if (data) {
                    // User is logged in but has no character
                    showCharacterCreationView();
                }
            })
            .catch(error => {
                console.error('Error checking authentication:', error);
                showLoginView();
            });
    }
    
    /**
     * Show the login view
     */
    function showLoginView() {
        // Hide main content and show login view
        document.getElementById('main-content').classList.add('d-none');
        
        // Create container for login view
        const container = document.getElementById('app-container');
        container.innerHTML = '';
        
        // Initialize login view
        if (views.login) {
            currentView = 'login';
            views.login.init(container, {
                onLogin: handleLogin
            });
        }
    }
    
    /**
     * Show the character creation view
     */
    function showCharacterCreationView() {
        // Hide main content
        document.getElementById('main-content').classList.add('d-none');
        
        // Create container for character creation view
        const container = document.getElementById('app-container');
        container.innerHTML = '';
        
        // Initialize character creation view
        if (views.character) {
            currentView = 'character';
            views.character.init(container, {
                onCharacterCreated: handleCharacterCreated
            });
        }
    }
    
    /**
     * Show the main game interface
     */
    function showGameInterface() {
        // Show main content
        document.getElementById('main-content').classList.remove('d-none');
        
        // Clear any login/character creation views
        const container = document.getElementById('app-container');
        const loginContent = container.querySelector('.auth-card');
        const characterContent = container.querySelector('.character-creation');
        
        if (loginContent) loginContent.remove();
        if (characterContent) characterContent.remove();
    }
    
    /**
     * Navigate to a specific view
     * @param {string} viewName - The name of the view to navigate to
     */
    function navigateTo(viewName) {
        // Ignore if trying to navigate to the current view
        if (currentView === viewName) return;
        
        // Check if view exists
        if (!views[viewName]) {
            console.error(`View '${viewName}' not found`);
            return;
        }
        
        // Check if character is required for this view
        if (viewName !== 'login' && viewName !== 'character' && !currentCharacter) {
            console.error('No character selected');
            return;
        }
        
        // Update active nav link
        document.querySelectorAll('[data-view]').forEach(link => {
            if (link.getAttribute('data-view') === viewName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        // Clear content container
        const contentContainer = document.getElementById('content');
        contentContainer.innerHTML = '';
        
        // Initialize the new view
        currentView = viewName;
        views[viewName].init(contentContainer, {
            character: currentCharacter,
            user: currentUser,
            onCharacterUpdated: handleCharacterUpdated
        });
    }
    
    /**
     * Handle successful login
     * @param {Object} userData - User data from the server
     */
    function handleLogin(userData) {
        currentUser = userData;
        
        // Check if user has a character
        fetch('/api/character/list')
            .then(response => response.json())
            .then(data => {
                if (data.characters && data.characters.length > 0) {
                    // User has at least one character
                    currentCharacter = data.characters[0];
                    showGameInterface();
                    navigateTo('stats');
                    updateGoldDisplay();
                } else {
                    // User is logged in but has no character
                    showCharacterCreationView();
                }
            })
            .catch(error => {
                console.error('Error fetching characters:', error);
            });
    }
    
    /**
     * Handle successful character creation
     * @param {Object} characterData - Character data from the server
     */
    function handleCharacterCreated(characterData) {
        currentCharacter = characterData;
        showGameInterface();
        navigateTo('stats');
        updateGoldDisplay();
    }
    
    /**
     * Handle character updates
     * @param {Object} characterData - Updated character data
     */
    function handleCharacterUpdated(characterData) {
        currentCharacter = characterData;
        updateGoldDisplay();
    }
    
    /**
     * Update the gold display in the navigation bar
     */
    function updateGoldDisplay() {
        if (currentCharacter && currentCharacter.gold !== undefined) {
            document.getElementById('gold-display').textContent = currentCharacter.gold;
        }
    }
    
    /**
     * Log out the current user
     */
    function logout() {
        fetch('/api/auth/logout', {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    currentUser = null;
                    currentCharacter = null;
                    currentView = null;
                    showLoginView();
                }
            })
            .catch(error => {
                console.error('Error logging out:', error);
            });
    }
    
    // Public API
    return {
        init
    };
})();

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);