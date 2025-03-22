/**
 * Stats View
 * Displays character attributes and derived stats
 * Allows allocation of attribute points
 */
const StatsView = (function() {
    // Private properties
    let container = null;
    let character = null;
    let callbacks = {};
    let attributePoints = 0;
    let pendingAttributes = {
        strength: 0,
        agility: 0,
        stamina: 0,
        intellect: 0,
        wisdom: 0
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
        
        // Reset pending attributes
        pendingAttributes = {
            strength: 0,
            agility: 0,
            stamina: 0,
            intellect: 0,
            wisdom: 0
        };
        
        // Calculate available attribute points
        attributePoints = character.attributePoints || 0;
        
        fetchCharacterStats();
    }
    
    /**
     * Fetch the character's current stats
     */
    function fetchCharacterStats() {
        fetch(`/api/character/${character.id}/stats`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    character = {
                        ...character,
                        ...data.character
                    };
                    render();
                } else {
                    console.error('Error fetching character stats:', data.message);
                }
            })
            .catch(error => {
                console.error('Error fetching character stats:', error);
            });
    }
    
    /**
     * Render the stats view
     */
    function render() {
        container.innerHTML = '';
        
        // Character overview section
        const overviewSection = createOverviewSection();
        
        // Attribute points alert (if available)
        const attributePointsAlert = attributePoints > 0 ? 
            createAttributePointsAlert() : null;
        
        // Attributes section
        const attributesSection = createAttributesSection();
        
        // Derived stats section
        const derivedStatsSection = createDerivedStatsSection();
        
        // Advanced combat stats section
        const advancedStatsSection = createAdvancedStatsSection();
        
        // Save button (if points have been allocated)
        const hasPendingChanges = Object.values(pendingAttributes).some(val => val !== 0);
        const saveButton = hasPendingChanges ?
            UIRenderer.createElement('div', {
                className: 'd-grid gap-2 mt-4'
            }, [
                UIRenderer.createButton({
                    text: 'Save Changes',
                    variant: 'success',
                    onClick: saveAttributes
                })
            ]) : null;
        
        // Add all sections to the container
        [
            overviewSection,
            attributePointsAlert,
            attributesSection,
            derivedStatsSection,
            advancedStatsSection,
            saveButton
        ].filter(Boolean).forEach(section => {
            container.appendChild(section);
        });
    }
    
    /**
     * Create the character overview section
     * @returns {HTMLElement} The overview section
     */
    function createOverviewSection() {
        return UIRenderer.createCard({
            content: [
                UIRenderer.createElement('div', {
                    className: 'd-flex justify-content-between align-items-center mb-3'
                }, [
                    UIRenderer.createElement('h2', {
                        className: 'mb-0'
                    }, character.name),
                    UIRenderer.createElement('span', {
                        className: 'badge bg-primary fs-5'
                    }, `Level ${character.level}`)
                ]),
                UIRenderer.createProgressBar({
                    value: character.experience,
                    max: character.experienceToNextLevel,
                    label: 'Experience',
                    color: 'success'
                })
            ]
        });
    }
    
    /**
     * Create the attribute points alert section
     * @returns {HTMLElement} The attribute points alert
     */
    function createAttributePointsAlert() {
        return UIRenderer.createElement('div', {
            className: 'alert alert-primary mb-4',
            role: 'alert'
        }, [
            UIRenderer.createElement('h4', {
                className: 'alert-heading'
            }, 'Attribute Points Available!'),
            UIRenderer.createElement('p', {
                className: 'mb-0'
            }, `You have ${attributePoints} attribute points to spend. Allocate them to improve your character's abilities.`)
        ]);
    }
    
    /**
     * Create the attributes section
     * @returns {HTMLElement} The attributes section
     */
    function createAttributesSection() {
        return UIRenderer.createCard({
            title: 'Attributes',
            content: [
                UIRenderer.createElement('div', {
                    className: 'row'
                }, [
                    // Attributes column
                    UIRenderer.createElement('div', {
                        className: 'col-md-6'
                    }, [
                        createAttributeDisplay('Strength', 'strength'),
                        createAttributeDisplay('Agility', 'agility'),
                        createAttributeDisplay('Stamina', 'stamina'),
                        createAttributeDisplay('Intellect', 'intellect'),
                        createAttributeDisplay('Wisdom', 'wisdom')
                    ]),
                    
                    // Attribute controls column
                    UIRenderer.createElement('div', {
                        className: 'col-md-6'
                    }, [
                        createAttributeControls('strength'),
                        createAttributeControls('agility'),
                        createAttributeControls('stamina'),
                        createAttributeControls('intellect'),
                        createAttributeControls('wisdom')
                    ])
                ])
            ]
        });
    }
    
    /**
     * Create an attribute display element
     * @param {string} label - The attribute label
     * @param {string} attr - The attribute key
     * @returns {HTMLElement} The attribute display element
     */
    function createAttributeDisplay(label, attr) {
        const baseValue = character[attr] || 0;
        const bonusValue = character[`${attr}Bonus`] || 0;
        
        return UIRenderer.createElement('div', {
            className: 'mb-3'
        }, [
            UIRenderer.createElement('div', {
                className: 'd-flex justify-content-between'
            }, [
                UIRenderer.createElement('strong', {}, label),
                UIRenderer.createElement('div', {}, [
                    UIRenderer.createElement('span', {
                        className: 'badge bg-primary me-1'
                    }, baseValue.toString()),
                    bonusValue > 0 ? 
                        UIRenderer.createElement('span', {
                            className: 'badge bg-success'
                        }, `+${bonusValue}`) : null
                ])
            ])
        ]);
    }
    
    /**
     * Create attribute control buttons
     * @param {string} attr - The attribute key
     * @returns {HTMLElement} The attribute controls element
     */
    function createAttributeControls(attr) {
        const baseValue = character[attr] || 0;
        const pendingValue = pendingAttributes[attr] || 0;
        const totalValue = baseValue + pendingValue;
        
        return UIRenderer.createElement('div', {
            className: 'mb-3'
        }, [
            UIRenderer.createElement('div', {
                className: 'input-group'
            }, [
                UIRenderer.createElement('button', {
                    className: 'btn btn-outline-secondary',
                    type: 'button',
                    disabled: pendingValue <= 0,
                    onClick: () => decrementAttribute(attr)
                }, '-'),
                UIRenderer.createElement('input', {
                    type: 'text',
                    className: 'form-control text-center',
                    value: totalValue.toString(),
                    readOnly: true
                }),
                UIRenderer.createElement('button', {
                    className: 'btn btn-outline-primary',
                    type: 'button',
                    disabled: attributePoints <= 0,
                    onClick: () => incrementAttribute(attr)
                }, '+')
            ])
        ]);
    }
    
    /**
     * Create the derived stats section
     * @returns {HTMLElement} The derived stats section
     */
    function createDerivedStatsSection() {
        return UIRenderer.createCard({
            title: 'Combat Stats',
            content: [
                UIRenderer.createElement('div', {
                    className: 'row'
                }, [
                    // Left column
                    UIRenderer.createElement('div', {
                        className: 'col-md-6'
                    }, [
                        UIRenderer.createStatDisplay({
                            label: 'Health',
                            value: `${character.health}/${character.maxHealth}`
                        }),
                        UIRenderer.createStatDisplay({
                            label: 'Mana',
                            value: `${character.mana}/${character.maxMana}`
                        }),
                        UIRenderer.createStatDisplay({
                            label: 'Physical Damage',
                            value: `${character.minPhysicalDamage}-${character.maxPhysicalDamage}`
                        }),
                        UIRenderer.createStatDisplay({
                            label: 'Magic Damage',
                            value: `${character.minMagicDamage}-${character.maxMagicDamage}`
                        })
                    ]),
                    
                    // Right column
                    UIRenderer.createElement('div', {
                        className: 'col-md-6'
                    }, [
                        UIRenderer.createStatDisplay({
                            label: 'Attack Speed',
                            value: `${character.attackSpeed.toFixed(2)}s`
                        }),
                        UIRenderer.createStatDisplay({
                            label: 'Critical Chance',
                            value: `${character.critChance.toFixed(2)}%`
                        }),
                        UIRenderer.createStatDisplay({
                            label: 'Spell Critical Chance',
                            value: `${character.spellCritChance.toFixed(2)}%`
                        }),
                        UIRenderer.createStatDisplay({
                            label: 'Physical Damage Reduction',
                            value: `${character.physicalDamageReduction.toFixed(2)}%`
                        }),
                        UIRenderer.createStatDisplay({
                            label: 'Magic Damage Reduction',
                            value: `${character.magicDamageReduction.toFixed(2)}%`
                        })
                    ])
                ])
            ]
        });
    }
    
    /**
     * Create the advanced combat stats section
     * @returns {HTMLElement} The advanced stats section
     */
    function createAdvancedStatsSection() {
        return UIRenderer.createCard({
            title: 'Advanced Combat Stats',
            content: [
                UIRenderer.createElement('div', {
                    className: 'row'
                }, [
                    UIRenderer.createElement('div', {
                        className: 'col-md-6'
                    }, [
                        UIRenderer.createStatDisplay({
                            label: 'Dodge Chance',
                            value: `${character.dodgeChance.toFixed(2)}%`
                        }),
                        UIRenderer.createStatDisplay({
                            label: 'Accuracy',
                            value: `${character.accuracy.toFixed(2)}%`
                        })
                    ]),
                    UIRenderer.createElement('div', {
                        className: 'col-md-6'
                    }, [
                        UIRenderer.createStatDisplay({
                            label: 'Block Chance',
                            value: `${character.blockChance.toFixed(2)}%`
                        })
                    ])
                ]),
                UIRenderer.createElement('div', {
                    className: 'small text-muted mt-2'
                }, [
                    UIRenderer.createElement('p', {
                        className: 'mb-1'
                    }, 'Dodge allows you to completely avoid an attack.'),
                    UIRenderer.createElement('p', {
                        className: 'mb-1'
                    }, 'Accuracy counters enemy dodge chance.'),
                    UIRenderer.createElement('p', {
                        className: 'mb-0'
                    }, 'Block reduces physical damage by 50% when successful.')
                ])
            ]
        });
    }
    
    /**
     * Increment an attribute
     * @param {string} attr - The attribute to increment
     */
    function incrementAttribute(attr) {
        if (attributePoints <= 0) return;
        
        pendingAttributes[attr]++;
        attributePoints--;
        
        render();
    }
    
    /**
     * Decrement an attribute
     * @param {string} attr - The attribute to decrement
     */
    function decrementAttribute(attr) {
        if (pendingAttributes[attr] <= 0) return;
        
        pendingAttributes[attr]--;
        attributePoints++;
        
        render();
    }
    
    /**
     * Save attribute changes
     */
    function saveAttributes() {
        // Check if there are any changes to save
        if (Object.values(pendingAttributes).every(val => val === 0)) return;
        
        // Send save request
        fetch(`/api/character/${character.id}/attributes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                attributes: pendingAttributes
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update character data
                    character = {
                        ...character,
                        ...data.character
                    };
                    
                    // Reset pending attributes
                    pendingAttributes = {
                        strength: 0,
                        agility: 0,
                        stamina: 0,
                        intellect: 0,
                        wisdom: 0
                    };
                    
                    // Notify parent component of character update
                    if (callbacks.onCharacterUpdated) {
                        callbacks.onCharacterUpdated(character);
                    }
                    
                    // Show success message
                    UIRenderer.showToast({
                        title: 'Success',
                        message: 'Attributes updated successfully',
                        type: 'success'
                    });
                    
                    // Re-render with updated data
                    fetchCharacterStats();
                } else {
                    console.error('Error saving attributes:', data.message);
                    
                    // Show error message
                    UIRenderer.showToast({
                        title: 'Error',
                        message: data.message || 'Failed to update attributes',
                        type: 'danger'
                    });
                }
            })
            .catch(error => {
                console.error('Error saving attributes:', error);
                
                // Show error message
                UIRenderer.showToast({
                    title: 'Error',
                    message: 'An error occurred while saving attributes',
                    type: 'danger'
                });
            });
    }
    
    // Public API
    return {
        init
    };
})();