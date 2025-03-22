/**
 * Battle state model
 */
class BattleModel {
  /**
   * Create a battle state object
   * @param {Object} character - Player character
   * @param {Object} opponent - Opponent character
   * @returns {Object} Battle state
   */
  static createBattleState(character, opponent) {
    return {
      character: Character.createBattleState(character),
      opponent: Character.createBattleState(opponent),
      isCharacter: true, // Whether player character is on the left side
      characterHealth: 100, // Percentage
      opponentHealth: 100, // Percentage
      characterMana: 100, // Percentage
      opponentMana: 100, // Percentage
      characterEffects: [],
      opponentEffects: [],
      log: [],
      currentLogIndex: 0,
      startTime: new Date(),
      isFinished: false
    };
  }

  /**
   * Parse a battle log message to determine if it contains an effect
   * @param {string} message - Log message
   * @param {Object} character - Character object
   * @param {Object} opponent - Opponent object
   * @returns {Array} Array of detected effects
   */
  static parseEffectsFromLog(message, character, opponent) {
    const detectedEffects = [];
    const effectTypes = AbilityModel.getEffectTypes();
    const registry = AbilityModel.getEffectRegistry();

    // Check for buff effects
    if (message.includes('increasing damage by')) {
      const target = message.indexOf(character.name) === 0 ? 'character' : 'opponent';
      const match = message.match(/increasing damage by (\d+)%/);
      
      if (match) {
        detectedEffects.push({
          type: effectTypes.DAMAGE_INCREASE,
          name: 'Damage Increase',
          target,
          amount: parseInt(match[1])
        });
      }
    }
    
    // Check for physical reduction
    if (message.includes('increasing physical damage reduction')) {
      const target = message.indexOf(character.name) === 0 ? 'character' : 'opponent';
      const match = message.match(/increasing physical damage reduction by (\d+)%/);
      
      if (match) {
        detectedEffects.push({
          type: effectTypes.PHYSICAL_REDUCTION,
          name: 'Physical Reduction',
          target,
          amount: parseInt(match[1])
        });
      }
    }
    
    // Check for attack speed reduction
    if (message.includes('slowing') && message.includes('attack speed')) {
      const targetName = message.includes(`slowing ${character.name}`) ? character.name : opponent.name;
      const target = targetName === character.name ? 'character' : 'opponent';
      const match = message.match(/slowing .+'s attack speed by (\d+)%/);
      
      if (match) {
        detectedEffects.push({
          type: effectTypes.ATTACK_SPEED_REDUCTION,
          name: 'Attack Speed Reduction',
          target,
          amount: parseInt(match[1])
        });
      }
    }
    
    // Check for poison/DoT effects
    if (message.includes('is affected by Poison')) {
      const target = message.indexOf(character.name) === 0 ? 'character' : 'opponent';
      
      detectedEffects.push({
        type: effectTypes.POISON,
        name: 'Poison',
        target
      });
    }
    
    // Check for burning effect
    if (message.includes('is burning for')) {
      const target = message.indexOf(character.name) === 0 ? 'character' : 'opponent';
      const match = message.match(/burning for (\d+) damage per second for (\d+) seconds/);
      
      if (match) {
        detectedEffects.push({
          type: effectTypes.BURNING,
          name: 'Burning',
          target,
          damage: parseInt(match[1]),
          duration: parseInt(match[2])
        });
      }
    }
    
    // Check for mana drain effects
    if (message.includes('draining') && message.includes('mana')) {
      const targetName = message.includes(`on ${character.name}`) ? character.name : opponent.name;
      const target = targetName === character.name ? 'character' : 'opponent';
      const match = message.match(/draining (\d+) mana/);
      
      if (match) {
        detectedEffects.push({
          type: effectTypes.MANA_DRAIN,
          name: 'Mana Drain',
          target,
          amount: parseInt(match[1])
        });
      }
    }
    
    // Check for healing effects
    if (message.includes('is healed for')) {
      const target = message.indexOf(character.name) === 0 ? 'character' : 'opponent';
      const match = message.match(/healed for (\d+) health/);
      
      if (match) {
        detectedEffects.push({
          type: effectTypes.SELF_HEAL,
          name: 'Healing',
          target,
          amount: parseInt(match[1]),
          temporary: true
        });
      }
    }
    
    return detectedEffects;
  }

  /**
   * Detect effect expiration from a log message
   * @param {string} message - Log message
   * @param {Object} character - Character object
   * @param {Object} opponent - Opponent object
   * @returns {Object|null} Expired effect info or null
   */
  static parseEffectExpiration(message, character, opponent) {
    const expiryMatch = message.match(/(.+?) (?:effect|buff) on (.+?) has expired/);
    if (expiryMatch) {
      const effectName = expiryMatch[1].trim();
      const targetName = expiryMatch[2].trim();
      
      return {
        name: effectName,
        target: targetName === character.name ? 'character' : 'opponent'
      };
    }
    return null;
  }
}