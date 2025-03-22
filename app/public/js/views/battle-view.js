/**
 * Battle View
 * Handles matchmaking and battle history for PvP combat
 */
const BattleView = (function() {
    // Private properties
    let container = null;
    let character = null;
    let callbacks = {};
    let battleHistory = [];
    let inQueue = false;
    let queueTimer = null;
    let queueStartTime = null;
    let battleSocket = null;
    
    /**
     * Initialize the view
     * @param {HTMLElement} containerElement - The container element
     * @param {Object} options - Configuration options
     */
    function init(containerElement, options = {}) {
        container = containerElement;
        character = options.character;
        callbacks = options;
        
        // Clean up any existing connections
        if (battleSocket) {
            battleSocket.close();
            battleSocket = null;
        }
        
        fetchBattleHistory();
    }
    
    /**
     * Fetch the character's battle history
     */
    function fetchBattleHistory() {
        fetch(`/api/battle/history/${character.id}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    battleHistory = data.battles || [];
                    
                    // Check if character is in queue
                    fetch(`/api/battle/queue/status/${character.id}`)
                        .then(response => response.json())
                        .then(queueData => {
                            if (queueData.success && queueData.inQueue) {
                                inQueue = true;
                                queueStartTime = new Date(queueData.queueStartTime);
                                initializeQueueTimer();
                            }
                            
                            render();
                        })
                        .catch(error => {
                            console.error('Error checking queue status:', error);
                            render();
                        });
                } else {
                    console.error('Error fetching battle history:', data.message);
                    render();
                }
            })
            .catch(error => {
                console.error('Error fetching battle history:', error);
                render();
            });
    }
    
    /**
     * Render the battle view
     */
    function render() {
        container.innerHTML = '';
        
        // Matchmaking section
        const matchmakingSection = createMatchmakingSection();
        
        // Battle history section
        const historySection = createHistorySection();
        
        // Add sections to container
        container.appendChild(matchmakingSection);
        container.appendChild(historySection);
    }
    
    /**
     * Create the matchmaking section
     * @returns {HTMLElement} The matchmaking section
     */
    function createMatchmakingSection() {
        // Check for minimum ability requirements
        const rotationCheckPromise = fetch(`/api/rotation/${character.id}/check`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    return data.isValid;
                }
                return false;
            })
            .catch(error => {
                console.error('Error checking rotation:', error);
                return false;
            });
        
        // Create card content based on queue status
        let content;
        
        if (inQueue) {
            // In queue content
            content = [
                UIRenderer.createElement('p', {
                    className: 'mb-3'
                }, 'Searching for an opponent...'),
                UIRenderer.createElement('div', {
                    className: 'alert alert-primary mb-3',
                    id: 'queue-timer'
                }, 'Time in queue: 00:00'),
                UIRenderer.createElement('div', {
                    className: 'd-grid'
                }, [
                    UIRenderer.createButton({
                        text: 'Leave Queue',
                        variant: 'danger',
                        onClick: leaveQueue
                    })
                ])
            ];
        } else {
            // Not in queue content
            content = [
                UIRenderer.createElement('p', {
                    className: 'mb-3'
                }, 'Join the matchmaking queue to battle against other players\' characters. Victories will earn you more experience than defeats.'),
                
                // Check for rotation first
                UIRenderer.createElement('div', {
                    id: 'queue-button-container',
                    className: 'd-grid'
                }, [
                    UIRenderer.createButton({
                        text: 'Checking requirements...',
                        variant: 'primary',
                        disabled: true
                    })
                ])
            ];
            
            // Update button after rotation check
            rotationCheckPromise.then(isValid => {
                const buttonContainer = document.getElementById('queue-button-container');
                if (buttonContainer) {
                    buttonContainer.innerHTML = '';
                    
                    if (isValid) {
                        // Valid rotation - can queue
                        buttonContainer.appendChild(
                            UIRenderer.createButton({
                                text: 'Join Matchmaking Queue',
                                variant: 'primary',
                                onClick: joinQueue
                            })
                        );
                    } else {
                        // Invalid rotation - show warning
                        buttonContainer.appendChild(
                            UIRenderer.createElement('div', {
                                className: 'alert alert-warning mb-3'
                            }, 'You need at least 3 abilities in your rotation to join the queue. Visit the Rotation tab to set up your abilities.')
                        );
                    }
                }
            });
        }
        
        return UIRenderer.createCard({
            title: 'Matchmaking',
            content: content,
            className: 'mb-4'
        });
    }
    
    /**
     * Create the battle history section
     * @returns {HTMLElement} The battle history section
     */
    function createHistorySection() {
        let content;
        
        if (battleHistory.length === 0) {
            content = UIRenderer.createElement('div', {
                className: 'alert alert-info mb-0'
            }, 'No battles yet. Join the matchmaking queue to find opponents!');
        } else {
            // Create list items for each battle
            const battleItems = battleHistory.map(battle => {
                const isVictory = battle.winner === character.id;
                const resultClass = isVictory ? 'text-success' : 'text-danger';
                const resultText = isVictory ? 'Victory' : 'Defeat';
                
                return {
                    content: [
                        UIRenderer.createElement('div', {
                            className: 'd-flex justify-content-between align-items-center'
                        }, [
                            UIRenderer.createElement('div', {}, [
                                UIRenderer.createElement('span', {
                                    className: 'fw-bold'
                                }, `vs. ${battle.opponentName}`),
                                UIRenderer.createElement('span', {
                                    className: 'text-muted ms-2'
                                }, new Date(battle.date).toLocaleString())
                            ]),
                            UIRenderer.createElement('span', {
                                className: `fw-bold ${resultClass}`
                            }, resultText)
                        ])
                    ],
                    onClick: () => viewBattleDetails(battle.id)
                };
            });
            
            content = UIRenderer.createListGroup({
                items: battleItems,
                className: 'battle-history-list'
            });
        }
        
        return UIRenderer.createCard({
            title: 'Battle History',
            content: content
        });
    }
    
    /**
     * Join the matchmaking queue
     */
    function joinQueue() {
        fetch(`/api/battle/queue/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                characterId: character.id
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    inQueue = true;
                    queueStartTime = new Date();
                    initializeQueueTimer();
                    connectToMatchmakingSocket();
                    render();
                    
                    UIRenderer.showToast({
                        title: 'Matchmaking',
                        message: 'You have joined the matchmaking queue',
                        type: 'info'
                    });
                } else {
                    UIRenderer.showToast({
                        title: 'Error',
                        message: data.message || 'Failed to join queue',
                        type: 'danger'
                    });
                }
            })
            .catch(error => {
                console.error('Error joining queue:', error);
                UIRenderer.showToast({
                    title: 'Error',
                    message: 'An error occurred while joining the queue',
                    type: 'danger'
                });
            });
    }
    
    /**
     * Leave the matchmaking queue
     */
    function leaveQueue() {
        fetch(`/api/battle/queue/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                characterId: character.id
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    inQueue = false;
                    clearQueueTimer();
                    if (battleSocket) {
                        battleSocket.close();
                        battleSocket = null;
                    }
                    render();
                    
                    UIRenderer.showToast({
                        title: 'Matchmaking',
                        message: 'You have left the matchmaking queue',
                        type: 'info'
                    });
                } else {
                    UIRenderer.showToast({
                        title: 'Error',
                        message: data.message || 'Failed to leave queue',
                        type: 'danger'
                    });
                }
            })
            .catch(error => {
                console.error('Error leaving queue:', error);
                UIRenderer.showToast({
                    title: 'Error',
                    message: 'An error occurred while leaving the queue',
                    type: 'danger'
                });
            });
    }
    
    /**
     * Initialize the queue timer
     */
    function initializeQueueTimer() {
        // Clear existing timer
        clearQueueTimer();
        
        // Update timer immediately
        updateQueueTimer();
        
        // Set up interval
        queueTimer = setInterval(updateQueueTimer, 1000);
    }
    
    /**
     * Update the queue timer display
     */
    function updateQueueTimer() {
        const timerElement = document.getElementById('queue-timer');
        if (!timerElement) return;
        
        const now = new Date();
        const timeInQueue = Math.floor((now - queueStartTime) / 1000);
        const minutes = Math.floor(timeInQueue / 60);
        const seconds = timeInQueue % 60;
        
        const formattedTime = `Time in queue: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        timerElement.textContent = formattedTime;
    }
    
    /**
     * Clear the queue timer
     */
    function clearQueueTimer() {
        if (queueTimer) {
            clearInterval(queueTimer);
            queueTimer = null;
        }
    }
    
    /**
     * Connect to the matchmaking websocket
     */
    function connectToMatchmakingSocket() {
        // Close existing connection if any
        if (battleSocket) {
            battleSocket.close();
        }
        
        // Create new connection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(`${protocol}//${window.location.host}/ws/battle/${character.id}`);
        
        socket.onopen = function() {
            console.log('Connected to battle socket');
        };
        
        socket.onmessage = function(event) {
            const data = JSON.parse(event.data);
            
            if (data.type === 'match_found') {
                // Handle match found
                inQueue = false;
                clearQueueTimer();
                handleBattleStart(data.battleId);
            }
        };
        
        socket.onclose = function() {
            console.log('Disconnected from battle socket');
        };
        
        battleSocket = socket;
    }
    
    /**
     * Handle battle start
     * @param {string} battleId - The ID of the battle
     */
    function handleBattleStart(battleId) {
        // Show battle modal
        UIRenderer.showModal({
            title: 'Battle Found',
            content: UIRenderer.createElement('div', {
                className: 'text-center'
            }, [
                UIRenderer.createElement('p', {
                    className: 'mb-3'
                }, 'An opponent has been found! Preparing for battle...'),
                UIRenderer.createElement('div', {
                    className: 'spinner-border text-primary',
                    role: 'status'
                }, [
                    UIRenderer.createElement('span', {
                        className: 'visually-hidden'
                    }, 'Loading...')
                ])
            ]),
            buttons: [],
            closeButton: false,
            backdrop: 'static'
        });
        
        // Fetch battle data
        fetch(`/api/battle/${battleId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Hide loading modal
                    UIRenderer.hideModal();
                    
                    // Show battle visualization
                    showBattleVisualization(data.battle);
                } else {
                    UIRenderer.hideModal();
                    UIRenderer.showToast({
                        title: 'Error',
                        message: data.message || 'Failed to load battle data',
                        type: 'danger'
                    });
                }
            })
            .catch(error => {
                console.error('Error loading battle:', error);
                UIRenderer.hideModal();
                UIRenderer.showToast({
                    title: 'Error',
                    message: 'An error occurred while loading battle data',
                    type: 'danger'
                });
            });
    }
    
    /**
     * Show battle visualization
     * @param {Object} battle - The battle data
     */
    function showBattleVisualization(battle) {
        // Determine player and opponent characters
        const playerChar = battle.characters.find(c => c.id === character.id);
        const opponentChar = battle.characters.find(c => c.id !== character.id);
        
        // Create the battle modal content
        const content = UIRenderer.createElement('div', {
            className: 'battle-visualization'
        }, [
            // Characters section
            UIRenderer.createElement('div', {
                className: 'row mb-4'
            }, [
                // Player character
                UIRenderer.createElement('div', {
                    className: 'col-5'
                }, [
                    UIRenderer.createElement('h5', {
                        className: 'text-center mb-3'
                    }, playerChar.name),
                    UIRenderer.createResourceBar({
                        current: playerChar.health,
                        max: playerChar.maxHealth,
                        type: 'health'
                    }),
                    UIRenderer.createResourceBar({
                        current: playerChar.mana,
                        max: playerChar.maxMana,
                        type: 'mana'
                    }),
                    UIRenderer.createElement('div', {
                        className: 'battle-effects mt-2',
                        id: 'player-effects'
                    })
                ]),
                
                // VS indicator
                UIRenderer.createElement('div', {
                    className: 'col-2 d-flex align-items-center justify-content-center'
                }, [
                    UIRenderer.createElement('div', {
                        className: 'fs-1 fw-bold text-danger'
                    }, 'VS')
                ]),
                
                // Opponent character
                UIRenderer.createElement('div', {
                    className: 'col-5'
                }, [
                    UIRenderer.createElement('h5', {
                        className: 'text-center mb-3'
                    }, opponentChar.name),
                    UIRenderer.createResourceBar({
                        current: opponentChar.health,
                        max: opponentChar.maxHealth,
                        type: 'health'
                    }),
                    UIRenderer.createResourceBar({
                        current: opponentChar.mana,
                        max: opponentChar.maxMana,
                        type: 'mana'
                    }),
                    UIRenderer.createElement('div', {
                        className: 'battle-effects mt-2',
                        id: 'opponent-effects'
                    })
                ])
            ]),
            
            // Battle log
            UIRenderer.createElement('div', {
                className: 'battle-log-container'
            }, [
                UIRenderer.createElement('h5', {
                    className: 'mb-2'
                }, 'Battle Log'),
                UIRenderer.createElement('div', {
                    className: 'battle-log',
                    id: 'battle-log'
                })
            ])
        ]);
        
        // Show the battle modal
        UIRenderer.showModal({
            title: 'Battle in Progress',
            content: content,
            size: 'lg',
            buttons: [],
            closeButton: false,
            backdrop: 'static',
            onClose: () => {
                // This shouldn't be needed as we'll handle closing ourselves,
                // but just in case the user manages to close it
                fetchBattleHistory();
            }
        });
        
        // Start the battle visualization
        visualizeBattle(battle);
    }
    
    /**
     * Visualize the battle with animation
     * @param {Object} battle - The battle data
     */
    function visualizeBattle(battle) {
        const battleLog = document.getElementById('battle-log');
        const playerEffectsContainer = document.getElementById('player-effects');
        const opponentEffectsContainer = document.getElementById('opponent-effects');
        const playerHealthBar = document.querySelector('.battle-visualization .health-bar:first-of-type .progress-bar');
        const playerManaBar = document.querySelector('.battle-visualization .mana-bar:first-of-type .progress-bar');
        const opponentHealthBar = document.querySelector('.battle-visualization .health-bar:nth-of-type(2) .progress-bar');
        const opponentManaBar = document.querySelector('.battle-visualization .mana-bar:nth-of-type(2) .progress-bar');
        
        // Determine player and opponent characters
        const playerChar = battle.characters.find(c => c.id === character.id);
        const opponentChar = battle.characters.find(c => c.id !== character.id);
        
        // Set initial values
        let playerHealth = playerChar.maxHealth;
        let playerMana = playerChar.maxMana;
        let opponentHealth = opponentChar.maxHealth;
        let opponentMana = opponentChar.maxMana;
        let playerEffects = [];
        let opponentEffects = [];
        
        // Sort log entries by timestamp
        const sortedLog = [...battle.log].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Process each log entry with a delay
        let entryIndex = 0;
        
        function processNextEntry() {
            if (entryIndex >= sortedLog.length) {
                // Battle is over, show results
                showBattleResults(battle);
                return;
            }
            
            const entry = sortedLog[entryIndex];
            entryIndex++;
            
            // Create log entry element
            const logEntry = document.createElement('div');
            logEntry.className = entry.characterId === character.id ? 'player-action' : 'opponent-action';
            if (entry.type === 'system') {
                logEntry.className = 'system-message';
            }
            
            logEntry.textContent = `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.message}`;
            battleLog.appendChild(logEntry);
            battleLog.scrollTop = battleLog.scrollHeight;
            
            // Update health and mana if present in entry
            if (entry.characterId === character.id) {
                if (entry.health !== undefined) {
                    playerHealth = entry.health;
                    updateResourceBar(playerHealthBar, playerHealth, playerChar.maxHealth);
                }
                if (entry.mana !== undefined) {
                    playerMana = entry.mana;
                    updateResourceBar(playerManaBar, playerMana, playerChar.maxMana);
                }
                if (entry.effects !== undefined) {
                    playerEffects = entry.effects;
                    updateEffectsDisplay(playerEffectsContainer, playerEffects);
                }
            } else {
                if (entry.health !== undefined) {
                    opponentHealth = entry.health;
                    updateResourceBar(opponentHealthBar, opponentHealth, opponentChar.maxHealth);
                }
                if (entry.mana !== undefined) {
                    opponentMana = entry.mana;
                    updateResourceBar(opponentManaBar, opponentMana, opponentChar.maxMana);
                }
                if (entry.effects !== undefined) {
                    opponentEffects = entry.effects;
                    updateEffectsDisplay(opponentEffectsContainer, opponentEffects);
                }
            }
            
            // Add visual effect for damage or healing
            if (entry.type === 'damage' || entry.type === 'heal') {
                const targetSection = entry.targetId === character.id ? 
                    document.querySelector('.battle-visualization .col-5:first-of-type') : 
                    document.querySelector('.battle-visualization .col-5:nth-of-type(3)');
                
                targetSection.classList.add('flash');
                setTimeout(() => {
                    targetSection.classList.remove('flash');
                }, 500);
            }
            
            // Schedule next entry
            setTimeout(processNextEntry, 800);
        }
        
        // Start processing entries
        processNextEntry();
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
     * Update effects display
     * @param {HTMLElement} container - The effects container
     * @param {Array} effects - Array of active effects
     */
    function updateEffectsDisplay(container, effects) {
        container.innerHTML = '';
        
        effects.forEach(effect => {
            const effectClass = effect.type === 'buff' ? 'effect-buff' : 
                               effect.type === 'debuff' ? 'effect-debuff' : 'effect-dot';
            
            const effectIcon = document.createElement('div');
            effectIcon.className = `effect-icon ${effectClass}`;
            effectIcon.title = `${effect.name}: ${effect.description}`;
            effectIcon.textContent = effect.name.charAt(0).toUpperCase();
            
            container.appendChild(effectIcon);
        });
    }
    
    /**
     * Show battle results
     * @param {Object} battle - The battle data
     */
    function showBattleResults(battle) {
        const isVictory = battle.winner === character.id;
        const modalFooter = document.querySelector('#app-modal .modal-footer');
        
        // Update modal content
        const resultContent = UIRenderer.createElement('div', {
            className: 'text-center'
        }, [
            UIRenderer.createElement('h3', {
                className: `mb-3 ${isVictory ? 'text-success' : 'text-danger'}`
            }, isVictory ? 'Victory!' : 'Defeat'),
            UIRenderer.createElement('p', {
                className: 'mb-2'
            }, `Experience gained: ${battle.experienceGained}`),
            UIRenderer.createElement('p', {
                className: 'mb-4'
            }, isVictory ? 'Congratulations on your victory!' : 'Better luck next time!')
        ]);
        
        document.querySelector('#app-modal .modal-body').innerHTML = '';
        document.querySelector('#app-modal .modal-body').appendChild(resultContent);
        
        // Update modal title
        document.querySelector('#app-modal .modal-title').textContent = 'Battle Results';
        
        // Add close button
        modalFooter.innerHTML = '';
        modalFooter.appendChild(
            UIRenderer.createButton({
                text: 'Close',
                variant: 'primary',
                onClick: () => {
                    UIRenderer.hideModal();
                    fetchBattleHistory();
                }
            })
        );
    }
    
    /**
     * View battle details
     * @param {string} battleId - The ID of the battle to view
     */
    function viewBattleDetails(battleId) {
        fetch(`/api/battle/${battleId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showBattleDetails(data.battle);
                } else {
                    UIRenderer.showToast({
                        title: 'Error',
                        message: data.message || 'Failed to load battle details',
                        type: 'danger'
                    });
                }
            })
            .catch(error => {
                console.error('Error loading battle details:', error);
                UIRenderer.showToast({
                    title: 'Error',
                    message: 'An error occurred while loading battle details',
                    type: 'danger'
                });
            });
    }
    
    /**
     * Show battle details in a modal
     * @param {Object} battle - The battle data
     */
    function showBattleDetails(battle) {
        // Determine player and opponent characters
        const playerChar = battle.characters.find(c => c.id === character.id);
        const opponentChar = battle.characters.find(c => c.id !== character.id);
        const isVictory = battle.winner === character.id;
        
        // Create battle log content
        const logEntries = battle.log.map(entry => {
            const entryClass = entry.characterId === character.id ? 'player-action' : 
                              entry.characterId ? 'opponent-action' : 'system-message';
            
            return UIRenderer.createElement('div', {
                className: entryClass
            }, `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.message}`);
        });
        
        // Create battle details content
        const content = UIRenderer.createElement('div', {}, [
            // Battle overview
            UIRenderer.createElement('div', {
                className: 'mb-4'
            }, [
                UIRenderer.createElement('h4', {
                    className: `mb-3 ${isVictory ? 'text-success' : 'text-danger'}`
                }, isVictory ? 'Victory!' : 'Defeat'),
                UIRenderer.createElement('p', {
                    className: 'mb-2'
                }, `Opponent: ${opponentChar.name}`),
                UIRenderer.createElement('p', {
                    className: 'mb-2'
                }, `Date: ${new Date(battle.date).toLocaleString()}`),
                UIRenderer.createElement('p', {
                    className: 'mb-2'
                }, `Experience gained: ${battle.experienceGained}`)
            ]),
            
            // Battle log
            UIRenderer.createElement('h5', {
                className: 'mb-2'
            }, 'Battle Log'),
            UIRenderer.createElement('div', {
                className: 'battle-log'
            }, logEntries)
        ]);
        
        // Show battle details modal
        UIRenderer.showModal({
            title: 'Battle Details',
            content: content,
            size: 'lg',
            buttons: []
        });
    }
    
    // Public API
    return {
        init
    };
})();