/**
 * Server-side character model and operations
 */

/**
 * Calculate character stats based on attributes
 * @param {Object} attributes - Character attributes
 * @returns {Object} Calculated stats
 */
function calculateStats(attributes) {
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
function calculateLevel(attributes) {
  const totalPoints = Object.values(attributes).reduce((sum, val) => sum + val, 0);
  return 1 + Math.floor((totalPoints - 15) / 5); // Baseline is 15 points
}

/**
 * Validate character attributes
 * @param {Object} attributes - Character attributes
 * @param {number} totalPoints - Expected total attribute points
 * @returns {boolean} Whether attributes are valid
 */
function validateAttributes(attributes, totalPoints = 15) {
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
  const actualTotalPoints = Object.values(attributes).reduce((sum, val) => sum + val, 0);
  return actualTotalPoints === totalPoints;
}

/**
 * Create a new character battle state from character data
 * @param {Object} character - Character data
 * @returns {Object} Battle-ready character state
 */
function createBattleState(character) {
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

/**
 * Calculate experience needed for the next level
 * @param {number} level - Current character level
 * @returns {number} Experience needed for next level
 */
function calculateExpForNextLevel(level) {
  // Base experience needed for level 2 (from level 1)
  const baseExp = 100;
  
  // Exponential growth formula: baseExp * growthFactor^(level-1)
  // This ensures the exp required increases with each level
  const growthFactor = 1.2; // 20% increase per level
  
  return Math.round(baseExp * Math.pow(growthFactor, level - 1));
}

/**
 * Check if character has enough experience to level up
 * @param {Object} character - Character data
 * @returns {boolean} Whether character can level up
 */
function canLevelUp(character) {
  const expForNextLevel = calculateExpForNextLevel(character.level);
  return character.experience >= expForNextLevel;
}

/**
 * Level up a character
 * @param {Object} character - Character to level up
 * @returns {Object} Updated character
 */
function levelUpCharacter(character) {
  if (!canLevelUp(character)) {
    return character;
  }
  
  // Deduct required experience
  const expRequired = calculateExpForNextLevel(character.level);
  character.experience -= expRequired;
  
  // Increase level
  character.level += 1;
  
  // Add attribute points
  character.availableAttributePoints = (character.availableAttributePoints || 0) + 2;
  
  return character;
}

/**
 * Apply levelups until character cannot level up anymore
 * @param {Object} character - Character to process
 * @returns {Object} Updated character with all possible level ups applied
 */
function applyPendingLevelUps(character) {
  let updatedCharacter = { ...character };
  
  while (canLevelUp(updatedCharacter)) {
    updatedCharacter = levelUpCharacter(updatedCharacter);
  }
  
  return updatedCharacter;
}

/**
 * Calculate experience gained from a battle
 * @param {boolean} isWinner - Whether character won the battle
 * @param {number} characterLevel - Character's current level
 * @param {boolean} isMatchmade - Whether battle was from matchmaking
 * @returns {number} Experience gained
 */
function calculateBattleExperience(isWinner, characterLevel, isMatchmade) {
  if (!isMatchmade) {
    // Direct battles don't award experience
    return 0;
  }
  
  // Base experience ranges
  const winBaseMin = 20;
  const winBaseMax = 30;
  const lossBaseMin = 5;
  const lossBaseMax = 10;
  
  // Level multiplier (slight increase per level)
  const levelMultiplier = 1 + (characterLevel - 1) * 0.1; // 10% increase per level
  
  if (isWinner) {
    const baseExp = randomInt(winBaseMin, winBaseMax);
    return Math.round(baseExp * levelMultiplier);
  } else {
    const baseExp = randomInt(lossBaseMin, lossBaseMax);
    return Math.round(baseExp * levelMultiplier);
  }
}

/**
 * Calculate a random number between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer between min and max
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
  calculateStats,
  calculateLevel,
  validateAttributes,
  createBattleState,
  calculateExpForNextLevel,
  canLevelUp,
  levelUpCharacter,
  applyPendingLevelUps,
  calculateBattleExperience
};