/**
 * Character model and calculations
 */
class Character {
  /**
   * Calculate character stats based on attributes
   * @param {Object} attributes - Character attributes
   * @returns {Object} Calculated stats
   */
  static calculateStats(attributes) {
    const { strength, agility, stamina, intellect, wisdom } = attributes;
    
    // Attack speed calculation (in seconds)
    const baseAttackTime = 10;
    const minAttackTime = 2;
    const attackSpeed = Math.max(minAttackTime, baseAttackTime - (agility * 0.5));
    
    return {
      // Physical combat stats
      minPhysicalDamage: strength * 2,
      maxPhysicalDamage: (strength * 3) + (agility * 1),
      criticalChance: agility * 2, // percentage
      attackSpeed, // seconds per attack
      
      // Magic combat stats
      minMagicDamage: intellect * 2,
      maxMagicDamage: (intellect * 2) + (wisdom * 1.5),
      spellCritChance: intellect * 2, // percentage
      
      // Defensive stats
      health: 100 + (stamina * 10),
      mana: 50 + (wisdom * 10),
      physicalDamageReduction: (strength * 0.5) + (stamina * 1), // percentage
      magicDamageReduction: (stamina * 0.5) + (wisdom * 1) // percentage
    };
  }

  /**
   * Calculate effective level based on attributes
   * @param {Object} attributes - Character attributes
   * @returns {number} Character level
   */
  static calculateLevel(attributes) {
    const totalPoints = Object.values(attributes).reduce((sum, val) => sum + val, 0);
    return 1 + Math.floor((totalPoints - 15) / 5); // Baseline is 15 points
  }

  /**
   * Validate attribute allocation
   * @param {Object} attributes - Character attributes
   * @returns {boolean} Whether attributes are valid
   */
  static validateAttributes(attributes) {
    const requiredAttributes = ['strength', 'agility', 'stamina', 'intellect', 'wisdom'];
    
    // Check that all required attributes exist
    if (!requiredAttributes.every(attr => attr in attributes)) {
      return false;
    }
    
    // Ensure attribute values are positive
    if (!Object.values(attributes).every(val => val >= 1)) {
      return false;
    }
    
    // Validate total attribute points
    const totalPoints = Object.values(attributes).reduce((sum, val) => sum + val, 0);
    return totalPoints === 15;
  }

  /**
   * Get stat description tooltip
   * @param {string} statName - Stat name
   * @returns {string} Stat description
   */
  static getStatDescription(statName) {
    const descriptions = {
      strength: 'Increases physical damage and physical damage reduction',
      agility: 'Increases attack speed, critical hit chance, and adds to maximum physical damage',
      stamina: 'Increases health and damage reduction',
      intellect: 'Increases spell damage and spell critical hit chance',
      wisdom: 'Increases mana, adds to maximum spell damage, and increases magic damage reduction',
      health: 'Total health points',
      mana: 'Total mana points for casting spells',
      criticalChance: 'Chance to deal double physical damage',
      spellCritChance: 'Chance to deal double spell damage',
      attackSpeed: 'Time between attacks (lower is better)',
      physicalDamageReduction: 'Percentage of physical damage reduced',
      magicDamageReduction: 'Percentage of magic damage reduced'
    };
    
    return descriptions[statName] || 'No description available';
  }
  
  /**
 * Calculate experience needed for the next level
 * @param {number} level - Current character level
 * @returns {number} Experience needed for next level
 */
static calculateExpForNextLevel(level) {
  // Base experience needed for level 2 (from level 1)
  const baseExp = 100;
  
  // Exponential growth formula: baseExp * growthFactor^(level-1)
  // This ensures the exp required increases with each level
  const growthFactor = 1.2; // 20% increase per level
  
  return Math.round(baseExp * Math.pow(growthFactor, level - 1));
}

  /**
   * Create a new character battle state from character data
   * @param {Object} character - Character data
   * @returns {Object} Battle-ready character state
   */
  static createBattleState(character) {
    return {
      ...character,
      currentHealth: character.stats.health,
      currentMana: character.stats.mana,
      cooldowns: {},
      periodicEffects: [],
      buffs: [],
      nextAbilityIndex: 0
    };
  }
}