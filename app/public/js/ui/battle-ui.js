/**
 * Battle visualization
 */
class BattleUI {
  constructor() {
    this._initElements();
    this.battleEngine = new BattleEngine();
  }

  /**
   * Initialize UI elements
   */
  _initElements() {
    this.elements = {
      battleHistory: document.getElementById('battle-history'),
      battleDetails: document.getElementById('battle-details'),
      battleTitle: document.getElementById('battle-title'),
      battleLog: document.getElementById('battle-log'),
      opponentsList: document.getElementById('opponents-list'),
      battleModal: null,
      battleCharacterName: document.getElementById('battle-character-name'),
      battleOpponentName: document.getElementById('battle-opponent-name'),
      battleCharacterHealth: document.getElementById('battle-character-health'),
      battleOpponentHealth: document.getElementById('battle-opponent-health'),
      battleCharacterMana: document.getElementById('battle-character-mana'),
      battleOpponentMana: document.getElementById('battle-opponent-mana'),
      liveBattleLog: document.getElementById('live-battle-log'),
      battleCharacterEffects: document.getElementById('battle-character-effects'),
      battleOpponentEffects: document.getElementById('battle-opponent-effects'),
      battleModalClose: document.getElementById('battle-modal-close')
    };
    
    // Initialize bootstrap modal
    if (document.getElementById('battle-modal')) {
      this.elements.battleModal = new bootstrap.Modal(document.getElementById('battle-modal'));
    }
  }

  /**
   * Render opponents list
   * @param {Array} opponents - List of opponents
   */
  renderOpponentsList(opponents) {
    const container = this.elements.opponentsList;
    
    if (!opponents || opponents.length === 0) {
      container.innerHTML = '<div class="alert alert-info">No opponents available.</div>';
      return;
    }
    
    container.innerHTML = '<div class="list-group">' + 
      opponents.map(opponent => `
        <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
          <div>
            <h5>${opponent.name}</h5>
            <small>
              STR: ${opponent.attributes.strength} | 
              AGI: ${opponent.attributes.agility} | 
              STA: ${opponent.attributes.stamina} | 
              INT: ${opponent.attributes.intellect} | 
              WIS: ${opponent.attributes.wisdom}
            </small>
          </div>
          <button class="btn btn-sm btn-danger start-battle-btn" data-opponent-id="${opponent.id}">
            Battle
          </button>
        </div>
      `).join('') + '</div>';
  }

  /**
   * Render battle history
   * @param {Array} battles - List of battles
   * @param {string} selectedCharacterId - ID of selected character
   */
  renderBattleHistory(battles, selectedCharacterId) {
    const container = this.elements.battleHistory;
    
    if (!battles || battles.length === 0) {
      container.innerHTML = '<div class="alert alert-info">No battles yet.</div>';
      return;
    }
    
    container.innerHTML = '<div class="list-group">' + 
      battles.map(battle => {
        const isWinner = battle.winner === selectedCharacterId;
        const isCharacter = battle.character.id === selectedCharacterId;
        const opponent = isCharacter ? battle.opponent : battle.character;
        
        return `
          <div class="list-group-item battle-entry" data-battle-id="${battle.id}">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h5>Battle vs ${opponent.name}</h5>
                <small>${new Date(battle.timestamp).toLocaleString()}</small>
              </div>
              <span class="badge ${isWinner ? 'bg-success' : 'bg-danger'} rounded-pill">
                ${isWinner ? 'Victory' : 'Defeat'}
              </span>
            </div>
          </div>
        `;
      }).join('') + '</div>';
  }

  /**
   * Show battle details
   * @param {Object} battle - Battle data
   * @param {string} selectedCharacterId - ID of selected character
   */
  showBattleDetails(battle, selectedCharacterId) {
    if (!battle) return;
    
    // Show battle details section
    this.elements.battleDetails.classList.remove('d-none');
    
    const isCharacter = battle.character.id === selectedCharacterId;
    const opponent = isCharacter ? battle.opponent : battle.character;
    
    this.elements.battleTitle.textContent = `Battle vs ${opponent.name}`;
    
    this.elements.battleLog.innerHTML = battle.log.map(entry => `
      <div class="battle-log-entry">
        <small class="text-muted">[${entry.time.toFixed(1)}s]</small> ${entry.message}
      </div>
    `).join('');
  }

/**
 * Show real-time battle visualization
 * Modified to store max health and mana in battleState
 * @param {Object} battle - Battle data
 * @param {Object} character - Selected character
 */
showRealTimeBattle(battle, character) {
  // Create battle state
  const battleState = {
    character: battle.character.id === character.id ? battle.character : battle.opponent,
    opponent: battle.character.id === character.id ? battle.opponent : battle.character,
    log: battle.log,
    currentLogIndex: 0,
    startTime: new Date(),
    isCharacter: battle.character.id === character.id,
    characterHealth: 100,
    opponentHealth: 100,
    characterMana: 100,
    opponentMana: 100,
    // Store actual health and mana values
    characterCurrentHealth: battle.character.id === character.id ? 
      battle.character.stats.health : battle.opponent.stats.health,
    opponentCurrentHealth: battle.character.id === character.id ? 
      battle.opponent.stats.health : battle.character.stats.health,
    characterMaxHealth: battle.character.id === character.id ? 
      battle.character.stats.health : battle.opponent.stats.health,
    opponentMaxHealth: battle.character.id === character.id ? 
      battle.opponent.stats.health : battle.character.stats.health,
    characterCurrentMana: battle.character.id === character.id ? 
      battle.character.stats.mana : battle.opponent.stats.mana,
    opponentCurrentMana: battle.character.id === character.id ? 
      battle.opponent.stats.mana : battle.character.stats.mana,
    characterMaxMana: battle.character.id === character.id ? 
      battle.character.stats.mana : battle.opponent.stats.mana,
    opponentMaxMana: battle.character.id === character.id ? 
      battle.opponent.stats.mana : battle.character.stats.mana,
    characterEffects: [],
    opponentEffects: [],
    isFinished: false
  };
  
  // Setup UI
  this.elements.battleCharacterName.textContent = battleState.character.name;
  this.elements.battleOpponentName.textContent = battleState.opponent.name;
  this.elements.liveBattleLog.innerHTML = '<div class="text-center">Battle starting...</div>';
  
  // Reset health and mana bars with actual values
  this._updateHealthDisplay(
    this.elements.battleCharacterHealth, 
    100, 
    battleState.characterCurrentHealth, 
    battleState.characterMaxHealth
  );
  this._updateHealthDisplay(
    this.elements.battleOpponentHealth, 
    100, 
    battleState.opponentCurrentHealth, 
    battleState.opponentMaxHealth
  );
  this._updateManaDisplay(
    this.elements.battleCharacterMana, 
    100, 
    battleState.characterCurrentMana, 
    battleState.characterMaxMana
  );
  this._updateManaDisplay(
    this.elements.battleOpponentMana, 
    100, 
    battleState.opponentCurrentMana, 
    battleState.opponentMaxMana
  );
  
  // Clear effect displays
  this.elements.battleCharacterEffects.innerHTML = '';
  this.elements.battleOpponentEffects.innerHTML = '';
  
  // Show modal
  this.elements.battleModal.show();
  
  // Start battle simulation
  this._startBattleSimulation(battleState);
  
  // Add event listener to close modal
this.elements.battleModal._element.addEventListener('hidden.bs.modal', async () => {
    // Stop the battle simulation if it's still running
    this._stopBattleSimulation();
    
    // If the battle is finished, show battle details
    if (battleState.isFinished) {
      this.showBattleDetails(battle, character.id);
      
      // Refresh character data to show updated experience
      try {
        const updatedCharacter = await window.API.getCharacter(character.id);
        window.GameState.selectCharacter(updatedCharacter);
        window.CharacterUI.renderCharacterDetails(updatedCharacter);
      } catch (error) {
        console.error('Error refreshing character after battle:', error);
      }
    }
  }, { once: true });
}

  /**
   * Start the battle simulation
   * @param {Object} battleState - Battle state
   */
  _startBattleSimulation(battleState) {
    // Clear any existing interval
    this._stopBattleSimulation();
    
    // Function to process the next log entry
    const processNextLogEntry = () => {
      if (battleState.currentLogIndex >= battleState.log.length) {
        // Battle is over
        battleState.isFinished = true;
        this._stopBattleSimulation();
        
        // Add final message
        const winnerName = battleState.log[battleState.log.length - 1].message.includes('wins') 
          ? battleState.log[battleState.log.length - 1].message.split(' wins')[0]
          : null;
          
        const finalMessageElement = document.createElement('div');
        finalMessageElement.className = 'battle-log-entry text-center mt-3';
        finalMessageElement.innerHTML = winnerName 
          ? `<strong class="text-success">${winnerName} wins the battle!</strong>` 
          : '<strong>Battle has ended.</strong>';
        
        this.elements.liveBattleLog.appendChild(finalMessageElement);
        
        // Update close button
        this.elements.battleModalClose.classList.add('btn-primary');
        this.elements.battleModalClose.classList.remove('btn-secondary');
        this.elements.battleModalClose.textContent = 'View Battle Results';
        
        return;
      }
      
      // Get the next log entry
      const entry = battleState.log[battleState.currentLogIndex];
      
      // Calculate when this entry should be processed based on battle time
      const entryTime = entry.time * 1000; // Convert seconds to milliseconds
      const elapsedTime = new Date() - battleState.startTime;
      
      if (elapsedTime >= entryTime) {
        // Process this entry
        
        // Create log entry element
        const entryElement = document.createElement('div');
        entryElement.className = 'battle-log-entry';
        entryElement.innerHTML = `<small class="text-muted">[${entry.time.toFixed(1)}s]</small> ${entry.message}`;
        
        // Add entry to log
        this.elements.liveBattleLog.appendChild(entryElement);
        
        // Scroll to bottom
        this.elements.liveBattleLog.scrollTop = this.elements.liveBattleLog.scrollHeight;
        
        // Update health/mana based on entry content
        this._updateResourceBars(entry, battleState);
        
        // Move to next entry
        battleState.currentLogIndex++;
      }
    };
    
    // Start checking log entries every 100ms
    this.simulationInterval = setInterval(processNextLogEntry, 100);
  }

  /**
   * Stop the battle simulation
   */
  _stopBattleSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  /**
   * Update resource bars based on battle log entry
   * @param {Object} entry - Log entry
   * @param {Object} battleState - Battle state
   */
  _updateResourceBars(entry, battleState) {
    const message = entry.message;
    const { character, opponent } = battleState;
    
    // Process direct damage
    this._processDirectDamage(message, character, opponent, battleState);
    
    // Process DoT damage
    this._processDotDamage(message, character, opponent, battleState);
    
    // Process healing
    this._processHealing(message, character, opponent, battleState);
    
    // Process mana usage
    this._processManaUsage(message, character, opponent, battleState);
    
    // Process mana changes
    this._processManaChanges(message, character, opponent, battleState);
    
    // Process final state
    this._processFinalState(message, character, opponent, battleState);
    
    // Process effects
    this._processEffects(message, character, opponent, battleState);
  }

/**
 * Process direct damage from battle log
 * Updated to calculate actual health values
 */
_processDirectDamage(message, character, opponent, battleState) {
  // Damage to opponent
  if (message.includes(`${character.name} `) && message.includes(` ${opponent.name} for `)) {
    const damageMatch = message.match(/for (\d+) (physical|magic) damage/);
    if (damageMatch) {
      const damage = parseInt(damageMatch[1]);
      const maxHealth = opponent.stats ? opponent.stats.health : 100;
      const damagePercent = (damage / maxHealth) * 100;
      
      // Update health percentage
      battleState.opponentHealth = Math.max(0, battleState.opponentHealth - damagePercent);
      
      // Update actual health value
      battleState.opponentCurrentHealth = Math.max(0, battleState.opponentCurrentHealth - damage);
      
      this._updateHealthDisplay(
        this.elements.battleOpponentHealth, 
        battleState.opponentHealth, 
        battleState.opponentCurrentHealth, 
        battleState.opponentMaxHealth
      );
    }
  }
  
  // Damage to character
  if (message.includes(`${opponent.name} `) && message.includes(` ${character.name} for `)) {
    const damageMatch = message.match(/for (\d+) (physical|magic) damage/);
    if (damageMatch) {
      const damage = parseInt(damageMatch[1]);
      const maxHealth = character.stats ? character.stats.health : 100;
      const damagePercent = (damage / maxHealth) * 100;
      
      // Update health percentage
      battleState.characterHealth = Math.max(0, battleState.characterHealth - damagePercent);
      
      // Update actual health value
      battleState.characterCurrentHealth = Math.max(0, battleState.characterCurrentHealth - damage);
      
      this._updateHealthDisplay(
        this.elements.battleCharacterHealth, 
        battleState.characterHealth, 
        battleState.characterCurrentHealth, 
        battleState.characterMaxHealth
      );
    }
  }
  
  // Character defeated
  if (message.includes(`${character.name} has been defeated`)) {
    battleState.characterHealth = 0;
    battleState.characterCurrentHealth = 0;
    this._updateHealthDisplay(
      this.elements.battleCharacterHealth, 
      0, 
      0, 
      battleState.characterMaxHealth
    );
  }
  
  // Opponent defeated
  if (message.includes(`${opponent.name} has been defeated`)) {
    battleState.opponentHealth = 0;
    battleState.opponentCurrentHealth = 0;
    this._updateHealthDisplay(
      this.elements.battleOpponentHealth, 
      0, 
      0, 
      battleState.opponentMaxHealth
    );
  }
}

/**
 * Process DoT damage from battle log
 * Updated to calculate actual health values
 */
_processDotDamage(message, character, opponent, battleState) {
  if (message.includes("takes") && message.includes("damage from")) {
    const damageMatch = message.match(/takes (\d+) damage/);
    if (!damageMatch) return;
    
    const damage = parseInt(damageMatch[1]);
    
    if (message.includes(character.name)) {
      // Character taking DOT damage
      const maxHealth = character.stats ? character.stats.health : 100;
      const damagePercent = (damage / maxHealth) * 100;
      
      // Update health percentage
      battleState.characterHealth = Math.max(0, battleState.characterHealth - damagePercent);
      
      // Update actual health value
      battleState.characterCurrentHealth = Math.max(0, battleState.characterCurrentHealth - damage);
      
      this._updateHealthDisplay(
        this.elements.battleCharacterHealth, 
        battleState.characterHealth, 
        battleState.characterCurrentHealth, 
        battleState.characterMaxHealth
      );
    } else if (message.includes(opponent.name)) {
      // Opponent taking DOT damage
      const maxHealth = opponent.stats ? opponent.stats.health : 100;
      const damagePercent = (damage / maxHealth) * 100;
      
      // Update health percentage
      battleState.opponentHealth = Math.max(0, battleState.opponentHealth - damagePercent);
      
      // Update actual health value
      battleState.opponentCurrentHealth = Math.max(0, battleState.opponentCurrentHealth - damage);
      
      this._updateHealthDisplay(
        this.elements.battleOpponentHealth, 
        battleState.opponentHealth, 
        battleState.opponentCurrentHealth, 
        battleState.opponentMaxHealth
      );
    }
  }
}

/**
 * Process healing from battle log
 * Updated to calculate actual health values
 */
_processHealing(message, character, opponent, battleState) {
  if (message.includes("is healed for") && message.includes("health")) {
    const healMatch = message.match(/healed for (\d+) health/);
    if (!healMatch) return;
    
    const healAmount = parseInt(healMatch[1]);
    
    if (message.includes(character.name)) {
      // Character was healed
      const maxHealth = character.stats ? character.stats.health : 100;
      const healPercent = (healAmount / maxHealth) * 100;
      
      // Update health percentage
      battleState.characterHealth = Math.min(100, battleState.characterHealth + healPercent);
      
      // Update actual health value
      battleState.characterCurrentHealth = Math.min(battleState.characterMaxHealth, battleState.characterCurrentHealth + healAmount);
      
      this._updateHealthDisplay(
        this.elements.battleCharacterHealth, 
        battleState.characterHealth, 
        battleState.characterCurrentHealth, 
        battleState.characterMaxHealth
      );
    } else if (message.includes(opponent.name)) {
      // Opponent was healed
      const maxHealth = opponent.stats ? opponent.stats.health : 100;
      const healPercent = (healAmount / maxHealth) * 100;
      
      // Update health percentage
      battleState.opponentHealth = Math.min(100, battleState.opponentHealth + healPercent);
      
      // Update actual health value
      battleState.opponentCurrentHealth = Math.min(battleState.opponentMaxHealth, battleState.opponentCurrentHealth + healAmount);
      
      this._updateHealthDisplay(
        this.elements.battleOpponentHealth, 
        battleState.opponentHealth, 
        battleState.opponentCurrentHealth, 
        battleState.opponentMaxHealth
      );
    }
  }
}

/**
 * Process mana usage from battle log
 * Updated to calculate actual mana values
 */
_processManaUsage(message, character, opponent, battleState) {
  // Extract ability and mana cost
  const abilityMatch = message.match(/(?:casts|uses) ([A-Za-z ]+)/);
  if (!abilityMatch) return;
  
  const abilityName = abilityMatch[1].trim();
  
  // Skip basic attacks
  if (abilityName === "Basic Magic Attack" || abilityName === "Basic Attack") return;
  
  // Find the ability to get mana cost
  const ability = window.GameState.abilities.find(a => a.name === abilityName);
  if (!ability || !ability.manaCost) return;
  
  const manaCost = ability.manaCost;
  
  if (message.indexOf(character.name) === 0) {
    // Character using mana
    const maxMana = character.stats ? character.stats.mana : 100;
    const manaPercent = (manaCost / maxMana) * 100;
    
    // Update mana percentage
    battleState.characterMana = Math.max(0, battleState.characterMana - manaPercent);
    
    // Update actual mana value
    battleState.characterCurrentMana = Math.max(0, battleState.characterCurrentMana - manaCost);
    
    this._updateManaDisplay(
      this.elements.battleCharacterMana, 
      battleState.characterMana, 
      battleState.characterCurrentMana, 
      battleState.characterMaxMana
    );
  } else if (message.indexOf(opponent.name) === 0) {
    // Opponent using mana
    const maxMana = opponent.stats ? opponent.stats.mana : 100;
    const manaPercent = (manaCost / maxMana) * 100;
    
    // Update mana percentage
    battleState.opponentMana = Math.max(0, battleState.opponentMana - manaPercent);
    
    // Update actual mana value
    battleState.opponentCurrentMana = Math.max(0, battleState.opponentCurrentMana - manaCost);
    
    this._updateManaDisplay(
      this.elements.battleOpponentMana, 
      battleState.opponentMana, 
      battleState.opponentCurrentMana, 
      battleState.opponentMaxMana
    );
  }
}

/**
 * Process mana drain/gain from battle log
 * Updated to calculate actual mana values
 */
_processManaChanges(message, character, opponent, battleState) {
  // Mana drain
  if (message.includes("loses") && message.includes("mana from")) {
    const manaMatch = message.match(/loses (\d+) mana/);
    if (!manaMatch) return;
    
    const manaLost = parseInt(manaMatch[1]);
    
    if (message.includes(character.name)) {
      // Character losing mana
      const maxMana = character.stats ? character.stats.mana : 100;
      const manaPercent = (manaLost / maxMana) * 100;
      
      // Update mana percentage
      battleState.characterMana = Math.max(0, battleState.characterMana - manaPercent);
      
      // Update actual mana value
      battleState.characterCurrentMana = Math.max(0, battleState.characterCurrentMana - manaLost);
      
      this._updateManaDisplay(
        this.elements.battleCharacterMana, 
        battleState.characterMana, 
        battleState.characterCurrentMana, 
        battleState.characterMaxMana
      );
    } else if (message.includes(opponent.name)) {
      // Opponent losing mana
      const maxMana = opponent.stats ? opponent.stats.mana : 100;
      const manaPercent = (manaLost / maxMana) * 100;
      
      // Update mana percentage
      battleState.opponentMana = Math.max(0, battleState.opponentMana - manaPercent);
      
      // Update actual mana value
      battleState.opponentCurrentMana = Math.max(0, battleState.opponentCurrentMana - manaLost);
      
      this._updateManaDisplay(
        this.elements.battleOpponentMana, 
        battleState.opponentMana, 
        battleState.opponentCurrentMana, 
        battleState.opponentMaxMana
      );
    }
  }
  
  // Mana gain
  if (message.includes("gains") && message.includes("mana from")) {
    const manaMatch = message.match(/gains (\d+) mana/);
    if (!manaMatch) return;
    
    const manaGained = parseInt(manaMatch[1]);
    
    if (message.includes(character.name)) {
      // Character gaining mana
      const maxMana = character.stats ? character.stats.mana : 100;
      const manaPercent = (manaGained / maxMana) * 100;
      
      // Update mana percentage
      battleState.characterMana = Math.min(100, battleState.characterMana + manaPercent);
      
      // Update actual mana value
      battleState.characterCurrentMana = Math.min(battleState.characterMaxMana, battleState.characterCurrentMana + manaGained);
      
      this._updateManaDisplay(
        this.elements.battleCharacterMana, 
        battleState.characterMana, 
        battleState.characterCurrentMana, 
        battleState.characterMaxMana
      );
    } else if (message.includes(opponent.name)) {
      // Opponent gaining mana
      const maxMana = opponent.stats ? opponent.stats.mana : 100;
      const manaPercent = (manaGained / maxMana) * 100;
      
      // Update mana percentage
      battleState.opponentMana = Math.min(100, battleState.opponentMana + manaPercent);
      
      // Update actual mana value
      battleState.opponentCurrentMana = Math.min(battleState.opponentMaxMana, battleState.opponentCurrentMana + manaGained);
      
      this._updateManaDisplay(
        this.elements.battleOpponentMana, 
        battleState.opponentMana, 
        battleState.opponentCurrentMana, 
        battleState.opponentMaxMana
      );
    }
  }
}

/**
 * Process final state messages
 * Updated to use actual health and mana values
 */
_processFinalState(message, character, opponent, battleState) {
  if (message.includes('Final state')) {
    if (message.includes(`${character.name}:`)) {
      const healthMatch = message.match(/(\d+) health/);
      const manaMatch = message.match(/(\d+) mana/);
      
      if (healthMatch) {
        const health = parseInt(healthMatch[1]);
        const maxHealth = character.stats ? character.stats.health : 100;
        const healthPercent = (health / maxHealth) * 100;
        
        battleState.characterHealth = healthPercent;
        battleState.characterCurrentHealth = health;
        
        this._updateHealthDisplay(
          this.elements.battleCharacterHealth, 
          healthPercent, 
          health, 
          battleState.characterMaxHealth
        );
      }
      
      if (manaMatch) {
        const mana = parseInt(manaMatch[1]);
        const maxMana = character.stats ? character.stats.mana : 100;
        const manaPercent = (mana / maxMana) * 100;
        
        battleState.characterMana = manaPercent;
        battleState.characterCurrentMana = mana;
        
        this._updateManaDisplay(
          this.elements.battleCharacterMana, 
          manaPercent, 
          mana, 
          battleState.characterMaxMana
        );
      }
    }
    
    if (message.includes(`${opponent.name}:`)) {
      const healthMatch = message.match(/(\d+) health/);
      const manaMatch = message.match(/(\d+) mana/);
      
      if (healthMatch) {
        const health = parseInt(healthMatch[1]);
        const maxHealth = opponent.stats ? opponent.stats.health : 100;
        const healthPercent = (health / maxHealth) * 100;
        
        battleState.opponentHealth = healthPercent;
        battleState.opponentCurrentHealth = health;
        
        this._updateHealthDisplay(
          this.elements.battleOpponentHealth, 
          healthPercent, 
          health, 
          battleState.opponentMaxHealth
        );
      }
      
      if (manaMatch) {
        const mana = parseInt(manaMatch[1]);
        const maxMana = opponent.stats ? opponent.stats.mana : 100;
        const manaPercent = (mana / maxMana) * 100;
        
        battleState.opponentMana = manaPercent;
        battleState.opponentCurrentMana = mana;
        
        this._updateManaDisplay(
          this.elements.battleOpponentMana, 
          manaPercent, 
          mana, 
          battleState.opponentMaxMana
        );
      }
    }
  }
}

  /**
   * Process effects from battle log
   */
  _processEffects(message, character, opponent, battleState) {
    // Parse effects from log message
    const detectedEffects = BattleModel.parseEffectsFromLog(message, character, opponent);
    
    detectedEffects.forEach(effect => {
      const effectObj = AbilityModel.createEffectObject(effect.type, effect.name, effect);
      
      if (effect.target === 'character') {
        // Only add if not already present with the same name
        if (!battleState.characterEffects.some(e => e.name === effectObj.name)) {
          battleState.characterEffects.push(effectObj);
          this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
          
          // Handle temporary effects
          if (effectObj.temporary) {
            setTimeout(() => {
              battleState.characterEffects = battleState.characterEffects.filter(e => e.name !== effectObj.name);
              this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
            }, effectObj.duration);
          }
        }
      } else if (effect.target === 'opponent') {
        // Only add if not already present with the same name
        if (!battleState.opponentEffects.some(e => e.name === effectObj.name)) {
          battleState.opponentEffects.push(effectObj);
          this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
          
          // Handle temporary effects
          if (effectObj.temporary) {
            setTimeout(() => {
              battleState.opponentEffects = battleState.opponentEffects.filter(e => e.name !== effectObj.name);
              this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
            }, effectObj.duration);
          }
        }
      }
    });
    
    // Check for effect expiration
    const expiredEffect = BattleModel.parseEffectExpiration(message, character, opponent);
    if (expiredEffect) {
      if (expiredEffect.target === 'character') {
        battleState.characterEffects = battleState.characterEffects.filter(e => e.name !== expiredEffect.name);
        this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
      } else if (expiredEffect.target === 'opponent') {
        battleState.opponentEffects = battleState.opponentEffects.filter(e => e.name !== expiredEffect.name);
        this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
      }
    }
  }

/**
 * Update health display to show current/max values instead of percentage
 * @param {HTMLElement} element - Health bar element
 * @param {number} healthPercent - Health percentage (0-100) for the bar width
 * @param {number} currentHealth - Current health value
 * @param {number} maxHealth - Maximum health value
 */
_updateHealthDisplay(element, healthPercent, currentHealth, maxHealth) {
  element.style.width = `${healthPercent}%`;
  element.textContent = `${Math.floor(currentHealth)} / ${maxHealth}`;
}

/**
 * Update mana display to show current/max values instead of percentage
 * @param {HTMLElement} element - Mana bar element
 * @param {number} manaPercent - Mana percentage (0-100) for the bar width
 * @param {number} currentMana - Current mana value
 * @param {number} maxMana - Maximum mana value
 */
_updateManaDisplay(element, manaPercent, currentMana, maxMana) {
  element.style.width = `${manaPercent}%`;
  element.textContent = `${Math.floor(currentMana)} / ${maxMana}`;
}

  /**
   * Update effect display
   * @param {HTMLElement} container - Effect container element
   * @param {Array} effects - Array of effects
   */
  _updateEffectDisplay(container, effects) {
    if (!container) return;
    container.innerHTML = '';
    
    if (!effects || effects.length === 0) return;
    
    effects.forEach(effect => {
      const effectIcon = document.createElement('div');
      
      // Use the effect's iconClass
      let iconClass = 'effect-icon';
      if (effect.iconClass) {
        iconClass += ` ${effect.iconClass}`;
      }
      
      effectIcon.className = iconClass;
      
      // Display first letter of effect name
      effectIcon.textContent = effect.name.charAt(0).toUpperCase();
      
      // Add tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'effect-tooltip';
      tooltip.textContent = effect.name;
      effectIcon.appendChild(tooltip);
      
      container.appendChild(effectIcon);
    });
  }
}