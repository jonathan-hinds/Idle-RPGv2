/**
 * Damage/healing calculations
 */
class CombatCalculator {
  constructor() {
    this.utils = window.Utils;
  }

  /**
   * Calculate a physical attack
   * @param {Object} attacker - Attacking character
   * @param {Object} defender - Defending character
   * @param {string} attackName - Name of the attack
   * @param {number} multiplier - Damage multiplier
   * @param {boolean} guaranteedCrit - Whether critical is guaranteed
   * @returns {Object} Attack result
   */
calculatePhysicalAttack(attacker, defender, attackName, multiplier = 1, guaranteedCrit = false) {
    const minDmg = attacker.stats.minPhysicalDamage;
    const maxDmg = attacker.stats.maxPhysicalDamage;
    let baseDamage = this.utils.randomInt(minDmg, maxDmg);
    baseDamage = Math.round(baseDamage * multiplier);
    
    // Apply damage buffs
    if (attacker.buffs) {
      attacker.buffs.forEach(buff => {
        if (buff.type === 'damageIncrease') {
          const buffMultiplier = 1 + (buff.amount / 100);
          baseDamage = Math.round(baseDamage * buffMultiplier);
        }
      });
    }
    
    // Critical hit check
    const critChance = attacker.stats.criticalChance;
    const isCrit = guaranteedCrit ? true : (Math.random() * 100 <= critChance);
    
    if (isCrit) {
      baseDamage = Math.round(baseDamage * 2);
    }
    
    // Apply damage reduction
    let damageReduction = defender.stats.physicalDamageReduction / 100;

    // Add physical reduction buffs
    if (defender.buffs) {
      defender.buffs.forEach(buff => {
        if (buff.type === 'physicalReduction') {
          damageReduction += buff.amount / 100;
        }
      });
    }

    // Cap reduction at 80% to prevent invincibility
    damageReduction = Math.min(0.8, damageReduction);
    const finalDamage = Math.max(1, Math.round(baseDamage * (1 - damageReduction)));
    
    return {
      damage: finalDamage,
      isCritical: isCrit,
      baseDamage: baseDamage,
      damageType: 'physical',
      attackName
    };
  }

  /**
   * Calculate a magic attack
   * @param {Object} attacker - Attacking character
   * @param {Object} defender - Defending character
   * @param {string} attackName - Name of the attack
   * @param {number} multiplier - Damage multiplier
   * @returns {Object} Attack result
   */
  calculateMagicAttack(attacker, defender, attackName, multiplier = 1) {
    const minDmg = attacker.stats.minMagicDamage;
    const maxDmg = attacker.stats.maxMagicDamage;
    let baseDamage = this.utils.randomInt(minDmg, maxDmg);
    baseDamage = Math.round(baseDamage * multiplier);
    
    // Apply damage buffs
    if (attacker.buffs) {
      attacker.buffs.forEach(buff => {
        if (buff.type === 'damageIncrease') {
          const buffMultiplier = 1 + (buff.amount / 100);
          baseDamage = Math.round(baseDamage * buffMultiplier);
        }
      });
    }
    
    // Critical hit check
    const critChance = attacker.stats.spellCritChance;
    const isCrit = (Math.random() * 100 <= critChance);
    
    if (isCrit) {
      baseDamage = Math.round(baseDamage * 2);
    }
    
    // Apply damage reduction
    let damageReduction = defender.stats.magicDamageReduction / 100;
    
    // Add magic reduction buffs
    if (defender.buffs) {
      defender.buffs.forEach(buff => {
        if (buff.type === 'magicReduction') {
          damageReduction += buff.amount / 100;
        }
      });
    }
    
    // Cap reduction at 80% to prevent invincibility
    damageReduction = Math.min(0.8, damageReduction);
    const finalDamage = Math.max(1, Math.round(baseDamage * (1 - damageReduction)));
    
    return {
      damage: finalDamage,
      isCritical: isCrit,
      baseDamage: baseDamage,
      damageType: 'magic',
      attackName
    };
  }

  /**
   * Calculate healing amount
   * @param {Object} character - Character being healed
   * @param {Object} healEffect - Healing effect
   * @returns {number} Amount healed
   */
  calculateHealing(character, healEffect) {
    const minDamage = character.stats.minMagicDamage;
    const maxDamage = character.stats.maxMagicDamage;
    const avgDamage = (minDamage + maxDamage) / 2;
    
    // Apply healing multiplier
    const healAmount = Math.round(avgDamage * healEffect.multiplier);
    
    return healAmount;
  }
}