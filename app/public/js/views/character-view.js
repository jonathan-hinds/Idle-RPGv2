/**
 * Character Creation View
 * Handles creating a new character
 */
const CharacterView = (function() {
    // Private properties
    let container = null;
    let callbacks = {};
    
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
     * Render the character creation form
     */
    function render() {
        // Create character creation card
        const createCharacterCard = UIRenderer.createCard({
            className: 'character-creation mx-auto',
            style: { maxWidth: '500px' },
            title: 'Create Your Character',
            content: [
                UIRenderer.createElement('form', {
                    id: 'character-form',
                    className: 'needs-validation',
                    novalidate: true
                }, [
                    // Character name field
                    UIRenderer.createFormGroup({
                        id: 'character-name',
                        label: 'Character Name',
                        required: true
                    }),
                    
                    // Information text
                    UIRenderer.createElement('div', {
                        className: 'alert alert-info mb-3'
                    }, [
                        UIRenderer.createElement('p', {
                            className: 'mb-1'
                        }, 'Your character will be created with:'),
                        UIRenderer.createElement('ul', {
                            className: 'mb-0'
                        }, [
                            UIRenderer.createElement('li', {}, 'Base stats of 1 in each attribute'),
                            UIRenderer.createElement('li', {}, '10 random attribute points'),
                            UIRenderer.createElement('li', {}, 'Starting gold and equipment')
                        ])
                    ]),
                    
                    // Error message area (hidden by default)
                    UIRenderer.createElement('div', {
                        id: 'character-error',
                        className: 'alert alert-danger d-none',
                        role: 'alert'
                    }),
                    
                    // Submit button
                    UIRenderer.createElement('div', {
                        className: 'd-grid gap-2'
                    }, [
                        UIRenderer.createButton({
                            text: 'Create Character',
                            type: 'submit',
                            className: 'w-100'
                        })
                    ])
                ])
            ]
        });
        
        // Append the card to the container
        container.appendChild(createCharacterCard);
    }
    
    /**
     * Set up event listeners for form submission
     */
    function setupEventListeners() {
        // Character creation form submission
        const characterForm = document.getElementById('character-form');
        characterForm.addEventListener('submit', handleCharacterCreation);
    }
    
    /**
     * Handle character creation form submission
     * @param {Event} event - The form submission event
     */
    function handleCharacterCreation(event) {
        event.preventDefault();
        
        // Get form data
        const name = document.getElementById('character-name').value.trim();
        
        // Validate inputs
        if (!name) {
            showError('Please enter a character name');
            return;
        }
        
        if (name.length < 3 || name.length > 20) {
            showError('Character name must be between 3 and 20 characters');
            return;
        }
        
        // Send character creation request
        fetch('/api/character/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Character creation successful
                    if (callbacks.onCharacterCreated) {
                        callbacks.onCharacterCreated(data.character);
                    }
                } else {
                    // Character creation failed
                    showError(data.message || 'Character creation failed');
                }
            })
            .catch(error => {
                console.error('Character creation error:', error);
                showError('An error occurred. Please try again.');
            });
    }
    
    /**
     * Show an error message in the form
     * @param {string} message - The error message to display
     */
    function showError(message) {
        const errorElement = document.getElementById('character-error');
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