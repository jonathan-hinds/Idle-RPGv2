/**
 * Challenge Mode View
 * Handles the roguelike challenge mode where players face progressively difficult opponents
 */
const ChallengeView = (function() {
    // Private properties
    let container = null;
    let character = null;
    let callbacks = {};
    let challengeStatus = {
        round: 0,
        experienceAccumulated: 0,
        active: false
    };
    let currentOpponent = null;
    let battleInProgress = false;
    
    /**
     * Initialize the view
     * @param {HTMLElement} containerElement - The container element
     * @param {Object} options - Configuration options
     */
    function init(containerElement, options = {}) {
        container = containerElement;
        character = options.character;
        callbacks = options;
        
        fetchChallengeData();
    }
    
    /**
     * Fetch challenge mode data
     */
    function fetchChallengeData() {
        // Check rotation validity first
        fetch(`/api/rotation/${character.id}/check`)
            .then(response => response.json())
            .then(rotationData => {
                const rotationValid = rotationData.success && rotationData.isValid;
                
                if (rotationValid) {
                    // Fetch challenge status
                    return fetch(`/api/challenge/${character.id}/status`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                challengeStatus = data.challenge;
                                
                                // If there's an active challenge, fetch opponent details
                                if (challengeStatus.active && challengeStatus.round > 0) {
                                    return fetch(`/api/challenge/${character.id}/opponent`)
                                        .then(response => response.json())
                                        .then(opponentData => {
                                            if (opponentData.success) {
                                                currentOpponent = opponentData.opponent;
                                            }
                                            render(rotationValid);
                                        });
                                } else {
                                    render(rotationValid);
                                }
                            } else {
                                render(rotationValid);
                            }
                        });
                } else {
                    render(rotationValid);
                }
            })
            .catch(error => {
                console.error('Error fetching challenge data:', error);
                render(false);
            });
    }
    
    /**
     * Render the challenge view
     * @param {boolean} rotationValid - Whether the character has a valid rotation
     */
    function render(rotationValid) {
        container.innerHTML = '';
        
        // Introduction section
        const introSection = UIRenderer.createCard({
            content: [
                UIRenderer.createElement('h3', {
                    className: 'mb-3'
                }, 'Challenge Mode'),
                UIRenderer.createElement('p', {
                    className: 'mb-0'
                }, 'Test your character against increasingly difficult opponents. Your health and mana don\'t reset between rounds, so manage your resources carefully. Opponents will adapt to counter your strategy as you progress.')
            ],
            className: 'mb-4'
        });
        
        // Challenge status section
        const statusSection = createStatusSection(rotationValid);
        
        // Opponent section (if in an active challenge)
        const opponentSection = challengeStatus.active && currentOpponent ? 
            createOpponentSection() : null;
        
        // Add sections to container
        container.appendChild(introSection);
        container.appendChild(statusSection);
        if (opponentSection) {
            container.appendChild(opponentSection);
        }
    }
    
    /**
     * Create the challenge status section
     * @param {boolean} rotationValid - Whether the character has a valid rotation
     * @returns {HTMLElement} The status section
     */
    function createStatusSection(rotationValid) {
        let content;
        
        if (!rotationValid) {
            // Invalid rotation warning
            content = UIRenderer.createElement('div', {
                className: 'alert alert-warning mb-0'
            }, 'You need at least 3 abilities in your rotation to participate in Challenge Mode. Visit the Rotation tab to set up your abilities.');
        } else if (battleInProgress) {
            // Battle in progress
            content = UIRenderer.createElement('div', {
                className: 'text-center'
            }, [
                UIRenderer.createElement('p', {
                    className: 'mb-3'
                }, 'Battle in progress...'),
                UIRenderer.createElement('div', {
                    className: 'spinner-border text-primary',
                    role: 'status'
                }, [
                    UIRenderer.createElement('span', {
                        className: 'visually-hidden'
                    }, 'Loading...')
                ])
            ]);
        } else if (challengeStatus.active) {
            // Active challenge
            content = [
                UIRenderer.createElement('div', {
                    className: 'challenge-progress mb-4'
                }, `Round ${challengeStatus.round}`),
                
                UIRenderer.createElement('div', {
                    className: 'alert alert-info mb-4'
                }, [
                    UIRenderer.createElement('div', {
                        className: 'd-flex justify-content-between'
                    }, [
                        UIRenderer.createElement('span', {}, 'Experience Accumulated:'),
                        UIRenderer.createElement('span', {
                            className: 'fw-bold'
                        }, challengeStatus.experienceAccumulated)
                    ])
                ]),
                
                UIRenderer.createElement('div', {
                    className: 'alert alert-warning mb-4'
                }, [
                    UIRenderer.createElement('p', {
                        className: 'mb-0'
                    }, `Current Health: ${character.health}/${character.maxHealth}  |  Mana: ${character.mana}/${character.maxMana}`)
                ]),
                
                UIRenderer.createElement('div', {
                    className: 'row g-3'
                }, [
                    // Challenge button
                    UIRenderer.createElement('div', {
                        className: 'col-md-4'
                    }, [
                        UIRenderer.createElement('div', {
                            className: 'd-grid'
                        }, [
                            UIRenderer.createButton({
                                text: 'Fight Next Opponent',
                                variant: 'danger',
                                onClick: startChallengeBattle
                            })
                        ])
                    ]),
                    
                    // Collect XP button
                    UIRenderer.createElement('div', {
                        className: 'col-md-4'
                    }, [
                        UIRenderer.createElement('div', {
                            className: 'd-grid'
                        }, [
                            UIRenderer.createButton({
                                text: 'Collect Experience',
                                variant: 'success',
                                onClick: collectExperience,
                                disabled: challengeStatus.experienceAccumulated <= 0
                            })
                        ])
                    ]),
                    
                    // Reset button
                    UIRenderer.createElement('div', {
                        className: 'col-md-4'
                    }, [
                        UIRenderer.createElement('div', {
                            className: 'd-grid'
                        }, [
                            UIRenderer.createButton({
                                text: 'Reset Challenge',
                                variant: 'secondary',
                                onClick: resetChallenge
                            })
                        ])
                    ])
                ])
            ];
        } else {
            // No active challenge
            content = [
                UIRenderer.createElement('p', {
                    className: 'mb-4'
                }, 'You don\'t have an active challenge. Start a new challenge to test your character against progressively more difficult opponents.'),
                
                UIRenderer.createElement('div', {
                    className: 'd-grid gap-2'
                }, [
                    UIRenderer.createButton({
                        text: 'Start Challenge',
                        variant: 'primary',
                        size: 'lg',
                        onClick: startChallenge
                    })
                ])
            ];
        }
        
        return UIRenderer.createCard({
            title: 'Challenge Status',
            content: content,
            className: 'mb-4'
        });
    }
    
    /**
     * Create the opponent section
     * @returns {HTMLElement} The opponent section
     */
    function createOpponentSection() {
        // Format the opponent's attributes
        const attributes = [
            { name: 'STR', value: currentOpponent.strength },
            { name: 'AGI', value: currentOpponent.agility },
            { name: 'STA', value: currentOpponent.stamina },
            { name: 'INT', value: currentOpponent.intellect },
            { name: 'WIS', value: currentOpponent.wisdom }
        ];
        
        const attributeSection = UIRenderer.createElement('div', {
            className: 'row mb-3'
        }, attributes.map(attr => 
            UIRenderer.createElement('div', {
                className: 'col'
            }, [
                UIRenderer.createElement('div', {
                    className: 'text-center'
                }, [
                    UIRenderer.createElement('div', {
                        className: 'fw-bold'
                    }, attr.name),
                    UIRenderer.createElement('div', {
                        className: 'attribute-badge mx-auto'
                    }, attr.value)
                ])
            ])
        ));
        
        // Equipment section
        const equipmentItems = [];
        
        if (currentOpponent.equipment) {
            // Process each equipment slot
            ['head', 'chest', 'legs', 'mainHand', 'offHand'].forEach(slot => {
                const item = currentOpponent.equipment[slot];
                if (item) {
                    const slotName = slot.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    
                    const itemSection = UIRenderer.createElement('div', {
                        className: 'mb-3'
                    }, [
                        UIRenderer.createElement('div', {
                            className: 'fw-bold border-bottom pb-1 mb-2'
                        }, `${slotName}:`),
                        UIRenderer.createElement('div', {
                            className: 'ps-3'
                        }, [
                            UIRenderer.createElement('div', {}, item.name),
                            item.type === 'weapon' ? 
                                UIRenderer.createElement('div', {
                                    className: 'small text-muted'
                                }, `Damage: ${item.minDamage}-${item.maxDamage}`) : null,
                            item.bonuses ? 
                                UIRenderer.createElement('div', {
                                    className: 'small text-muted'
                                }, Object.entries(item.bonuses)
                                    .map(([stat, value]) => `${stat.charAt(0).toUpperCase() + stat.slice(1)}: +${value}`)
                                    .join(', ')) : null
                        ])
                    ]);
                    
                    equipmentItems.push(itemSection);
                }
            });
        }
        
        const equipmentSection = UIRenderer.createElement('div', {
            className: 'mt-4'
        }, [
            UIRenderer.createElement('h5', {
                className: 'border-bottom pb-2 mb-3'
            }, 'Equipment'),
            ...equipmentItems
        ]);
        
        return UIRenderer.createCard({
            title: `Current Opponent: ${currentOpponent.name} (Level ${currentOpponent.level})`,
            content: [
                UIRenderer.createElement('p', {
                    className: 'mb-4'
                }, 'This opponent has been specifically generated to counter your previous strategies. Analyze their attributes and equipment to adapt your approach.'),
                attributeSection,
                equipmentSection
            ]
        });
    }
    
    /**
     * Start a new challenge
     */
    function startChallenge() {
        fetch(`/api/challenge/${character.id}/start`, {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    challengeStatus = data.challenge;
                    currentOpponent = data.opponent;
                    
                    UIRenderer.showToast({
                        title: 'Challenge Started',
                        message: 'Your challenge has begun! Face your first opponent.',
                        type: 'success'
                    });
                    
                    render(true);
                } else {
                    UIRenderer.showToast({
                        title: 'Error',
                        message: data.message || 'Failed to start challenge',
                        type: 'danger'
                    });
                }
            })
            .catch(error => {
                console.error('Error starting challenge:', error);
                UIRenderer.showToast({
                    title: 'Error',
                    message: 'An error occurred while starting the challenge',
                    type: 'danger'
                });
            });
    }
    
    /**
     * Start a battle with the current challenge opponent
     */
    function startChallengeBattle() {
        battleInProgress = true;
        render(true);
        
        fetch(`/api/challenge/${character.id}/battle`, {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update character if returned
                    if (data.character) {
                        character = {
                            ...character,
                            ...data.character
                        };
                        
                        // Notify parent of character update
                        if (callbacks.onCharacterUpdated) {
                            callbacks.onCharacterUpdated(character);
                        }
                    }
                    
                    // Update challenge status
                    challengeStatus = data.challenge;
                    
                    // Handle battle result
                    showBattleResult(data.battle);
                    
                    // Update opponent if provided
                    if (data.opponent) {
                        currentOpponent = data.opponent;
                    }
                    
                    battleInProgress = false;
                } else {
                    battleInProgress = false;
                    UIRenderer.showToast({
                        title: 'Error',
                        message: data.message || 'Failed to start battle',
                        type: 'danger'
                    });
                    render(true);
                }
            })
            .catch(error => {
                console.error('Error starting battle:', error);
                battleInProgress = false;
                UIRenderer.showToast({
                    title: 'Error',
                    message: 'An error occurred while starting battle',
                    type: 'danger'
                });
                render(true);
            });
    }
    
    /**
     * Collect accumulated experience
     */
    function collectExperience() {
        fetch(`/api/challenge/${character.id}/collect`, {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update character with new experience
                    character = {
                        ...character,
                        ...data.character
                    };
                    
                    // Notify parent of character update
                    if (callbacks.onCharacterUpdated) {
                        callbacks.onCharacterUpdated(character);
                    }
                    
                    // Update challenge status
                    challengeStatus = data.challenge;
                    
                    UIRenderer.showModal({
                        title: 'Experience Collected',
                        content: UIRenderer.createElement('div', {
                            className: 'text-center'
                        }, [
                            UIRenderer.createElement('p', {
                                className: 'mb-3 fs-5'
                            }, `You've collected ${data.experienceCollected} experience points!`),
                            data.levelUp ? 
                                UIRenderer.createElement('p', {
                                    className: 'alert alert-success'
                                }, `Level Up! Your character is now level ${character.level}!`) : null
                        ]),
                        buttons: []
                    });
                    
                    render(true);
                } else {
                    UIRenderer.showToast({
                        title: 'Error',
                        message: data.message || 'Failed to collect experience',
                        type: 'danger'
                    });
                }
            })
            .catch(error => {
                console.error('Error collecting experience:', error);
                UIRenderer.showToast({
                    title: 'Error',
                    message: 'An error occurred while collecting experience',
                    type: 'danger'
                });
            });
    }
    
    /**
     * Reset the current challenge
     */
    function resetChallenge() {
        // Confirm reset
        UIRenderer.showModal({
            title: 'Reset Challenge',
            content: 'Are you sure you want to reset your challenge? Your progress and accumulated experience will be lost.',
            buttons: [
                {
                    text: 'Reset Challenge',
                    variant: 'danger',
                    onClick: confirmResetChallenge
                }
            ]
        });
    }
    
    /**
     * Confirm challenge reset
     */
    function confirmResetChallenge() {
        UIRenderer.hideModal();
        
        fetch(`/api/challenge/${character.id}/reset`, {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update character if returned
                    if (data.character) {
                        character = {
                            ...character,
                            ...data.character
                        };
                        
                        // Notify parent of character update
                        if (callbacks.onCharacterUpdated) {
                            callbacks.onCharacterUpdated(character);
                        }
                    }
                    
                    // Reset challenge status
                    challengeStatus = {
                        round: 0,
                        experienceAccumulated: 0,
                        active: false
                    };
                    currentOpponent = null;
                    
                    UIRenderer.showToast({
                        title: 'Challenge Reset',
                        message: 'Your challenge has been reset.',
                        type: 'info'
                    });
                    
                    render(true);
                } else {
                    UIRenderer.showToast({
                        title: 'Error',
                        message: data.message || 'Failed to reset challenge',
                        type: 'danger'
                    });
                }
            })
            .catch(error => {
                console.error('Error resetting challenge:', error);
                UIRenderer.showToast({
                    title: 'Error',
                    message: 'An error occurred while resetting the challenge',
                    type: 'danger'
                });
            });
    }
    
    /**
     * Show battle result
     * @param {Object} battle - Battle data
     */
    function showBattleResult(battle) {
        // Determine if player won
        const isVictory = battle.winner === character.id;
        const opponentName = currentOpponent.name;
        
        // Create battle log content
        const logEntries = battle.log.map(entry => {
            const entryClass = entry.characterId === character.id ? 'player-action' : 
                              entry.characterId ? 'opponent-action' : 'system-message';
            
            return UIRenderer.createElement('div', {
                className: entryClass
            }, `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.message}`);
        });
        
        // Show battle result modal
        UIRenderer.showModal({
            title: isVictory ? 'Victory!' : 'Defeat',
            content: UIRenderer.createElement('div', {}, [
                // Result message
                UIRenderer.createElement('div', {
                    className: `alert ${isVictory ? 'alert-success' : 'alert-danger'} mb-4`
                }, [
                    UIRenderer.createElement('p', {
                        className: 'mb-1 fs-5 text-center'
                    }, isVictory ? 
                        `You defeated ${opponentName}!` : 
                        `You were defeated by ${opponentName}!`),
                    UIRenderer.createElement('p', {
                        className: 'mb-0 text-center'
                    }, isVictory ? 
                        `Proceeding to round ${challengeStatus.round}. Experience gained: ${battle.experienceGained}` : 
                        `Challenge ended. Consolation experience: ${battle.experienceGained}`)
                ]),
                
                // Battle log
                UIRenderer.createElement('h5', {
                    className: 'mb-2'
                }, 'Battle Log'),
                UIRenderer.createElement('div', {
                    className: 'battle-log mb-0'
                }, logEntries)
            ]),
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
    
    // Public API
    return {
        init
    };
})();