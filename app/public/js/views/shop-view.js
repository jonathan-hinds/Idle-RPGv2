/**
 * Shop View
 * Displays items available for purchase
 */
const ShopView = (function() {
    // Private properties
    let container = null;
    let character = null;
    let callbacks = {};
    let shopItems = [];
    
    /**
     * Initialize the view
     * @param {HTMLElement} containerElement - The container element
     * @param {Object} options - Configuration options
     */
    function init(containerElement, options = {}) {
        container = containerElement;
        character = options.character;
        callbacks = options;
        
        fetchShopItems();
    }
    
    /**
     * Fetch items available in the shop
     */
    function fetchShopItems() {
        fetch('/api/shop/items')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    shopItems = data.items || [];
                    render();
                } else {
                    console.error('Error fetching shop items:', data.message);
                }
            })
            .catch(error => {
                console.error('Error fetching shop items:', error);
            });
    }
    
    /**
     * Render the shop view
     */
    function render() {
        container.innerHTML = '';
        
        // Shop introduction
        const introSection = UIRenderer.createCard({
            content: [
                UIRenderer.createElement('h3', {
                    className: 'mb-3'
                }, 'Equipment Shop'),
                UIRenderer.createElement('p', {
                    className: 'mb-0'
                }, 'Welcome to the shop! Purchase equipment to enhance your character\'s combat capabilities.')
            ],
            className: 'mb-4'
        });
        
        // Current gold
        const goldSection = UIRenderer.createElement('div', {
            className: 'alert alert-warning mb-4'
        }, [
            UIRenderer.createElement('div', {
                className: 'd-flex align-items-center'
            }, [
                UIRenderer.createElement('i', {
                    className: 'bi bi-coin fs-4 me-2'
                }),
                UIRenderer.createElement('span', {
                    className: 'fs-5'
                }, `Your Gold: ${character.gold || 0}`)
            ])
        ]);
        
        // Items for sale
        let itemsContent;
        
        if (shopItems.length === 0) {
            itemsContent = UIRenderer.createElement('div', {
                className: 'alert alert-info mb-0'
            }, 'No items available in the shop at the moment. Check back later!');
        } else {
            // Group items by type
            const weapons = shopItems.filter(item => item.type === 'weapon');
            const armors = shopItems.filter(item => item.type === 'armor');
            
            itemsContent = [
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
                            createShopItemCard(item)
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
                            createShopItemCard(item)
                        ])
                    ))
                ]) : null
            ].filter(Boolean);
        }
        
        const itemsSection = UIRenderer.createCard({
            title: 'Items for Sale',
            content: itemsContent
        });
        
        // Add sections to container
        container.appendChild(introSection);
        container.appendChild(goldSection);
        container.appendChild(itemsSection);
    }
    
    /**
     * Create a shop item card
     * @param {Object} item - The shop item
     * @returns {HTMLElement} The item card element
     */
    function createShopItemCard(item) {
        const canAfford = (character.gold || 0) >= item.price;
        
        const buyButton = UIRenderer.createButton({
            text: 'Buy',
            variant: canAfford ? 'success' : 'secondary',
            size: 'sm',
            className: 'w-100',
            disabled: !canAfford,
            onClick: () => purchaseItem(item)
        });
        
        return UIRenderer.createItemCard({
            item: item,
            actionButton: buyButton
        });
    }
    
    /**
     * Purchase an item from the shop
     * @param {Object} item - The item to purchase
     */
    function purchaseItem(item) {
        fetch(`/api/shop/buy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                characterId: character.id,
                itemId: item.id
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update character gold
                    character.gold = data.gold;
                    
                    // Notify parent of character update
                    if (callbacks.onCharacterUpdated) {
                        callbacks.onCharacterUpdated({
                            ...character,
                            gold: data.gold
                        });
                    }
                    
                    // Show success message
                    UIRenderer.showToast({
                        title: 'Purchase Successful',
                        message: `You purchased ${item.name} for ${item.price} gold`,
                        type: 'success'
                    });
                    
                    // Re-render view
                    render();
                } else {
                    // Handle purchase failure
                    UIRenderer.showToast({
                        title: 'Purchase Failed',
                        message: data.message || 'Failed to purchase item',
                        type: 'danger'
                    });
                }
            })
            .catch(error => {
                console.error('Error purchasing item:', error);
                UIRenderer.showToast({
                    title: 'Error',
                    message: 'An error occurred during purchase',
                    type: 'danger'
                });
            });
    }
    
    // Public API
    return {
        init
    };
})();