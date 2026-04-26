const ORDERED_SPELL_SLOT_LEVELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

const normalizeSpellSlots = (spellSlots) => {
  if (!spellSlots) {
    return {};
  }

  const normalizedSlots = {};

  Object.entries(spellSlots).forEach(([levelKey, slotValue]) => {
    const normalizedLevelKey = levelKey.startsWith('level')
      ? levelKey.replace('level', '')
      : levelKey;

    if (slotValue && typeof slotValue === 'object' && 'max' in slotValue) {
      normalizedSlots[normalizedLevelKey] = {
        max: Number(slotValue.max) || 0,
        used: Number(slotValue.used) || 0,
      };
    } else {
      normalizedSlots[normalizedLevelKey] = {
        max: Number(slotValue) || 0,
        used: 0,
      };
    }
  });

  return normalizedSlots;
};

const getVisibleSpellSlots = (spellSlots) => {
  const normalizedSlots = normalizeSpellSlots(spellSlots);

  return ORDERED_SPELL_SLOT_LEVELS
    .map((level) => ({
      level,
      max: normalizedSlots[level]?.max ?? 0,
      used: normalizedSlots[level]?.used ?? 0,
    }))
    .filter((slot) => slot.max > 0);
};

export { ORDERED_SPELL_SLOT_LEVELS, getVisibleSpellSlots, normalizeSpellSlots };
