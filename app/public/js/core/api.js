/**
 * API client for server communication
 */
class API {
  /**
   * Make a generic API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Response data
   */
  async _request(endpoint, options = {}) {
    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Get authentication status
   * @returns {Promise<Object>} Authentication status
   */
  async getAuthStatus() {
    return this._request('/api/auth/status');
  }

  /**
   * Login with username and password
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} Login response
   */
  async login(username, password) {
    return this._request('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  /**
   * Register a new user
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} Registration response
   */
  async register(username, password) {
    return this._request('/api/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  /**
   * Logout the current user
   * @returns {Promise<Object>} Logout response
   */
  async logout() {
    return this._request('/api/logout');
  }

  /**
   * Get all abilities
   * @returns {Promise<Array>} List of abilities
   */
  async getAbilities() {
    const abilities = await this._request('/api/abilities');
    window.GameState.setAbilities(abilities);
    return abilities;
  }

  /**
   * Get all player characters
   * @returns {Promise<Array>} List of characters
   */
  async getCharacters() {
    const characters = await this._request('/api/characters');
    window.GameState.setCharacters(characters);
    return characters;
  }

  /**
   * Get a specific character
   * @param {string} characterId - Character ID
   * @returns {Promise<Object>} Character data
   */
  async getCharacter(characterId) {
    return this._request(`/api/characters/${characterId}`);
  }

  /**
   * Create a new character
   * @param {string} name - Character name
   * @param {Object} attributes - Character attributes
   * @returns {Promise<Object>} New character data
   */
  async createCharacter(name, attributes) {
    const character = await this._request('/api/characters', {
      method: 'POST',
      body: JSON.stringify({ name, attributes })
    });
    
    window.GameState.addCharacter(character);
    return character;
  }

  /**
   * Update character rotation
   * @param {string} characterId - Character ID
   * @param {Array} rotation - Ability rotation
   * @param {string} attackType - Attack type ('physical' or 'magic')
   * @returns {Promise<Object>} Updated character
   */
  async updateRotation(characterId, rotation, attackType) {
    const character = await this._request(`/api/characters/${characterId}/rotation`, {
      method: 'PUT',
      body: JSON.stringify({ rotation, attackType })
    });
    
    window.GameState.updateCharacter(character);
    return character;
  }

  /**
   * Get all battles for the player
   * @returns {Promise<Array>} List of battles
   */
  async getBattles() {
    const battles = await this._request('/api/battles');
    window.GameState.setBattles(battles);
    return battles;
  }

  /**
   * Get a specific battle
   * @param {string} battleId - Battle ID
   * @returns {Promise<Object>} Battle data
   */
  async getBattle(battleId) {
    return this._request(`/api/battles/${battleId}`);
  }

  /**
   * Start a battle between two characters
   * @param {string} characterId - Player character ID
   * @param {string} opponentId - Opponent character ID
   * @returns {Promise<Object>} Battle result
   */
  async startBattle(characterId, opponentId) {
    const battleResult = await this._request('/api/battles', {
      method: 'POST',
      body: JSON.stringify({ characterId, opponentId })
    });
    
    window.GameState.addBattle(battleResult);
    return battleResult;
  }

  /**
   * Join the matchmaking queue
   * @param {string} characterId - Character ID
   * @returns {Promise<Object>} Queue result
   */
  async joinQueue(characterId) {
    return this._request('/api/battles/queue', {
      method: 'POST',
      body: JSON.stringify({ characterId })
    });
  }

  /**
   * Leave the matchmaking queue
   * @param {string} characterId - Character ID
   * @returns {Promise<Object>} Result
   */
  async leaveQueue(characterId) {
    return this._request(`/api/battles/queue/${characterId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Check queue status
   * @param {string} characterId - Character ID
   * @returns {Promise<Object>} Queue status
   */
  async checkQueueStatus(characterId) {
    return this._request(`/api/battles/queue/${characterId}`);
  }
  
  /**
 * Update character attributes
 * @param {string} characterId - Character ID
 * @param {Object} attributes - Updated attributes
 * @returns {Promise<Object>} Updated character
 */
async updateAttributes(characterId, attributes) {
  const character = await this._request(`/api/characters/${characterId}/attributes`, {
    method: 'PUT',
    body: JSON.stringify({ attributes })
  });
  
  window.GameState.updateCharacter(character);
  return character;
}
  
}