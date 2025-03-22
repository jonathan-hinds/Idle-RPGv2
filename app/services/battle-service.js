const { createBattleState, initializeBattleLog, formatBattleResult } = require('../models/battle-model');
const { createBattleState: createCharacterBattleState } = require('../models/character-model');
const { getAbility } = require('./ability-service');
const { 
  randomInt, 
  calculateCritical, 
  applyDamageReduction,
  hasEnoughMana,
  createLogEntry,
  getEffectiveAttackSpeed
} = require('../utils/battle-utils');
const { readDataFile, writeDataFile } = require('../utils/data-utils');

/**
 * Simulate a battle between two characters
 * @param {Object} character1 - First character
 * @param {Object} character2 - Second character
 * @param {boolean} isMatchmade - Whether battle is from matchmaking
 * @returns {Object} Battle result
 */
function simulateBattle(character1, character2, isMatchmade = false) {
  // Deep clone to avoid modifying originals
  const char1 = JSON.parse(JSON.stringify(character1));
  const char2 = JSON.parse(JSON.stringify(character2));
  
  // Create battle state
  const battleState = createBattleState(
    createCharacterBattleState(char1),
    createCharacterBattleState(char2)
  );
  
  // Initialize battle log
  initializeBattleLog(battleState);
  
  // Schedule attacks based on attack speed
  let char1NextAttack = 0;
  let char2NextAttack = 0;
  let battleTime = 0;
  const maxBattleTime = 300; // 5 minutes time limit
  
  // Battle loop
  while (
    battleState.character1.currentHealth > 0 && 
    battleState.character2.currentHealth > 0 && 
    battleTime < maxBattleTime
  ) {
    // Advance time to next attack
    if (char1NextAttack <= char2NextAttack) {
      battleTime = char1NextAttack;
      processAttack(battleState, battleState.character1, battleState.character2, battleTime);
      char1NextAttack += getEffectiveAttackSpeed(battleState.character1);
    } else {
      battleTime = char2NextAttack;
      processAttack(battleState, battleState.character2, battleState.character1, battleTime);
      char2NextAttack += getEffectiveAttackSpeed(battleState.character2);
    }
    
    // Process DoT effects, buffs, and other periodic effects
    processEffects(battleState, battleTime);
    
    battleState.rounds++;
  }
  
  // Determine winner
  determineWinner(battleState, battleTime);
  
  // Format and return result, passing the isMatchmade flag
  return formatBattleResult(battleState, isMatchmade);
}

/**
 * Determine the winner of a battle
 * @param {Object} battleState - Battle state
 * @param {number} battleTime - Current battle time
 */
function determineWinner(battleState, battleTime) {
  if (battleState.character1.currentHealth <= 0) {
    battleState.winner = battleState.character2.id;
    battleState.log.push(createLogEntry(battleTime, 
      `${battleState.character2.name} wins the battle!`));
    
    // Add health/mana final state
    logFinalState(battleState, battleTime);
  } 
  else if (battleState.character2.currentHealth <= 0) {
    battleState.winner = battleState.character1.id;
    battleState.log.push(createLogEntry(battleTime, 
      `${battleState.character1.name} wins the battle!`));
    
    // Add health/mana final state
    logFinalState(battleState, battleTime);
  } 
  else {
    // Time limit reached - determine winner based on remaining health percentage
    const char1HealthPercent = battleState.character1.currentHealth / battleState.character1.stats.health * 100;
    const char2HealthPercent = battleState.character2.currentHealth / battleState.character2.stats.health * 100;
    
    if (char1HealthPercent > char2HealthPercent) {
      // Character 1 has more health remaining
      battleState.winner = battleState.character1.id;
      battleState.log.push(createLogEntry(battleTime, 
        `Time limit reached! ${battleState.character1.name} wins with more health remaining!`));
    } else if (char2HealthPercent > char1HealthPercent) {
      // Character 2 has more health remaining
      battleState.winner = battleState.character2.id;
      battleState.log.push(createLogEntry(battleTime, 
        `Time limit reached! ${battleState.character2.name} wins with more health remaining!`));
    } else {
      // Draw - both have exactly the same health percentage
      battleState.winner = null;
      battleState.log.push(createLogEntry(battleTime, 
        'Time limit reached! Battle ended in a draw (equal health remaining)'));
    }
    
    // Add health/mana final state
    logFinalState(battleState, battleTime);
  }
}

/**
 * Log the final state of the battle
 * @param {Object} battleState - Battle state
 * @param {number} battleTime - Current battle time
 */
function logFinalState(battleState, battleTime) {
  const { character1, character2 } = battleState;
  
  // Character 1 final state
  const char1HealthPercent = character1.currentHealth > 0 
    ? (character1.currentHealth / character1.stats.health * 100).toFixed(1) 
    : 0;
    
  battleState.log.push(createLogEntry(battleTime + 0.1, 
    `Final state - ${character1.name}: ${Math.floor(character1.currentHealth)} health` + 
    (character1.currentHealth > 0 ? ` (${char1HealthPercent}%)` : '') + 
    `, ${Math.floor(character1.currentMana)} mana`));
  
  // Character 2 final state
  const char2HealthPercent = character2.currentHealth > 0 
    ? (character2.currentHealth / character2.stats.health * 100).toFixed(1) 
    : 0;
    
  battleState.log.push(createLogEntry(battleTime + 0.2, 
    `Final state - ${character2.name}: ${Math.floor(character2.currentHealth)} health` + 
    (character2.currentHealth > 0 ? ` (${char2HealthPercent}%)` : '') + 
    `, ${Math.floor(character2.currentMana)} mana`));
}

/**
 * Process a character's attack
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 */
function processAttack(battleState, attacker, defender, time) {
  // Get next ability from rotation
  if (attacker.rotation && attacker.rotation.length > 0) {
    const nextAbilityId = attacker.rotation[attacker.nextAbilityIndex];
    const cooldownEnd = attacker.cooldowns[nextAbilityId] || 0;
    
    if (time >= cooldownEnd) {
      // Get ability data
      const ability = getAbility(nextAbilityId);
      
      if (ability && hasEnoughMana(attacker, ability)) {
        // Use ability mana if applicable
        if (ability.manaCost) {
          attacker.currentMana -= ability.manaCost;
        }
        
        // Set ability on cooldown
        attacker.cooldowns[ability.id] = time + ability.cooldown;
        
        // Process the ability
        processAbility(battleState, attacker, defender, time, ability);
        
        // Move to next ability in rotation
        attacker.nextAbilityIndex = (attacker.nextAbilityIndex + 1) % attacker.rotation.length;
        return;
      }
    }
  }
  
  // If no ability available or not enough mana or on cooldown, perform basic attack
  performBasicAttack(battleState, attacker, defender, time);
}

/**
 * Process an ability
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {Object} ability - Ability being used
 */
function processAbility(battleState, attacker, defender, time, ability) {
  // Common logging for ability use
  const abilityMessage = `${attacker.name} ${ability.type === 'magic' ? 'casts' : 'uses'} ${ability.name}`;
  
  // Handle different ability types based on their effect properties
  if (ability.buffEffect) {
    processBuffAbility(battleState, attacker, defender, time, ability, abilityMessage);
  } 
  else if (ability.healEffect) {
    processHealAbility(battleState, attacker, time, ability, abilityMessage);
  }
  else if (ability.dotEffect) {
    processDotAbility(battleState, attacker, defender, time, ability, abilityMessage);
  }
  else if (ability.periodicEffect) {
    processPeriodicAbility(battleState, attacker, defender, time, ability, abilityMessage);
  }
  else if (ability.guaranteedCrit) {
    // Handle abilities with guaranteed critical hits
    performPhysicalAttack(battleState, attacker, defender, time, ability.name, ability.damageMultiplier || 1.2, true);
  }
  else if (ability.multiAttack) {
    // Process multi-attack abilities
    processMultiAttackAbility(battleState, attacker, defender, time, ability, abilityMessage);
  }
  else {
    processDamageAbility(battleState, attacker, defender, time, ability, abilityMessage);
  }
}

/**
 * Process a multi-attack ability
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {Object} ability - Ability being used
 * @param {string} abilityMessage - Base message for the ability usage
 */
function processMultiAttackAbility(battleState, attacker, defender, time, ability, abilityMessage) {
  // Log the ability usage
  battleState.log.push(createLogEntry(time, abilityMessage));
  
  // Get the number of attacks and delay
  const attackCount = ability.multiAttack.count || 2;
  const attackDelay = ability.multiAttack.delay || 0.5;
  
  // Perform the first attack immediately
  if (ability.damage === 'physical') {
    performPhysicalAttack(battleState, attacker, defender, time + 0.1, 
      `${ability.name} (Hit 1)`, ability.damageMultiplier || 1);
  } else if (ability.damage === 'magic') {
    performMagicAttack(battleState, attacker, defender, time + 0.1, 
      `${ability.name} (Hit 1)`, ability.damageMultiplier || 1);
  } else {
    // Default to physical attack if not specified
    performPhysicalAttack(battleState, attacker, defender, time + 0.1, 
      `${ability.name} (Hit 1)`, ability.damageMultiplier || 1);
  }
  
  // Perform additional attacks with delay
  for (let i = 1; i < attackCount; i++) {
    // Check if defender is still alive before performing additional attacks
    if (defender.currentHealth <= 0) break;
    
    const hitTime = time + 0.1 + (i * attackDelay);
    
    if (ability.damage === 'physical') {
      performPhysicalAttack(battleState, attacker, defender, hitTime, 
        `${ability.name} (Hit ${i+1})`, ability.damageMultiplier || 1);
    } else if (ability.damage === 'magic') {
      performMagicAttack(battleState, attacker, defender, hitTime, 
        `${ability.name} (Hit ${i+1})`, ability.damageMultiplier || 1);
    } else {
      // Default to physical attack if not specified
      performPhysicalAttack(battleState, attacker, defender, hitTime, 
        `${ability.name} (Hit ${i+1})`, ability.damageMultiplier || 1);
    }
  }
}

/**
 * Process a buff ability
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {Object} ability - Ability being used
 * @param {string} abilityMessage - Base message for the ability usage
 */
function processBuffAbility(battleState, attacker, defender, time, ability, abilityMessage) {
  let buffAmount = ability.buffEffect.amount || 0;
  
  // Handle magic damage scaling if needed
  if (ability.buffEffect.magicDamageScaling) {
    const avgMagicDmg = (attacker.stats.minMagicDamage + attacker.stats.maxMagicDamage) / 2;
    
    // Calculate scaling based on formula in the ability data or use default
    const scalingRate = ability.buffEffect.scalingRate || 0.2;
    const baseAmount = ability.buffEffect.baseAmount || 15;
    const maxAmount = ability.buffEffect.maxAmount || 35;
    
    buffAmount = Math.min(maxAmount, baseAmount + Math.round(avgMagicDmg * scalingRate));
  }
  
  // Determine buff target - most buffs apply to self, but some debuffs apply to the target
  const buffTarget = ability.buffEffect.targetsSelf === false ? defender : attacker;

  // Apply buff with duration from ability data
  applyBuff(battleState, buffTarget, time, {
    name: ability.name,
    type: ability.buffEffect.type,
    amount: buffAmount,
    duration: ability.buffEffect.duration,
    endTime: time + ability.buffEffect.duration
  });

  // Log the effect with specific details
  if (ability.buffEffect.type === 'physicalReduction') {
    battleState.log.push(createLogEntry(time, 
      `${abilityMessage}, increasing physical damage reduction by ${buffAmount}% for ${ability.buffEffect.duration} seconds`));
  } else if (ability.buffEffect.type === 'damageIncrease') {
    battleState.log.push(createLogEntry(time, 
      `${abilityMessage}, increasing damage by ${buffAmount}% for ${ability.buffEffect.duration} seconds`));
  } else if (ability.buffEffect.type === 'attackSpeedReduction') {
    battleState.log.push(createLogEntry(time, 
      `${abilityMessage}, slowing ${defender.name}'s attack speed by ${buffAmount}% for ${ability.buffEffect.duration} seconds`));
  } else {
    battleState.log.push(createLogEntry(time, 
      `${abilityMessage}, applying ${ability.buffEffect.type} effect for ${ability.buffEffect.duration} seconds`));
  }
}

/**
 * Process a healing ability
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Character casting the heal
 * @param {number} time - Current battle time
 * @param {Object} ability - Ability being used
 * @param {string} abilityMessage - Base message for the ability usage
 */
function processHealAbility(battleState, attacker, time, ability, abilityMessage) {
  battleState.log.push(createLogEntry(time, abilityMessage));
  
  applyHeal(battleState, attacker, time, ability.healEffect);
}

/**
 * Process a damage over time ability
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {Object} ability - Ability being used
 * @param {string} abilityMessage - Base message for the ability usage
 */
function processDotAbility(battleState, attacker, defender, time, ability, abilityMessage) {
  // First apply direct damage if the ability has it
  if (ability.damage === 'physical') {
    const damageMultiplier = ability.damageMultiplier || 1.1;
    performPhysicalAttack(battleState, attacker, defender, time, ability.name, damageMultiplier);
  } else if (ability.damage === 'magic') {
    const damageMultiplier = ability.damageMultiplier || 1.1;
    performMagicAttack(battleState, attacker, defender, time, ability.name, damageMultiplier);
  }
  
  // Then apply the DoT effect
  applyPeriodicEffect(battleState, attacker, defender, time, {
    name: ability.dotEffect.type.charAt(0).toUpperCase() + ability.dotEffect.type.slice(1), // Capitalize name
    type: ability.dotEffect.type,
    damage: ability.dotEffect.damage,
    duration: ability.dotEffect.duration,
    interval: ability.dotEffect.interval || 1, // Default to 1 second if not specified
    lastProcTime: time,
    endTime: time + ability.dotEffect.duration
  });
}

/**
 * Process a periodic effect ability (like mana drain)
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {Object} ability - Ability being used
 * @param {string} abilityMessage - Base message for the ability usage
 */
function processPeriodicAbility(battleState, attacker, defender, time, ability, abilityMessage) {
  // Apply the periodic effect
  applyPeriodicEffect(battleState, attacker, defender, time, {
    name: ability.name,
    type: ability.periodicEffect.type,
    amount: ability.periodicEffect.amount,
    duration: ability.periodicEffect.duration,
    interval: ability.periodicEffect.interval,
    lastProcTime: time,
    endTime: time + ability.periodicEffect.duration
  });
  
  // For mana drain, apply the first proc immediately
  if (ability.periodicEffect.type === 'manaDrain') {
    const manaDrained = Math.min(defender.currentMana, ability.periodicEffect.amount);
    defender.currentMana -= manaDrained;
    attacker.currentMana = Math.min(attacker.stats.mana, attacker.currentMana + ability.periodicEffect.amount);
    
    battleState.log.push(createLogEntry(time,
      `${attacker.name} casts ${ability.name} on ${defender.name}, draining ${manaDrained} mana`));
    
    if (manaDrained > 0) {
      battleState.log.push(createLogEntry(time + 0.1,
        `${attacker.name} gains ${ability.periodicEffect.amount} mana from ${ability.name}`));
    }
  } else {
    // Generic message for other periodic effects
    battleState.log.push(createLogEntry(time, abilityMessage));
  }
}

/**
 * Process a direct damage ability
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {Object} ability - Ability being used
 * @param {string} abilityMessage - Base message for the ability usage
 */
function processDamageAbility(battleState, attacker, defender, time, ability, abilityMessage) {
  if (ability.damage === 'physical') {
    performPhysicalAttack(battleState, attacker, defender, time, ability.name, ability.damageMultiplier || 1);
  } else if (ability.damage === 'magic') {
    // Get the damage multiplier (default to 1.5 if not specified)
    const damageMultiplier = ability.damageMultiplier || 1.5;
    
    // Perform the magic attack and get the result
    const attackResult = performMagicAttack(battleState, attacker, defender, time, ability.name, damageMultiplier);
    
    // Handle self-damage if the ability has it
    if (ability.selfDamagePercent && attackResult.damage > 0) {
      const selfDamage = Math.round(attackResult.damage * (ability.selfDamagePercent / 100));
      
      // Apply self-damage if greater than 0
      if (selfDamage > 0) {
        attacker.currentHealth -= selfDamage;
        
        // Log the self-damage
        battleState.log.push(createLogEntry(time + 0.1,
          `${attacker.name} takes ${selfDamage} damage from the backlash of ${ability.name}`));
        
        // Check if the attacker defeated themselves
        if (attacker.currentHealth <= 0) {
          battleState.log.push(createLogEntry(time + 0.2,
            `${attacker.name} has been defeated by their own spell!`));
        }
      }
    }
    
    // Handle critical hit effects (like burning)
    if (ability.criticalEffect && attackResult.isCritical) {
      if (ability.criticalEffect.type === 'burning') {
        // Calculate DoT damage based on caster's magic damage
        const avgMagicDmg = (attacker.stats.minMagicDamage + attacker.stats.maxMagicDamage) / 2;
        const dotDamage = Math.round(avgMagicDmg * (ability.criticalEffect.damagePercent / 100));
        
        // Apply the burning DoT effect
        applyPeriodicEffect(battleState, attacker, defender, time, {
          name: 'Burning',
          type: 'burning',
          damage: dotDamage,
          duration: ability.criticalEffect.duration,
          interval: ability.criticalEffect.interval || 1,
          lastProcTime: time,
          endTime: time + ability.criticalEffect.duration
        });
        
        battleState.log.push(createLogEntry(time + 0.2,
          `${defender.name} is burning for ${dotDamage} damage per second for ${ability.criticalEffect.duration} seconds!`));
      }
    }
  } else {
    // Fall back to basic attack if no damage type is specified
    performBasicAttack(battleState, attacker, defender, time);
  }
}

/**
 * Perform a physical attack
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {string} attackName - Name of the attack
 * @param {number} multiplier - Damage multiplier
 * @param {boolean} guaranteedCrit - Whether critical is guaranteed
 * @returns {Object} Attack result
 */
function performPhysicalAttack(battleState, attacker, defender, time, attackName, multiplier = 1, guaranteedCrit = false) {
  const minDmg = attacker.stats.minPhysicalDamage;
  const maxDmg = attacker.stats.maxPhysicalDamage;
  let baseDamage = randomInt(minDmg, maxDmg);
  baseDamage = Math.round(baseDamage * multiplier);
  
  // Apply ALL damage buffs dynamically
  if (attacker.buffs) {
    attacker.buffs.forEach(buff => {
      if (buff.type === 'damageIncrease') {
        const buffMultiplier = 1 + (buff.amount / 100);
        baseDamage = Math.round(baseDamage * buffMultiplier);
      }
      // Add more buff types that affect physical damage here
    });
  }
  
  // Critical hit check
  const critChance = attacker.stats.criticalChance;
  const isCrit = guaranteedCrit ? true : calculateCritical(critChance);
  
  if (isCrit) {
    baseDamage = Math.round(baseDamage * 2);
  }
  
  // Apply damage reduction (base + buffs)
  let damageReduction = defender.stats.physicalDamageReduction / 100;

  // Add ALL physical reduction buffs dynamically
  if (defender.buffs) {
    defender.buffs.forEach(buff => {
      if (buff.type === 'physicalReduction') {
        damageReduction += buff.amount / 100;
      }
      // Add more buff types that affect physical reduction here
    });
  }

  // Cap reduction at 80% to prevent invincibility
  const finalDamage = applyDamageReduction(baseDamage, damageReduction * 100);
  
  // Apply damage
  defender.currentHealth -= finalDamage;
  
  // Log the attack
  battleState.log.push(createLogEntry(time,
    `${attacker.name} uses ${attackName}${isCrit ? ' (CRITICAL)' : ''} on ${defender.name} for ${finalDamage} physical damage`));
  
  if (defender.currentHealth <= 0) {
    battleState.log.push(createLogEntry(time,
      `${defender.name} has been defeated!`));
  }
  
  return {
    damage: finalDamage,
    isCritical: isCrit,
    baseDamage: baseDamage
  };
}

/**
 * Perform a magic attack
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {string} attackName - Name of the attack
 * @param {number} multiplier - Damage multiplier
 * @returns {Object} Attack result
 */
const abilityService = require('./ability-service');

function performMagicAttack(battleState, attacker, defender, time, attackName, multiplier = 1) {
  const minDmg = attacker.stats.minMagicDamage;
  const maxDmg = attacker.stats.maxMagicDamage;
  let baseDamage = randomInt(minDmg, maxDmg);
  baseDamage = Math.round(baseDamage * multiplier);
  
  // Apply ALL damage buffs dynamically
  if (attacker.buffs) {
    attacker.buffs.forEach(buff => {
      if (buff.type === 'damageIncrease') {
        const buffMultiplier = 1 + (buff.amount / 100);
        baseDamage = Math.round(baseDamage * buffMultiplier);
      }
    });
  }
  
  // Find the ability being used (if available)
  const ability = abilityService.getAbilityByName(attackName);
  
  // Critical hit check
  let critChance = attacker.stats.spellCritChance;
  
  // Add base crit bonus from ability if it exists
  if (ability && ability.baseCritBonus) {
    critChance += ability.baseCritBonus;
  }
  
  const isCrit = calculateCritical(critChance);
  
  if (isCrit) {
    baseDamage = Math.round(baseDamage * 2);
  }
  
  // Rest of your existing function remains the same
  let damageReduction = defender.stats.magicDamageReduction / 100;
  
  if (defender.buffs) {
    defender.buffs.forEach(buff => {
      if (buff.type === 'magicReduction') {
        damageReduction += buff.amount / 100;
      }
    });
  }
  
  const finalDamage = applyDamageReduction(baseDamage, damageReduction * 100);
  
  defender.currentHealth -= finalDamage;
  
  battleState.log.push(createLogEntry(time,
    `${attacker.name} casts ${attackName}${isCrit ? ' (CRITICAL)' : ''} on ${defender.name} for ${finalDamage} magic damage`));
  
  if (defender.currentHealth <= 0) {
    battleState.log.push(createLogEntry(time,
      `${defender.name} has been defeated!`));
  }
  
  return {
    damage: finalDamage,
    isCritical: isCrit,
    baseDamage: baseDamage
  };
}

/**
 * Perform a basic attack
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 */
function performBasicAttack(battleState, attacker, defender, time) {
  if (attacker.attackType === 'magic') {
    // Basic magic attack doesn't cost mana - it's the default attack
    performMagicAttack(battleState, attacker, defender, time, 'Basic Magic Attack', 1);
  } else {
    performPhysicalAttack(battleState, attacker, defender, time, 'Basic Attack', 1);
  }
}

/**
 * Apply a buff to a character
 * @param {Object} battleState - Battle state
 * @param {Object} character - Character receiving buff
 * @param {number} time - Current battle time
 * @param {Object} buff - Buff object to apply
 */
function applyBuff(battleState, character, time, buff) {
  // Check if this buff already exists - if so, refresh duration
  const existingBuff = character.buffs.find(b => b.type === buff.type);
  if (existingBuff) {
    existingBuff.endTime = time + buff.duration;
    battleState.log.push(createLogEntry(time,
      `${character.name}'s ${buff.name} is refreshed (${buff.duration} seconds)`));
  } else {
    character.buffs.push(buff);
    battleState.log.push(createLogEntry(time,
      `${character.name} gains ${buff.name} for ${buff.duration} seconds`));
  }
}

/**
 * Apply a periodic effect to a character
 * @param {Object} battleState - Battle state
 * @param {Object} source - Source of the effect
 * @param {Object} target - Target of the effect
 * @param {number} time - Current battle time
 * @param {Object} effect - Effect object to apply
 */
function applyPeriodicEffect(battleState, source, target, time, effect) {
  // Check if this effect already exists - if so, refresh duration
  const existingEffect = target.periodicEffects.find(e => e.type === effect.type);
  if (existingEffect) {
    existingEffect.endTime = time + effect.duration;
    existingEffect.lastProcTime = time; // Reset the proc timer
    battleState.log.push(createLogEntry(time,
      `${target.name}'s ${effect.name} is refreshed (${effect.duration} seconds)`));
  } else {
    // Add source name to the effect for reference
    effect.sourceName = source.name;
    target.periodicEffects.push(effect);
    battleState.log.push(createLogEntry(time,
      `${target.name} is affected by ${effect.name} for ${effect.duration} seconds`));
  }
}

/**
 * Apply healing to a character
 * @param {Object} battleState - Battle state
 * @param {Object} character - Character to heal
 * @param {number} time - Current battle time
 * @param {Object} healEffect - Healing effect to apply
 * @returns {number} Amount healed
 */
function applyHeal(battleState, character, time, healEffect) {
  // Calculate base healing amount based on magic damage
  const minDamage = character.stats.minMagicDamage;
  const maxDamage = character.stats.maxMagicDamage;
  const avgDamage = (minDamage + maxDamage) / 2;
  
  // Apply healing multiplier
  const healAmount = Math.round(avgDamage * healEffect.multiplier);
  
  // Apply healing, but don't exceed max health
  const previousHealth = character.currentHealth;
  character.currentHealth = Math.min(character.stats.health, character.currentHealth + healAmount);
  const actualHeal = character.currentHealth - previousHealth;
  
  // Log the healing
  battleState.log.push(createLogEntry(time,
    `${character.name} is healed for ${actualHeal} health`));
  
  return actualHeal;
}

/**
 * Process all active effects on both characters
 * @param {Object} battleState - Battle state
 * @param {number} time - Current battle time
 */
function processEffects(battleState, time) {
  // Process character1 effects
  processCharacterEffects(battleState, battleState.character1, battleState.character2, time);
  
  // Process character2 effects
  processCharacterEffects(battleState, battleState.character2, battleState.character1, time);
}

/**
 * Process effects on a single character
 * @param {Object} battleState - Battle state
 * @param {Object} character - Character with effects
 * @param {Object} opponent - Opponent character
 * @param {number} time - Current battle time
 */
function processCharacterEffects(battleState, character, opponent, time) {
  // Process periodic effects (like poison, mana drain, etc.)
  for (let i = character.periodicEffects.length - 1; i >= 0; i--) {
    const effect = character.periodicEffects[i];
    
    // Process periodic effect ticks
    if (time >= effect.lastProcTime + effect.interval && time < effect.endTime) {
      // Process different effect types based on their 'type' property
      switch(effect.type) {
        case 'poison':
          // Apply poison damage
          character.currentHealth -= effect.damage;
          
          battleState.log.push(createLogEntry(time,
            `${character.name} takes ${effect.damage} damage from ${effect.name}`));
          
          if (character.currentHealth <= 0) {
            battleState.log.push(createLogEntry(time,
              `${character.name} has been defeated by ${effect.name}!`));
          }
          break;
          
        case 'burning':
          // Apply burning damage
          character.currentHealth -= effect.damage;
          
          battleState.log.push(createLogEntry(time,
            `${character.name} takes ${effect.damage} damage from ${effect.name}`));
          
          if (character.currentHealth <= 0) {
            battleState.log.push(createLogEntry(time,
              `${character.name} has been burned to ash!`));
          }
          break;
          
        case 'manaDrain':
          // Find the source character (who cast the effect)
          const source = (effect.sourceName === battleState.character1.name) 
            ? battleState.character1 
            : battleState.character2;
          
          // Drain mana from the target
          const manaDrained = Math.min(character.currentMana, effect.amount);
          character.currentMana -= manaDrained;
          
          // Give mana to the source
          source.currentMana = Math.min(source.stats.mana, source.currentMana + effect.amount);
          
          if (manaDrained > 0) {
            battleState.log.push(createLogEntry(time,
              `${character.name} loses ${manaDrained} mana from ${effect.name}`));
            
            battleState.log.push(createLogEntry(time + 0.1,
              `${source.name} gains ${effect.amount} mana from ${effect.name}`));
          }
          break;
          
        case 'regeneration':
          const healAmount = effect.amount;
          character.currentHealth = Math.min(character.stats.health, character.currentHealth + healAmount);
          
          battleState.log.push(createLogEntry(time,
            `${character.name} regenerates ${healAmount} health from ${effect.name}`));
          break;
          
        case 'manaRegen':
          const manaAmount = effect.amount;
          character.currentMana = Math.min(character.stats.mana, character.currentMana + manaAmount);
          
          battleState.log.push(createLogEntry(time,
            `${character.name} regenerates ${manaAmount} mana from ${effect.name}`));
          break;
          
        default:
          // Unknown effect type, log warning
          console.warn(`Unknown periodic effect type: ${effect.type}`);
      }
      
      // Update last proc time
      effect.lastProcTime = time;
    }
    
    // Remove expired periodic effects
    if (time >= effect.endTime) {
      character.periodicEffects.splice(i, 1);
      battleState.log.push(createLogEntry(time,
        `${effect.name} effect on ${character.name} has expired`));
    }
  }
  
  // Process buffs
  for (let i = character.buffs.length - 1; i >= 0; i--) {
    const buff = character.buffs[i];
    
    // Remove expired buffs
    if (time >= buff.endTime) {
      character.buffs.splice(i, 1);
      battleState.log.push(createLogEntry(time,
        `${buff.name} buff on ${character.name} has expired`));
    }
  }
}

/**
 * Save a battle result to the battle logs
 * @param {Object} battleResult - Formatted battle result
 */
function saveBattleResult(battleResult) {
  const battlelogs = readDataFile('battlelogs.json');
  battlelogs.push(battleResult);
  return writeDataFile('battlelogs.json', battlelogs);
}

/**
 * Get battle results for a player
 * @param {string} playerId - Player ID
 * @returns {Array} Battles involving the player
 */
function getPlayerBattles(playerId) {
  const battlelogs = readDataFile('battlelogs.json');
  return battlelogs.filter(battle => 
    battle.character.playerId === playerId || 
    battle.opponent.playerId === playerId
  );
}

/**
 * Get a specific battle by ID
 * @param {string} battleId - Battle ID
 * @returns {Object|null} Battle or null if not found
 */
function getBattle(battleId) {
  const battlelogs = readDataFile('battlelogs.json');
  return battlelogs.find(b => b.id === battleId) || null;
}

module.exports = {
  simulateBattle,
  saveBattleResult,
  getPlayerBattles,
  getBattle
};

