/**
 * Adventure Mode View
 * Handles sending characters on timed adventures for rewards
 */
const AdventureView = (function() {
    // Private properties
    let container = null;
    let character = null;
    let callbacks = {};
    let adventureStatus = {
        active: false,
        startTime: null,
        duration: 0,
        endTime: null,
        progress: 0,
        events: []
    };
    let updateTimer = null;
    
    /**
     * Initialize the view
     * @param {HTMLElement} containerElement - The container element
     * @param {Object} options - Configuration options
     */
    function init(containerElement, options = {}) {
        container = containerElement;
        character = options.character;
        callbacks = options;
        
        // Clear any existing timers
        clearInterval(updateTimer);
        
        fetchAdventureData();
    }
    
    /**
     * Fetch adventure data
     */
    function fetchAdventureData() {
        // Check rotation validity first
        fetch(`/api/rotation/${character.id}/check`)
            .then(response => response.json())
            .then(rotationData => {
                const rotationValid = rotationData.success && rotationData.isValid;
                
                if (rotationValid) {
                    // Fetch adventure status
                    return fetch(`/api/adventure/${character.id}/status`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                adventureStatus = data.adventure;
                                
                                if (adventureStatus.active) {
                                    startUpdateTimer();
                                }
                            }
                            render(rotationValid);
                        });
                } else {
                    render(rotationValid);
                }
            })
            .catch(error => {
                console.error('Error fetching adventure data:', error);
                render(false);
            });
    }
    
    /**
     * Render the adventure view
     * @param {boolean} rotationValid - Whether the character has a valid rotation
     */
    function render(rotationValid) {
        container.innerHTML = '';
        
        // Introduction section
        const introSection = UIRenderer.createCard({
            content: [
                UIRenderer.createElement('h3', {
                    className: 'mb-3'
                }, 'Adventure Mode'),
                UIRenderer.createElement('p', {
                    className: 'mb-0'
                }, 'Send your character on adventures to collect rewards over time. Longer adventures offer better rewards but carry greater risks. Your character will encounter combat, find treasures, and gain experience along the way.')
            ],
            className: 'mb-4'
        });
        
        // Adventure status section
        const statusSection = createStatusSection(rotationValid);
        
        // Adventure log section (if adventure is active)
        const logSection = adventureStatus.active ? createAdventureLogSection() : null;
        
        // Add sections to container
        container.appendChild(introSection);
        container.appendChild(statusSection);
        if (logSection) {
            container.appendChild(logSection);
        }
    }
    
    /**
     * Create the adventure status section
     * @param {boolean} rotationValid - Whether the character has a valid rotation
     * @returns {HTMLElement} The status section
     */
    function createStatusSection(rotationValid) {
        let content;
        
        if (!rotationValid) {
            // Invalid rotation warning
            content = UIRenderer.createElement('div', {
                className: 'alert alert-warning mb-0'
            }, 'You need at least 3 abilities in your rotation to participate in Adventure Mode. Visit the Rotation tab to set up your abilities.');
        } else if (adventureStatus.active) {
            // Active adventure
            content = [
                // Progress bar
                UIRenderer.createElement('div', {
                    className: 'mb-4'
                }, [
                    UIRenderer.createElement('div', {
                        className: 'd-flex justify-content-between mb-2'
                    }, [
                        UIRenderer.createElement('div', {}, 'Adventure Progress'),
                        UIRenderer.createElement('div', {
                            id: 'adventure-time'
                        }, calculateTimeDisplay())
                    ]),
                    UIRenderer.createElement('div', {
                        className: 'progress adventure-progress-bar'
                    }, [
                        UIRenderer.createElement('div', {
                            className: 'progress-bar bg-success',
                            role: 'progressbar',
                            style: { width: `${adventureStatus.progress * 100}%` },
                            'aria-valuenow': adventureStatus.progress * 100,
                            'aria-valuemin': '0',
                            'aria-valuemax': '100'
                        }, `${Math.round(adventureStatus.progress * 100)}%`)
                    ])
                ]),
                
                // Character status
                UIRenderer.createElement('div', {
                    className: 'mb-4'
                }, [
                    UIRenderer.createElement('h5', {
                        className: 'mb-3'
                    }, 'Character Status'),
                    UIRenderer.createResourceBar({
                        current: character.health,
                        max: character.maxHealth,
                        type: 'health',
                        className: 'mb-2'
                    }),
                    UIRenderer.createResourceBar({
                        current: character.mana,
                        max: character.maxMana,
                        type: 'mana'
                    })
                ]),
                
                // Current rewards
                UIRenderer.createElement('div', {
                    className: 'mb-4'
                }, [
                    UIRenderer.createElement('h5', {
                        className: 'mb-3'
                    }, 'Rewards Accumulated'),
                    UIRenderer.createElement('div', {
                        className: 'row'
                    }, [
                        UIRenderer.createElement('div', {
                            className: 'col-md-4'
                        }, [
                            UIRenderer.createElement('div', {
                                className: 'd-flex align-items-center'
                            }, [
                                UIRenderer.createElement('i', {
                                    className: 'bi bi-coin text-warning me-2'
                                }),
                                UIRenderer.createElement('span', {}, `Gold: ${adventureStatus.rewards?.gold || 0}`)
                            ])
                        ]),
                        UIRenderer.createElement('div', {
                            className: 'col-md-4'
                        }, [
                            UIRenderer.createElement('div', {
                                className: 'd-flex align-items-center'
                            }, [
                                UIRenderer.createElement('i', {
                                    className: 'bi bi-star-fill text-primary me-2'
                                }),
                                UIRenderer.createElement('span', {}, `Experience: ${adventureStatus.rewards?.experience || 0}`)
                            ])
                        ]),
                        UIRenderer.createElement('div', {
                            className: 'col-md-4'
                        }, [
                            UIRenderer.createElement('div', {
                                className: 'd-flex align-items-center'
                            }, [
                                UIRenderer.createElement('i', {
                                    className: 'bi bi-box text-success me-2'
                                }),
                                UIRenderer.createElement('span', {}, `Items: ${adventureStatus.rewards?.items?.length || 0}`)
                            ])
                        ])
                    ])
                ]),
                
                // Action buttons
                UIRenderer.createElement('div', {
                    className: 'd-grid gap-2'
                }, [
                    adventureStatus.progress >= 1 ?
                        UIRenderer.createButton({
                            text: 'Collect Rewards',
                            variant: 'success',
                            size: 'lg',
                            onClick: completeAdventure
                        }) :
                        UIRenderer.createButton({
                            text: 'End Adventure Early',
                            variant: 'warning',
                            size: 'lg',
                            onClick: endAdventureEarly
                        })
                ])
            ];
        } else {
            // No active adventure
            content = [
                UIRenderer.createElement('p', {
                    className: 'mb-4'
                }, 'Your character is not currently on an adventure. Select a duration and start a new adventure to earn rewards.'),
                
                // Duration selection
                UIRenderer.createElement('div', {
                    className: 'mb-4'
                }, [
                    UIRenderer.createElement('label', {
                        className: 'form-label'
                    }, 'Adventure Duration'),
                    UIRenderer.createElement('select', {
                        className: 'form-select',
                        id: 'adventure-duration'
                    }, [
                        UIRenderer.createElement('option', { value: '0.5' }, '0.5 Days (30 minutes)'),
                        UIRenderer.createElement('option', { value: '1' }, '1 Day (1 hour)'),
                        UIRenderer.createElement('option', { value: '1.5' }, '1.5 Days (1.5 hours)'),
                        UIRenderer.createElement('option', { value: '2' }, '2 Days (2 hours)'),
                        UIRenderer.createElement('option', { value: '3' }, '3 Days (3 hours)'),
                        UIRenderer.createElement('option', { value: '4' }, '4 Days (4 hours)'),
                        UIRenderer.createElement('option', { value: '5' }, '5 Days (5 hours)')
                    ])
                ]),
                
                UIRenderer.createElement('div', {
                    className: 'alert alert-info mb-4'
                }, [
                    UIRenderer.createElement('i', {
                        className: 'bi bi-info-circle me-2'
                    }),
                    'Longer adventures provide better rewards but involve more combat encounters. Time conversion: 1 hour = 1 in-game day.'
                ]),
                
                // Start button
                UIRenderer.createElement('div', {
                    className: 'd-grid gap-2'
                }, [
                    UIRenderer.createButton({
                        text: 'Start Adventure',
                        variant: 'primary',
                        size: 'lg',
                        onClick: startAdventure
                    })
                ])
            ];
        }
        
        return UIRenderer.createCard({
            title: 'Adventure Status',
            content: content,
            className: 'mb-4'
        });
    }
    
    /**
     * Create the adventure log section
     * @returns {HTMLElement} The log section
     */
    function createAdventureLogSection() {
        const logEntries = adventureStatus.events.map(event => {
            // Determine event class
            let eventClass;
            switch (event.type) {
                case 'combat':
                    eventClass = 'combat';
                    break;
                case 'item':
                    eventClass = 'item';
                    break;
                case 'gold':
                    eventClass = 'gold';
                    break;
                case 'experience':
                    eventClass = 'exp';
                    break;
                default:
                    eventClass = '';
            }
            
            return UIRenderer.createElement('div', {
                className: `${eventClass} mb-2`
            }, [
                UIRenderer.createElement('span', {
                    className: 'text-muted me-2'
                }, `[Day ${event.day.toFixed(1)}]`),
                event.message
            ]);
        });
        
        // If no events, show a placeholder
        if (logEntries.length === 0) {
            logEntries.push(
                UIRenderer.createElement('div', {
                    className: 'text-muted text-center py-3'
                }, 'The adventure has just begun. Events will appear here as they occur.')
            );
        }
        
        return UIRenderer.createCard({
            title: 'Adventure Log',
            content: UIRenderer.createElement('div', {
                className: 'adventure-log',
                id: 'adventure-log'
            }, logEntries)
        });
    }
    
    /**
     * Start a new adventure
     */
    function startAdventure() {
        const durationSelect = document.getElementById('adventure-duration');
        const duration = parseFloat(durationSelect.value);
        
        fetch(`/api/adventure/${character.id}/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                duration: duration
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    adventureStatus = data.adventure;
                    startUpdateTimer();
                    
                    UIRenderer.showToast({
                        title: 'Adventure Started',
                        message: `Your character has set out on a ${duration}-day adventure!`,
                        type: 'success'
                    });
                    
                    render(true);
                } else {
                    UIRenderer.showToast({
                        title: 'Error',
                        message: data.message || 'Failed to start adventure',
                        type: 'danger'
                    });
                }
            })
            .catch(error => {
                console.error('Error starting adventure:', error);
                UIRenderer.showToast({
                    title: 'Error',
                    message: 'An error occurred while starting the adventure',
                    type: 'danger'
                });
            });
    }
    
    /**
     * End the current adventure early
     */
    function endAdventureEarly() {
        // Confirm early end
        UIRenderer.showModal({
            title: 'End Adventure Early',
            content: 'Are you sure you want to end your adventure early? You\'ll still receive rewards for your progress so far.',
            buttons: [
                {
                    text: 'End Adventure',
                    variant: 'warning',
                    onClick: confirmEndAdventure
                }
            ]
        });
    }
    
    /**
     * Confirm ending the adventure early
     */
    function confirmEndAdventure() {
        UIRenderer.hideModal();
        
        fetch(`/api/adventure/${character.id}/end`, {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    clearInterval(updateTimer);
                    showAdventureResults(data.results);
                    
                    // Update character data
                    if (data.character) {
                        character = {
                            ...character,
                            ...data.character
                        };
                        
                        if (callbacks.onCharacterUpdated) {
                            callbacks.onCharacterUpdated(character);
                        }
                    }
                    
                    // Reset adventure status
                    adventureStatus = {
                        active: false,
                        startTime: null,
                        duration: 0,
                        endTime: null,
                        progress: 0,
                        events: []
                    };
                } else {
                    UIRenderer.showToast({
                        title: 'Error',
                        message: data.message || 'Failed to end adventure',
                        type: 'danger'
                    });
                }
            })
            .catch(error => {
                console.error('Error ending adventure:', error);
                UIRenderer.showToast({
                    title: 'Error',
                    message: 'An error occurred while ending the adventure',
                    type: 'danger'
                });
            });
    }
    
    /**
     * Complete the current adventure and collect rewards
     */
    function completeAdventure() {
        fetch(`/api/adventure/${character.id}/complete`, {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    clearInterval(updateTimer);
                    showAdventureResults(data.results);
                    
                    // Update character data
                    if (data.character) {
                        character = {
                            ...character,
                            ...data.character
                        };
                        
                        if (callbacks.onCharacterUpdated) {
                            callbacks.onCharacterUpdated(character);
                        }
                    }
                    
                    // Reset adventure status
                    adventureStatus = {
                        active: false,
                        startTime: null,
                        duration: 0,
                        endTime: null,
                        progress: 0,
                        events: []
                    };
                } else {
                    UIRenderer.showToast({
                        title: 'Error',
                        message: data.message || 'Failed to complete adventure',
                        type: 'danger'
                    });
                }
            })
            .catch(error => {
                console.error('Error completing adventure:', error);
                UIRenderer.showToast({
                    title: 'Error',
                    message: 'An error occurred while completing the adventure',
                    type: 'danger'
                });
            });
    }
    
    /**
     * Show adventure results
     * @param {Object} results - Adventure results data
     */
    function showAdventureResults(results) {
        // Create items list if any items were found
        let itemsList = null;
        if (results.items && results.items.length > 0) {
            const itemEntries = results.items.map(item => 
                UIRenderer.createElement('li', {
                    className: 'mb-2'
                }, [
                    UIRenderer.createElement('span', {
                        className: 'fw-bold'
                    }, item.name),
                    UIRenderer.createElement('span', {
                        className: 'text-muted ms-2'
                    }, `(${item.type} - ${item.slot})`)
                ])
            );
            
            itemsList = UIRenderer.createElement('div', {
                className: 'mt-3'
            }, [
                UIRenderer.createElement('h6', {
                    className: 'mb-2'
                }, 'Items Found:'),
                UIRenderer.createElement('ul', {
                    className: 'mb-0'
                }, itemEntries)
            ]);
        }
        
        // Create modal content
        const content = UIRenderer.createElement('div', {
            className: 'text-center'
        }, [
            UIRenderer.createElement('h4', {
                className: 'mb-4'
            }, results.success ? 'Adventure Completed Successfully!' : 'Adventure Ended Early'),
            
            UIRenderer.createElement('div', {
                className: 'row'
            }, [
                UIRenderer.createElement('div', {
                    className: 'col-md-6'
                }, [
                    UIRenderer.createElement('div', {
                        className: 'd-flex align-items-center justify-content-center mb-3'
                    }, [
                        UIRenderer.createElement('i', {
                            className: 'bi bi-coin text-warning fs-4 me-2'
                        }),
                        UIRenderer.createElement('span', {
                            className: 'fs-5'
                        }, `Gold: ${results.gold}`)
                    ])
                ]),
                UIRenderer.createElement('div', {
                    className: 'col-md-6'
                }, [
                    UIRenderer.createElement('div', {
                        className: 'd-flex align-items-center justify-content-center mb-3'
                    }, [
                        UIRenderer.createElement('i', {
                            className: 'bi bi-star-fill text-primary fs-4 me-2'
                        }),
                        UIRenderer.createElement('span', {
                            className: 'fs-5'
                        }, `Experience: ${results.experience}`)
                    ])
                ])
            ]),
            
            // Level up message if applicable
            results.levelUp ? 
                UIRenderer.createElement('div', {
                    className: 'alert alert-success mt-3'
                }, `Level Up! Your character is now level ${results.newLevel}!`) : null,
            
            // Items list
            itemsList,
            
            // Summary
            UIRenderer.createElement('p', {
                className: 'mt-4 mb-0 fst-italic'
            }, results.summary)
        ]);
        
        // Show results modal
        UIRenderer.showModal({
            title: 'Adventure Results',
            content: content,
            size: 'lg',
            buttons: [
                {
                    text: 'Continue',
                    variant: 'primary',
                    onClick: () => {
                        UIRenderer.hideModal();
                        render(true);
                    }
                }
            ],
            closeButton: false
        });
    }
    
    /**
     * Start the update timer for adventure progress
     */
    function startUpdateTimer() {
        // Clear any existing timer
        clearInterval(updateTimer);
        
        // Update immediately
        updateAdventureProgress();
        
        // Set up interval for updates
        updateTimer = setInterval(updateAdventureProgress, 5000);
    }
    
    /**
     * Update adventure progress from the server
     */
    function updateAdventureProgress() {
        fetch(`/api/adventure/${character.id}/progress`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update adventure status
                    adventureStatus = data.adventure;
                    
                    // Update character if provided
                    if (data.character) {
                        character = {
                            ...character,
                            ...data.character
                        };
                    }
                    
                    // Update UI elements without full re-render
                    updateProgressDisplay();
                    updateLogDisplay();
                    
                    // Check if adventure is complete
                    if (adventureStatus.progress >= 1 && document.getElementById('adventure-time')) {
                        document.getElementById('adventure-time').textContent = 'Complete!';
                        
                        const actionButton = document.querySelector('.card-body .btn-warning');
                        if (actionButton) {
                            actionButton.classList.remove('btn-warning');
                            actionButton.classList.add('btn-success');
                            actionButton.textContent = 'Collect Rewards';
                            actionButton.onclick = completeAdventure;
                        }
                    }
                }
            })
            .catch(error => {
                console.error('Error updating adventure progress:', error);
            });
    }
    
    /**
     * Update progress display elements
     */
    function updateProgressDisplay() {
        // Update progress bar
        const progressBar = document.querySelector('.adventure-progress-bar .progress-bar');
        if (progressBar) {
            const percent = Math.round(adventureStatus.progress * 100);
            progressBar.style.width = `${percent}%`;
            progressBar.setAttribute('aria-valuenow', percent);
            progressBar.textContent = `${percent}%`;
        }
        
        // Update time display
        const timeDisplay = document.getElementById('adventure-time');
        if (timeDisplay) {
            timeDisplay.textContent = calculateTimeDisplay();
        }
        
        // Update health and mana
        const healthBar = document.querySelector('.health-bar .progress-bar');
        if (healthBar) {
            updateResourceBar(healthBar, character.health, character.maxHealth);
        }
        
        const manaBar = document.querySelector('.mana-bar .progress-bar');
        if (manaBar) {
            updateResourceBar(manaBar, character.mana, character.maxMana);
        }
        
        // Update rewards
        const goldDisplay = document.querySelector('.bi-coin').nextElementSibling;
        if (goldDisplay) {
            goldDisplay.textContent = `Gold: ${adventureStatus.rewards?.gold || 0}`;
        }
        
        const expDisplay = document.querySelector('.bi-star-fill').nextElementSibling;
        if (expDisplay) {
            expDisplay.textContent = `Experience: ${adventureStatus.rewards?.experience || 0}`;
        }
        
        const itemsDisplay = document.querySelector('.bi-box').nextElementSibling;
        if (itemsDisplay) {
            itemsDisplay.textContent = `Items: ${adventureStatus.rewards?.items?.length || 0}`;
        }
    }
    
    /**
     * Update adventure log display
     */
    function updateLogDisplay() {
        const logContainer = document.getElementById('adventure-log');
        if (!logContainer) return;
        
        // Get current number of events in the DOM
        const currentEventCount = logContainer.childElementCount;
        
        // If placeholder message is present and we have events, clear it
        if (currentEventCount === 1 && adventureStatus.events.length > 0 && 
            logContainer.firstChild.textContent.includes('The adventure has just begun')) {
            logContainer.innerHTML = '';
        }
        
        // Add new events
        for (let i = currentEventCount; i < adventureStatus.events.length; i++) {
            const event = adventureStatus.events[i];
            
            // Determine event class
            let eventClass;
            switch (event.type) {
                case 'combat':
                    eventClass = 'combat';
                    break;
                case 'item':
                    eventClass = 'item';
                    break;
                case 'gold':
                    eventClass = 'gold';
                    break;
                case 'experience':
                    eventClass = 'exp';
                    break;
                default:
                    eventClass = '';
            }
            
            const eventElement = document.createElement('div');
            eventElement.className = `${eventClass} mb-2`;
            
            const timeElement = document.createElement('span');
            timeElement.className = 'text-muted me-2';
            timeElement.textContent = `[Day ${event.day.toFixed(1)}]`;
            
            eventElement.appendChild(timeElement);
            eventElement.appendChild(document.createTextNode(event.message));
            
            logContainer.appendChild(eventElement);
        }
        
        // Scroll to bottom
        logContainer.scrollTop = logContainer.scrollHeight;
    }
    
    /**
     * Update a resource bar (health or mana)
     * @param {HTMLElement} barElement - The progress bar element
     * @param {number} current - Current value
     * @param {number} max - Maximum value
     */
    function updateResourceBar(barElement, current, max) {
        const percent = Math.max(0, Math.min(100, (current / max) * 100));
        barElement.style.width = `${percent}%`;
        barElement.textContent = `${current}/${max}`;
    }
    
    /**
     * Calculate time display for adventure progress
     * @returns {string} Formatted time string
     */
    function calculateTimeDisplay() {
        if (!adventureStatus.active) return '';
        
        const now = new Date();
        const endTime = new Date(adventureStatus.endTime);
        
        if (now >= endTime) {
            return 'Complete!';
        }
        
        const timeLeft = Math.max(0, endTime - now);
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        return `${hours}h ${minutes}m ${seconds}s remaining`;
    }
    
    // Public API
    return {
        init
    };
})();