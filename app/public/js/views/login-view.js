/**
 * Login and Registration View
 * Handles user authentication and account creation
 */
const LoginView = (function() {
    // Private properties
    let container = null;
    let callbacks = {};
    let activeTab = 'login';
    
    /**
     * Initialize the view
     * @param {HTMLElement} containerElement - The container element
     * @param {Object} options - Configuration options
     */
    function init(containerElement, options = {}) {
        container = containerElement;
        callbacks = options;
        
        render();
        setupEventListeners();
    }
    
    /**
     * Render the login/register form
     */
    function render() {
        // Create the auth card
        const authCard = UIRenderer.createCard({
            className: 'auth-card',
            bodyClassName: 'p-0',
            content: [
                // Tab navigation
                UIRenderer.createElement('ul', {
                    className: 'nav nav-tabs',
                    role: 'tablist'
                }, [
                    UIRenderer.createElement('li', {
                        className: 'nav-item flex-grow-1 text-center',
                        role: 'presentation'
                    }, [
                        UIRenderer.createElement('a', {
                            className: 'nav-link active',
                            id: 'login-tab',
                            'data-bs-toggle': 'tab',
                            'data-bs-target': '#login-pane',
                            type: 'button',
                            role: 'tab',
                            'aria-controls': 'login-pane',
                            'aria-selected': 'true',
                            onClick: () => { activeTab = 'login'; }
                        }, 'Login')
                    ]),
                    UIRenderer.createElement('li', {
                        className: 'nav-item flex-grow-1 text-center',
                        role: 'presentation'
                    }, [
                        UIRenderer.createElement('a', {
                            className: 'nav-link',
                            id: 'register-tab',
                            'data-bs-toggle': 'tab',
                            'data-bs-target': '#register-pane',
                            type: 'button',
                            role: 'tab',
                            'aria-controls': 'register-pane',
                            'aria-selected': 'false',
                            onClick: () => { activeTab = 'register'; }
                        }, 'Register')
                    ])
                ]),
                
                // Tab content
                UIRenderer.createElement('div', {
                    className: 'tab-content p-4'
                }, [
                    // Login pane
                    UIRenderer.createElement('div', {
                        className: 'tab-pane fade show active',
                        id: 'login-pane',
                        role: 'tabpanel',
                        'aria-labelledby': 'login-tab'
                    }, [
                        // Login form
                        UIRenderer.createElement('form', {
                            id: 'login-form',
                            className: 'needs-validation',
                            novalidate: true
                        }, [
                            // Username field
                            UIRenderer.createFormGroup({
                                id: 'login-username',
                                label: 'Username',
                                required: true
                            }),
                            
                            // Password field
                            UIRenderer.createFormGroup({
                                id: 'login-password',
                                label: 'Password',
                                type: 'password',
                                required: true
                            }),
                            
                            // Error message area (hidden by default)
                            UIRenderer.createElement('div', {
                                id: 'login-error',
                                className: 'alert alert-danger d-none',
                                role: 'alert'
                            }),
                            
                            // Submit button
                            UIRenderer.createElement('div', {
                                className: 'd-grid gap-2'
                            }, [
                                UIRenderer.createButton({
                                    text: 'Login',
                                    type: 'submit',
                                    className: 'w-100'
                                })
                            ])
                        ])
                    ]),
                    
                    // Register pane
                    UIRenderer.createElement('div', {
                        className: 'tab-pane fade',
                        id: 'register-pane',
                        role: 'tabpanel',
                        'aria-labelledby': 'register-tab'
                    }, [
                        // Register form
                        UIRenderer.createElement('form', {
                            id: 'register-form',
                            className: 'needs-validation',
                            novalidate: true
                        }, [
                            // Username field
                            UIRenderer.createFormGroup({
                                id: 'register-username',
                                label: 'Username',
                                required: true
                            }),
                            
                            // Password field
                            UIRenderer.createFormGroup({
                                id: 'register-password',
                                label: 'Password',
                                type: 'password',
                                required: true
                            }),
                            
                            // Error message area (hidden by default)
                            UIRenderer.createElement('div', {
                                id: 'register-error',
                                className: 'alert alert-danger d-none',
                                role: 'alert'
                            }),
                            
                            // Submit button
                            UIRenderer.createElement('div', {
                                className: 'd-grid gap-2'
                            }, [
                                UIRenderer.createButton({
                                    text: 'Register',
                                    type: 'submit',
                                    className: 'w-100'
                                })
                            ])
                        ])
                    ])
                ])
            ]
        });
        
        // Append the auth card to the container
        container.appendChild(authCard);
    }
    
    /**
     * Set up event listeners for form submission
     */
    function setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('login-form');
        loginForm.addEventListener('submit', handleLogin);
        
        // Register form submission
        const registerForm = document.getElementById('register-form');
        registerForm.addEventListener('submit', handleRegister);
    }
    
    /**
     * Handle login form submission
     * @param {Event} event - The form submission event
     */
    function handleLogin(event) {
        event.preventDefault();
        
        // Get form data
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        
        // Validate inputs
        if (!username || !password) {
            showError('login', 'Please fill in all fields');
            return;
        }
        
        // Send login request
        fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Login successful
                    if (callbacks.onLogin) {
                        callbacks.onLogin(data.user);
                    }
                } else {
                    // Login failed
                    showError('login', data.message || 'Invalid username or password');
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                showError('login', 'An error occurred. Please try again.');
            });
    }
    
    /**
     * Handle register form submission
     * @param {Event} event - The form submission event
     */
    function handleRegister(event) {
        event.preventDefault();
        
        // Get form data
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        
        // Validate inputs
        if (!username || !password) {
            showError('register', 'Please fill in all fields');
            return;
        }
        
        if (username.length < 3) {
            showError('register', 'Username must be at least 3 characters');
            return;
        }
        
        if (password.length < 6) {
            showError('register', 'Password must be at least 6 characters');
            return;
        }
        
        // Send registration request
        fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Registration successful
                    if (callbacks.onLogin) {
                        callbacks.onLogin(data.user);
                    }
                } else {
                    // Registration failed
                    showError('register', data.message || 'Registration failed');
                }
            })
            .catch(error => {
                console.error('Registration error:', error);
                showError('register', 'An error occurred. Please try again.');
            });
    }
    
    /**
     * Show an error message in the form
     * @param {string} form - The form to show the error in ('login' or 'register')
     * @param {string} message - The error message to display
     */
    function showError(form, message) {
        const errorElement = document.getElementById(`${form}-error`);
        errorElement.textContent = message;
        errorElement.classList.remove('d-none');
        
        // Hide the error after 5 seconds
        setTimeout(() => {
            errorElement.classList.add('d-none');
        }, 5000);
    }
    
    // Public API
    return {
        init
    };
})();