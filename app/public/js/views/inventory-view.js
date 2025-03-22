/**
 * Inventory View
 * Displays and manages character equipment and inventory
 */
const InventoryView = (function() {
    // Private properties
    let container = null;
    let character = null;
    let callbacks = {};
    let inventory = [];
    let equipment = {};
    
    // Equipment slot display names
    const slotDisplayNames = {
        head: 'Head',
        chest: 'Chest',
        legs: 'Legs',
        mainHand: 'Main Hand',
        offHand: 'Off Hand'
    };
    
    /**
     * Initialize the view
     * @param {HTMLElement} containerElement - The container element
     * @param {Object} options - Configuration options
     */
    function init(containerElement, options = {}) {
        container = containerElement;
        character = options.character;
        callbacks = options;
        
        fetchInventoryData();
    }
    
    /**
     * Fetch inventory and equipment data
     */
    function fetchInventoryData() {
        Promise.all([
            fetch(`/api/inventory/${character.id}`).then(res => res.json()),
            fetch(`/api/equipment/${character.id}`).then(res => res.json())
        ])
            .then(([inventoryData, equipmentData]) => {
                if (inventoryData.success && equipmentData.success) {
                    inventory = inventoryData.items || [];
                    equipment = equipmentData.equipment || {};
                    render();
                } else {
                    console.error('Error fetching inventory data:',
                        inventoryData.success ? '' : inventoryData.message,
                        equipmentData.success ? '' : equipmentData.message);
                }
            })
            .catch(error => {
                console.error('Error fetching inventory data:', error);
            });
    }
    
    /**
     * Render the inventory view
     */
    function render() {
        container.innerHTML = '';
        
        // Equipment section
        const equipmentSection = createEquipmentSection();
        
        // Inventory section
        const inventorySection = createInventorySection();
        
        // Add sections to container
        container.appendChild(equipmentSection);
        container.appendChild(inventorySection);
    }
    
    /**
     * Create the equipment section
     * @returns {HTMLElement} The equipment section
     */
    function createEquipmentSection() {
        return UIRenderer.createCard({
            title: 'Equipment',
            content: [
                UIRenderer.createElement('div', {
                    className: 'row'
                }, [
                    // First row: Head, Chest, Legs
                    UIRenderer.createElement('div', {
                        className: 'col-md-4'
                    }, [
                        createEquipmentSlot('head')
                    ]),
                    UIRenderer.createElement('div', {
                        className: 'col-md-4'
                    }, [
                        createEquipmentSlot('chest')
                    ]),
                    UIRenderer.createElement('div', {
                        className: 'col-md-4'
                    }, [
                        createEquipmentSlot('legs')
                    ]),
                    
                    // Second row: Main Hand, Off Hand
                    UIRenderer.createElement('div', {
                        className: 'col-md-6'
                    }, [
                        createEquipmentSlot('mainHand')
                    ]),
                    UIRenderer.createElement('div', {
                        className: 'col-md-6'
                    }, [
                        createEquipmentSlot('offHand')
                    ])
                ])
            ]
        });
    }
    
    /**
     * Create an equipment slot element
     * @param {string} slot - The equipment slot
     * @returns {HTMLElement} The equipment slot element
     */
    function createEquipmentSlot(slot) {
        const item = equipment[slot] || null;
        
        return UIRenderer.createEquipmentSlot({
            name: slotDisplayNames[slot],
            item: item,
            onUnequip: item ? () => unequipItem(slot) : null
        });
    }
    
    /**
     * Create the inventory section
     * @returns {HTMLElement} The inventory section
     */
    function createInventorySection() {
        let content;
        
        if (inventory.length === 0) {
            content = UIRenderer.createElement('div', {
                className: 'alert alert-info mb-0'
            }, 'Your inventory is empty. Visit the Shop to purchase items.');
        } else {
            // Group items by type
            const weapons = inventory.filter(item => item.type === 'weapon');
            const armors = inventory.filter(item => item.type === 'armor');
            
            content = [
                // Weapons section
                weapons.length > 0 ? UIRenderer.createElement('div', {
                    className: 'mb-4'
                }, [
                    UIRenderer.createElement('h4', {
                        className: 'border-bottom pb-2 mb-3'
                    }, 'Weapons'),
                    UIRenderer.createElement('div', {
                        className: 'row'
                    }, weapons.map(item => 
                        UIRenderer.createElement('div', {
                            className: 'col-lg-4 col-md-6 mb-3'
                        }, [
                            createInventoryItemCard(item)
                        ])
                    ))
                ]) : null,
                
                // Armors section
                armors.length > 0 ? UIRenderer.createElement('div', {}, [
                    UIRenderer.createElement('h4', {
                        className: 'border-bottom pb-2 mb-3'
                    }, 'Armor'),
                    UIRenderer.createElement('div', {
                        className: 'row'
                    }, armors.map(item => 
                        UIRenderer.createElement('div', {
                            className: 'col-lg-4 col-md-6 mb-3'
                        }, [
                            createInventoryItemCard(item)
                        ])
                    ))
                ]) : null
            ].filter(Boolean);
        }
        
        return UIRenderer.createCard({
            title: 'Inventory',
            content: content
        });
    }
    
    /**
     * Create an inventory item card
     * @param {Object} item - The inventory item
     * @returns {HTMLElement} The item card element
     */
    function createInventoryItemCard(item) {
        const equipButton = UIRenderer.createButton({
            text: 'Equip',
            variant: 'primary',
            size: 'sm',
            className: 'w-100',
            onClick: () => equipItem(item)
        });
        
        return UIRenderer.createItemCard({
            item: item,
            actionButton: equipButton
        });
    }
    
    /**
     * Equip an item
     * @param {Object} item - The item to equip
     */
    function equipItem(item) {
        fetch(`/api/equipment/${character.id}/equip`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                itemId: item.id
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update local data
                    equipment = data.equipment;
                    inventory = data.inventory;
                    
                    // Update character stats
                    character = {
                        ...character,
                        ...data.character
                    };
                    
                    // Notify parent of character update
                    if (callbacks.onCharacterUpdated) {
                        callbacks.onCharacterUpdated(character);
                    }
                    
                    // Show success message
                    UIRenderer.showToast({
                        title: 'Success',
                        message: `${item.name} equipped successfully`,
                        type: 'success'
                    });
                    
                    // Re-render view
                    render();
                } else {
                    // Handle equipment failure
                    UIRenderer.showToast({
                        title: 'Error',
                        message: data.message || 'Failed to equip item',
                        type: 'danger'
                    });
                }
            })
            .catch(error => {
                console.error('Error equipping item:', error);
                UIRenderer.showToast({
                    title: 'Error',
                    message: 'An error occurred while equipping the item',
                    type: 'danger'
                });
            });
    }
    
    /**
     * Unequip an item
     * @param {string} slot - The equipment slot to unequip
     */
    function unequipItem(slot) {
        fetch(`/api/equipment/${character.id}/unequip`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                slot: slot
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update local data
                    equipment = data.equipment;
                    inventory = data.inventory;
                    
                    // Update character stats
                    character = {
                        ...character,
                        ...data.character
                    };
                    
                    // Notify parent of character update
                    if (callbacks.onCharacterUpdated) {
                        callbacks.onCharacterUpdated(character);
                    }
                    
                    // Show success message
                    UIRenderer.showToast({
                        title: 'Success',
                        message: `Item unequipped successfully`,
                        type: 'success'
                    });
                    
                    // Re-render view
                    render();
                } else {
                    // Handle unequip failure
                    UIRenderer.showToast({
                        title: 'Error',
                        message: data.message || 'Failed to unequip item',
                        type: 'danger'
                    });
                }
            })
            .catch(error => {
                console.error('Error unequipping item:', error);
                UIRenderer.showToast({
                    title: 'Error',
                    message: 'An error occurred while unequipping the item',
                    type: 'danger'
                });
            });
    }
    
    // Public API
    return {
        init
    };
})();