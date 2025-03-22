/**
 * Global game state management
 */
class GameState {
  constructor() {
    this.reset();
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this.loggedIn = false;
    this.playerId = null;
    this.characters = [];
    this.selectedCharacter = null;
    this.abilities = [];
    this.opponents = [];
    this.battles = [];
    this.queueStartTime = null;
    this.inQueue = false;
  }

  /**
   * Set the abilities list
   * @param {Array} abilities - List of abilities
   */
  setAbilities(abilities) {
    this.abilities = abilities;
    window.EventBus.publish('abilities:loaded', abilities);
  }

  /**
   * Set the characters list
   * @param {Array} characters - List of characters
   */
  setCharacters(characters) {
    this.characters = characters;
    window.EventBus.publish('characters:loaded', characters);
  }

  /**
   * Set the selected character
   * @param {Object} character - Selected character
   */
  selectCharacter(character) {
    this.selectedCharacter = character;
    window.EventBus.publish('character:selected', character.id);
  }

/**
 * Update a character in the characters list
 * @param {Object} updatedCharacter - Updated character data
 */
updateCharacter(updatedCharacter) {
  const index = this.characters.findIndex(c => c.id === updatedCharacter.id);
  if (index !== -1) {
    this.characters[index] = updatedCharacter;
    
    // Update selected character if it's the same one
    if (this.selectedCharacter && this.selectedCharacter.id === updatedCharacter.id) {
      this.selectedCharacter = updatedCharacter;
    }
    
    window.EventBus.publish('character:updated', updatedCharacter);
    // Also trigger a re-render of the character list
    window.EventBus.publish('characters:updated', this.characters);
  }
}

  /**
   * Add a new character to the characters list
   * @param {Object} character - New character
   */
  addCharacter(character) {
    this.characters.push(character);
    window.EventBus.publish('character:created', character);
  }

  /**
   * Set the opponents list
   * @param {Array} opponents - List of potential opponents
   */
  setOpponents(opponents) {
    this.opponents = opponents;
    window.EventBus.publish('opponents:loaded', opponents);
  }

  /**
   * Set the battles list
   * @param {Array} battles - List of battles
   */
  setBattles(battles) {
    this.battles = battles;
    window.EventBus.publish('battles:loaded', battles);
  }

  /**
   * Add a battle to the battles list
   * @param {Object} battle - Battle data
   */
  addBattle(battle) {
    this.battles.unshift(battle); // Add to the beginning
    window.EventBus.publish('battle:added', battle);
  }

  /**
   * Set queue status
   * @param {boolean} inQueue - Whether character is in queue
   * @param {Date} startTime - Queue start time
   */
  setQueueStatus(inQueue, startTime = null) {
    this.inQueue = inQueue;
    this.queueStartTime = startTime;
    window.EventBus.publish('queue:status-changed', { inQueue, startTime });
  }

  /**
   * Get an ability by ID
   * @param {string} abilityId - The ability ID to find
   * @returns {Object|null} The ability or null if not found
   */
  getAbility(abilityId) {
    return this.abilities.find(ability => ability.id === abilityId) || null;
  }
}