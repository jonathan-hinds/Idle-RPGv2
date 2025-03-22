/**
 * Rotation View
 * Allows players to set up their ability rotation for combat
 */
const RotationView = (function() {
    // Private properties
    let container = null;
    let character = null;
    let callbacks = {};
    let availableAbilities = [];
    let characterRotation = [];
    let basicAttackType = 'physical';
    let sortableInstance = null;
    
    /**
     * Initialize the view
     * @param {HTMLElement} containerElement - The container element
     * @param {Object} options - Configuration options
     */
    function init(containerElement, options = {}) {
        container = containerElement;
        character = options.character;
        callbacks = options;
        
        fetchRotationData();
    }
    
    /**
     * Fetch rotation and abilities data
     */
    function fetchRotationData() {
        Promise.all([
            fetch(`/api/abilities/available`).then(res => res.json()),
            fetch(`/api/rotation/${character.id}`).then(res => res.json())
        ])
            .then(([abilitiesData, rotationData]) => {
                if (abilitiesData.success && rotationData.success) {
                    availableAbilities = abilitiesData.abilities || [];
                    characterRotation = rotationData.rotation || [];
                    basicAttackType = rotationData.basicAttackType || 'physical';
                    render();
                } else {
                    console.error('Error fetching rotation data:',
                        abilitiesData.success ? '' : abilitiesData.message,
                        rotationData.success ? '' : rotationData.message);
                }
            })
            .catch(error => {
                console.error('Error fetching rotation data:', error);
            });
    }
    
    /**
     * Render the rotation view
     */
    function render() {
        container.innerHTML = '';
        
        // Introduction
        const introSection = UIRenderer.createCard({
            content: [
                UIRenderer.createElement('h3', {
                    className: 'mb-3'
                }, 'Ability Rotation'),
                UIRenderer.createElement('p', {
                    className: 'mb-0'
                }, 'Set up your character\'s combat rotation by selecting abilities and arranging them in order. Your character will attempt to use abilities in this sequence during combat, falling back to basic attacks when abilities are unavailable.')
            ],
            className: 'mb-4'
        });
        
        // Basic attack type selection
        const attackTypeSection = UIRenderer.createCard({
            title: 'Basic Attack Type',
            content: [
                UIRenderer.createElement('p', {
                    className: 'mb-3'
                }, 'Select the type of attack your character will use when no abilities are available:'),
                UIRenderer.createElement('div', {
                    className: 'btn-group mb-0',
                    role: 'group'
                }, [
                    UIRenderer.createElement('input', {
                        type: 'radio',
                        className: 'btn-check',
                        name: 'attackType',
                        id: 'attackType-physical',
                        autocomplete: 'off',
                        checked: basicAttackType === 'physical',
                        onClick: () => setBasicAttackType('physical')
                    }),
                    UIRenderer.createElement('label', {
                        className: 'btn btn-outline-primary',
                        for: 'attackType-physical'
                    }, 'Physical'),
                    
                    UIRenderer.createElement('input', {
                        type: 'radio',
                        className: 'btn-check',
                        name: 'attackType',
                        id: 'attackType-magic',
                        autocomplete: 'off',
                        checked: basicAttackType === 'magic',
                        onClick: () => setBasicAttackType('magic')
                    }),
                    UIRenderer.createElement('label', {
                        className: 'btn btn-outline-primary',
                        for: 'attackType-magic'
                    }, 'Magic')
                ])
            ],
            className: 'mb-4'
        });
        
        // Available abilities section
        const availableSection = createAvailableAbilitiesSection();
        
        // Character rotation section
        const rotationSection = createRotationSection();
        
        // Save button
        const saveButtonContainer = UIRenderer.createElement('div', {
            className: 'd-grid gap-2 mt-4'
        }, [
            UIRenderer.createButton({
                text: 'Save Rotation',
                variant: 'success',
                size: 'lg',
                onClick: saveRotation,
                disabled: characterRotation.length < 3
            })
        ]);
        
        // Add sections to container
        container.appendChild(introSection);
        container.appendChild(attackTypeSection);
        container.appendChild(availableSection);
        container.appendChild(rotationSection);
        container.appendChild(saveButtonContainer);
        
        // Initialize drag and drop after rendering
        initializeDragAndDrop();
    }
    
    /**
     * Create the available abilities section
     * @returns {HTMLElement} The available abilities section
     */
    function createAvailableAbilitiesSection() {
        // Group abilities by type
        const groupedAbilities = availableAbilities.reduce((groups, ability) => {
            if (!groups[ability.type]) {
                groups[ability.type] = [];
            }
            groups[ability.type].push(ability);
            return groups;
        }, {});
        
        // Create sections for each ability type
        const abilitySections = Object.entries(groupedAbilities).map(([type, abilities]) => {
            return UIRenderer.createElement('div', {
                className: 'mb-4'
            }, [
                UIRenderer.createElement('h5', {
                    className: 'border-bottom pb-2 mb-3'
                }, `${type.charAt(0).toUpperCase() + type.slice(1)} Abilities`),
                UIRenderer.createElement('div', {
                    className: 'row'
                }, abilities.map(ability => 
                    UIRenderer.createElement('div', {
                        className: 'col-lg-4 col-md-6 mb-3'
                    }, [
                        UIRenderer.createAbilityCard({
                            ability: ability,
                            draggable: true,
                            className: 'available-ability'
                        })
                    ])
                ))
            ]);
        });
        
        return UIRenderer.createCard({
            title: 'Available Abilities',
            content: [
                UIRenderer.createElement('div', {
                    className: 'available-abilities-container',
                    style: { maxHeight: '400px', overflowY: 'auto' }
                }, abilitySections)
            ],
            className: 'mb-4'
        });
    }
    
    /**
     * Create the character rotation section
     * @returns {HTMLElement} The rotation section
     */
    function createRotationSection() {
        let content;
        
        if (characterRotation.length === 0) {
            content = UIRenderer.createElement('div', {
                className: 'alert alert-info mb-0'
            }, 'Drag abilities from above to add them to your rotation.');
        } else {
            content = UIRenderer.createElement('div', {
                className: 'row',
                id: 'rotation-container'
            }, characterRotation.map((ability, index) => 
                UIRenderer.createElement('div', {
                    className: 'col-lg-4 col-md-6 mb-3',
                    'data-ability-id': ability.id
                }, [
                    UIRenderer.createAbilityCard({
                        ability: ability,
                        position: index + 1,
                        onRemove: () => removeFromRotation(index),
                        className: 'rotation-ability'
                    })
                ])
            ));
        }
        
        // Add minimum requirements info
        const requirementsInfo = UIRenderer.createElement('div', {
            className: `alert ${characterRotation.length >= 3 ? 'alert-success' : 'alert-warning'} mt-3 mb-0`
        }, `Your rotation must have at least 3 abilities. Current count: ${characterRotation.length}`);
        
        return UIRenderer.createCard({
            title: 'Your Rotation',
            content: [
                UIRenderer.createElement('div', {
                    className: 'rotation-container p-3',
                    id: 'rotation-drop-zone'
                }, [content]),
                requirementsInfo
            ],
            className: 'mb-4'
        });
    }
    
    /**
     * Initialize drag and drop functionality
     */
    function initializeDragAndDrop() {
        // Handle rotation sorting
        const rotationContainer = document.getElementById('rotation-container');
        if (rotationContainer) {
            // Destroy previous instance if it exists
            if (sortableInstance) {
                sortableInstance.destroy();
            }
            
            // Create new sortable instance
            sortableInstance = new Sortable(rotationContainer, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: function(evt) {
                    // Get the new order
                    const items = rotationContainer.querySelectorAll('[data-ability-id]');
                    const newRotation = [];
                    
                    items.forEach(item => {
                        const abilityId = item.getAttribute('data-ability-id');
                        const ability = characterRotation.find(a => a.id.toString() === abilityId);
                        if (ability) {
                            newRotation.push(ability);
                        }
                    });
                    
                    characterRotation = newRotation;
                    render();
                }
            });
        }
        
        // Set up drag from available to rotation
        const availableAbilities = document.querySelectorAll('.available-ability');
        const dropZone = document.getElementById('rotation-drop-zone');
        
        availableAbilities.forEach(card => {
            card.addEventListener('dragstart', handleDragStart);
        });
        
        if (dropZone) {
            dropZone.addEventListener('dragover', handleDragOver);
            dropZone.addEventListener('drop', handleDrop);
        }
    }
    
    /**
     * Handle drag start event
     * @param {DragEvent} event - The drag event
     */
    function handleDragStart(event) {
        const abilityId = event.target.getAttribute('data-ability-id');
        event.dataTransfer.setData('text/plain', abilityId);
    }
    
    /**
     * Handle drag over event
     * @param {DragEvent} event - The drag event
     */
    function handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('active');
    }
    
    /**
     * Handle drop event
     * @param {DragEvent} event - The drop event
     */
    function handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('active');
        
        const abilityId = event.dataTransfer.getData('text/plain');
        const ability = availableAbilities.find(a => a.id.toString() === abilityId);
        
        if (ability && !characterRotation.some(a => a.id.toString() === abilityId)) {
            characterRotation.push(ability);
            render();
        }
    }
    
    /**
     * Remove an ability from the rotation
     * @param {number} index - The index of the ability to remove
     */
    function removeFromRotation(index) {
        characterRotation.splice(index, 1);
        render();
    }
    
    /**
     * Set the basic attack type
     * @param {string} type - The attack type ('physical' or 'magic')
     */
    function setBasicAttackType(type) {
        basicAttackType = type;
        render();
    }
    
    /**
     * Save the character's rotation
     */
    function saveRotation() {
        // Check minimum requirements
        if (characterRotation.length < 3) {
            UIRenderer.showToast({
                title: 'Error',
                message: 'Your rotation must have at least 3 abilities',
                type: 'danger'
            });
            return;
        }
        
        // Prepare rotation data
        const rotationData = {
            characterId: character.id,
            basicAttackType: basicAttackType,
            rotation: characterRotation.map(ability => ability.id)
        };
        
        // Send save request
        fetch('/api/rotation/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rotationData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show success message
                    UIRenderer.showToast({
                        title: 'Success',
                        message: 'Rotation saved successfully',
                        type: 'success'
                    });
                } else {
                    // Handle save failure
                    UIRenderer.showToast({
                        title: 'Error',
                        message: data.message || 'Failed to save rotation',
                        type: 'danger'
                    });
                }
            })
            .catch(error => {
                console.error('Error saving rotation:', error);
                UIRenderer.showToast({
                    title: 'Error',
                    message: 'An error occurred while saving rotation',
                    type: 'danger'
                });
            });
    }
    
    // Public API
    return {
        init
    };
})();