// ==== case: base {"eventType":"both","timing":"after","slotFilter":"all"}
// Equipment Hook: Equip/Unequip - After

// Hook for equipment being put on
const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
Game_Actor.prototype.changeEquip = function(slotId, item) {
    const oldItem = this.equips()[slotId];
    const isEquipping = item !== null && (oldItem === null || oldItem.id !== item.id);

    _Game_Actor_changeEquip.call(this, slotId, item);

    // After equip hook
    if (isEquipping && this.equips()[slotId] === item) {
        this.onAfterEquip(slotId, item);
    }
};

// Called after equipment is put on
Game_Actor.prototype.onAfterEquip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' equipped ' + item.name);
};

// Additional unequip handling in the existing hook
// (Note: This is already handled in the changeEquip hook above)
// Add this logic to the existing hook:

/*
const isUnequipping = oldItem !== null && (item === null || oldItem.id !== item.id);
if (isUnequipping) {
    // Call onBeforeUnequip/onAfterUnequip as needed
}
*/

// Called after equipment is removed
Game_Actor.prototype.onAfterUnequip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' unequipped ' + item.name);
};

// ==== case: eventType=equip {"eventType":"equip","timing":"after","slotFilter":"all"}
// Equipment Hook: Equip - After

// Hook for equipment being put on
const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
Game_Actor.prototype.changeEquip = function(slotId, item) {
    const oldItem = this.equips()[slotId];
    const isEquipping = item !== null && (oldItem === null || oldItem.id !== item.id);

    _Game_Actor_changeEquip.call(this, slotId, item);

    // After equip hook
    if (isEquipping && this.equips()[slotId] === item) {
        this.onAfterEquip(slotId, item);
    }
};

// Called after equipment is put on
Game_Actor.prototype.onAfterEquip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' equipped ' + item.name);
};

// ==== case: eventType=unequip {"eventType":"unequip","timing":"after","slotFilter":"all"}
// Equipment Hook: Unequip - After

// Hook for equipment being removed
const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
Game_Actor.prototype.changeEquip = function(slotId, item) {
    const oldItem = this.equips()[slotId];
    const isUnequipping = oldItem !== null && (item === null || oldItem.id !== item.id);

    _Game_Actor_changeEquip.call(this, slotId, item);

    // After unequip hook
    if (isUnequipping) {
        this.onAfterUnequip(slotId, oldItem);
    }
};

// Called after equipment is removed
Game_Actor.prototype.onAfterUnequip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' unequipped ' + item.name);
};

// ==== case: eventType=both {"eventType":"both","timing":"after","slotFilter":"all"}
// Equipment Hook: Equip/Unequip - After

// Hook for equipment being put on
const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
Game_Actor.prototype.changeEquip = function(slotId, item) {
    const oldItem = this.equips()[slotId];
    const isEquipping = item !== null && (oldItem === null || oldItem.id !== item.id);

    _Game_Actor_changeEquip.call(this, slotId, item);

    // After equip hook
    if (isEquipping && this.equips()[slotId] === item) {
        this.onAfterEquip(slotId, item);
    }
};

// Called after equipment is put on
Game_Actor.prototype.onAfterEquip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' equipped ' + item.name);
};

// Additional unequip handling in the existing hook
// (Note: This is already handled in the changeEquip hook above)
// Add this logic to the existing hook:

/*
const isUnequipping = oldItem !== null && (item === null || oldItem.id !== item.id);
if (isUnequipping) {
    // Call onBeforeUnequip/onAfterUnequip as needed
}
*/

// Called after equipment is removed
Game_Actor.prototype.onAfterUnequip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' unequipped ' + item.name);
};

// ==== case: eventType=change {"eventType":"change","timing":"after","slotFilter":"all"}
// Equipment Hook: Equipment Change - After

// Hook into equipment change (swap)
const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
Game_Actor.prototype.changeEquip = function(slotId, item) {
    const oldEquip = this.equips()[slotId];
    _Game_Actor_changeEquip.call(this, slotId, item);

    // After equipment change
    this.onAfterEquipChange(slotId, oldEquip, item);
};

// Called after equipment change
Game_Actor.prototype.onAfterEquipChange = function(slotId, oldItem, newItem) {
    // Your code here
    console.log(this.name() + ' changed equipment in slot ' + slotId);
    console.log('Was:', oldItem ? oldItem.name : 'none');
    console.log('Now:', newItem ? newItem.name : 'none');
};

// ==== case: timing=after {"eventType":"both","timing":"after","slotFilter":"all"}
// Equipment Hook: Equip/Unequip - After

// Hook for equipment being put on
const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
Game_Actor.prototype.changeEquip = function(slotId, item) {
    const oldItem = this.equips()[slotId];
    const isEquipping = item !== null && (oldItem === null || oldItem.id !== item.id);

    _Game_Actor_changeEquip.call(this, slotId, item);

    // After equip hook
    if (isEquipping && this.equips()[slotId] === item) {
        this.onAfterEquip(slotId, item);
    }
};

// Called after equipment is put on
Game_Actor.prototype.onAfterEquip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' equipped ' + item.name);
};

// Additional unequip handling in the existing hook
// (Note: This is already handled in the changeEquip hook above)
// Add this logic to the existing hook:

/*
const isUnequipping = oldItem !== null && (item === null || oldItem.id !== item.id);
if (isUnequipping) {
    // Call onBeforeUnequip/onAfterUnequip as needed
}
*/

// Called after equipment is removed
Game_Actor.prototype.onAfterUnequip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' unequipped ' + item.name);
};

// ==== case: timing=before {"eventType":"both","timing":"before","slotFilter":"all"}
// Equipment Hook: Equip/Unequip - Before

// Hook for equipment being put on
const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
Game_Actor.prototype.changeEquip = function(slotId, item) {
    const oldItem = this.equips()[slotId];
    const isEquipping = item !== null && (oldItem === null || oldItem.id !== item.id);

    // Before equip hook
    if (isEquipping) {
        if (!this.onBeforeEquip(slotId, item)) {
            return; // Prevent the equip
        }
    }

    _Game_Actor_changeEquip.call(this, slotId, item);
};

// Called before equipment is put on - return false to prevent
Game_Actor.prototype.onBeforeEquip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' is about to equip ' + item.name);
    return true; // Return false to prevent equipping
};


// Additional unequip handling in the existing hook
// (Note: This is already handled in the changeEquip hook above)
// Add this logic to the existing hook:

/*
const isUnequipping = oldItem !== null && (item === null || oldItem.id !== item.id);
if (isUnequipping) {
    // Call onBeforeUnequip/onAfterUnequip as needed
}
*/

// Called before equipment is removed - return false to prevent
Game_Actor.prototype.onBeforeUnequip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' is about to unequip ' + item.name);
    return true; // Return false to prevent unequipping
};


// ==== case: timing=both {"eventType":"both","timing":"both","slotFilter":"all"}
// Equipment Hook: Equip/Unequip - Before and After

// Hook for equipment being put on
const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
Game_Actor.prototype.changeEquip = function(slotId, item) {
    const oldItem = this.equips()[slotId];
    const isEquipping = item !== null && (oldItem === null || oldItem.id !== item.id);

    // Before equip hook
    if (isEquipping) {
        if (!this.onBeforeEquip(slotId, item)) {
            return; // Prevent the equip
        }
    }

    _Game_Actor_changeEquip.call(this, slotId, item);

    // After equip hook
    if (isEquipping && this.equips()[slotId] === item) {
        this.onAfterEquip(slotId, item);
    }
};

// Called before equipment is put on - return false to prevent
Game_Actor.prototype.onBeforeEquip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' is about to equip ' + item.name);
    return true; // Return false to prevent equipping
};

// Called after equipment is put on
Game_Actor.prototype.onAfterEquip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' equipped ' + item.name);
};

// Additional unequip handling in the existing hook
// (Note: This is already handled in the changeEquip hook above)
// Add this logic to the existing hook:

/*
const isUnequipping = oldItem !== null && (item === null || oldItem.id !== item.id);
if (isUnequipping) {
    // Call onBeforeUnequip/onAfterUnequip as needed
}
*/

// Called before equipment is removed - return false to prevent
Game_Actor.prototype.onBeforeUnequip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' is about to unequip ' + item.name);
    return true; // Return false to prevent unequipping
};

// Called after equipment is removed
Game_Actor.prototype.onAfterUnequip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' unequipped ' + item.name);
};

// ==== case: slotFilter=all {"eventType":"both","timing":"after","slotFilter":"all"}
// Equipment Hook: Equip/Unequip - After

// Hook for equipment being put on
const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
Game_Actor.prototype.changeEquip = function(slotId, item) {
    const oldItem = this.equips()[slotId];
    const isEquipping = item !== null && (oldItem === null || oldItem.id !== item.id);

    _Game_Actor_changeEquip.call(this, slotId, item);

    // After equip hook
    if (isEquipping && this.equips()[slotId] === item) {
        this.onAfterEquip(slotId, item);
    }
};

// Called after equipment is put on
Game_Actor.prototype.onAfterEquip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' equipped ' + item.name);
};

// Additional unequip handling in the existing hook
// (Note: This is already handled in the changeEquip hook above)
// Add this logic to the existing hook:

/*
const isUnequipping = oldItem !== null && (item === null || oldItem.id !== item.id);
if (isUnequipping) {
    // Call onBeforeUnequip/onAfterUnequip as needed
}
*/

// Called after equipment is removed
Game_Actor.prototype.onAfterUnequip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' unequipped ' + item.name);
};

// ==== case: slotFilter=0 {"eventType":"both","timing":"after","slotFilter":"0"}
// Equipment Hook: Equip/Unequip - After (Weapon slot only)

// Hook for equipment being put on
const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
Game_Actor.prototype.changeEquip = function(slotId, item) {
    if (slotId !== 0) {
        _Game_Actor_changeEquip.call(this, slotId, item);
        return;
    }

    const oldItem = this.equips()[slotId];
    const isEquipping = item !== null && (oldItem === null || oldItem.id !== item.id);

    _Game_Actor_changeEquip.call(this, slotId, item);

    // After equip hook
    if (isEquipping && this.equips()[slotId] === item) {
        this.onAfterEquip(slotId, item);
    }
};

// Called after equipment is put on
Game_Actor.prototype.onAfterEquip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' equipped ' + item.name);
};

// Additional unequip handling in the existing hook
// (Note: This is already handled in the changeEquip hook above)
// Add this logic to the existing hook:

/*
const isUnequipping = oldItem !== null && (item === null || oldItem.id !== item.id);
if (isUnequipping) {
    // Call onBeforeUnequip/onAfterUnequip as needed
}
*/

// Called after equipment is removed
Game_Actor.prototype.onAfterUnequip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' unequipped ' + item.name);
};

// ==== case: slotFilter=1 {"eventType":"both","timing":"after","slotFilter":"1"}
// Equipment Hook: Equip/Unequip - After (Shield slot only)

// Hook for equipment being put on
const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
Game_Actor.prototype.changeEquip = function(slotId, item) {
    if (slotId !== 1) {
        _Game_Actor_changeEquip.call(this, slotId, item);
        return;
    }

    const oldItem = this.equips()[slotId];
    const isEquipping = item !== null && (oldItem === null || oldItem.id !== item.id);

    _Game_Actor_changeEquip.call(this, slotId, item);

    // After equip hook
    if (isEquipping && this.equips()[slotId] === item) {
        this.onAfterEquip(slotId, item);
    }
};

// Called after equipment is put on
Game_Actor.prototype.onAfterEquip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' equipped ' + item.name);
};

// Additional unequip handling in the existing hook
// (Note: This is already handled in the changeEquip hook above)
// Add this logic to the existing hook:

/*
const isUnequipping = oldItem !== null && (item === null || oldItem.id !== item.id);
if (isUnequipping) {
    // Call onBeforeUnequip/onAfterUnequip as needed
}
*/

// Called after equipment is removed
Game_Actor.prototype.onAfterUnequip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' unequipped ' + item.name);
};

// ==== case: slotFilter=2 {"eventType":"both","timing":"after","slotFilter":"2"}
// Equipment Hook: Equip/Unequip - After (Head slot only)

// Hook for equipment being put on
const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
Game_Actor.prototype.changeEquip = function(slotId, item) {
    if (slotId !== 2) {
        _Game_Actor_changeEquip.call(this, slotId, item);
        return;
    }

    const oldItem = this.equips()[slotId];
    const isEquipping = item !== null && (oldItem === null || oldItem.id !== item.id);

    _Game_Actor_changeEquip.call(this, slotId, item);

    // After equip hook
    if (isEquipping && this.equips()[slotId] === item) {
        this.onAfterEquip(slotId, item);
    }
};

// Called after equipment is put on
Game_Actor.prototype.onAfterEquip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' equipped ' + item.name);
};

// Additional unequip handling in the existing hook
// (Note: This is already handled in the changeEquip hook above)
// Add this logic to the existing hook:

/*
const isUnequipping = oldItem !== null && (item === null || oldItem.id !== item.id);
if (isUnequipping) {
    // Call onBeforeUnequip/onAfterUnequip as needed
}
*/

// Called after equipment is removed
Game_Actor.prototype.onAfterUnequip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' unequipped ' + item.name);
};

// ==== case: slotFilter=3 {"eventType":"both","timing":"after","slotFilter":"3"}
// Equipment Hook: Equip/Unequip - After (Body slot only)

// Hook for equipment being put on
const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
Game_Actor.prototype.changeEquip = function(slotId, item) {
    if (slotId !== 3) {
        _Game_Actor_changeEquip.call(this, slotId, item);
        return;
    }

    const oldItem = this.equips()[slotId];
    const isEquipping = item !== null && (oldItem === null || oldItem.id !== item.id);

    _Game_Actor_changeEquip.call(this, slotId, item);

    // After equip hook
    if (isEquipping && this.equips()[slotId] === item) {
        this.onAfterEquip(slotId, item);
    }
};

// Called after equipment is put on
Game_Actor.prototype.onAfterEquip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' equipped ' + item.name);
};

// Additional unequip handling in the existing hook
// (Note: This is already handled in the changeEquip hook above)
// Add this logic to the existing hook:

/*
const isUnequipping = oldItem !== null && (item === null || oldItem.id !== item.id);
if (isUnequipping) {
    // Call onBeforeUnequip/onAfterUnequip as needed
}
*/

// Called after equipment is removed
Game_Actor.prototype.onAfterUnequip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' unequipped ' + item.name);
};

// ==== case: slotFilter=4 {"eventType":"both","timing":"after","slotFilter":"4"}
// Equipment Hook: Equip/Unequip - After (Accessory slot only)

// Hook for equipment being put on
const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
Game_Actor.prototype.changeEquip = function(slotId, item) {
    if (slotId !== 4) {
        _Game_Actor_changeEquip.call(this, slotId, item);
        return;
    }

    const oldItem = this.equips()[slotId];
    const isEquipping = item !== null && (oldItem === null || oldItem.id !== item.id);

    _Game_Actor_changeEquip.call(this, slotId, item);

    // After equip hook
    if (isEquipping && this.equips()[slotId] === item) {
        this.onAfterEquip(slotId, item);
    }
};

// Called after equipment is put on
Game_Actor.prototype.onAfterEquip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' equipped ' + item.name);
};

// Additional unequip handling in the existing hook
// (Note: This is already handled in the changeEquip hook above)
// Add this logic to the existing hook:

/*
const isUnequipping = oldItem !== null && (item === null || oldItem.id !== item.id);
if (isUnequipping) {
    // Call onBeforeUnequip/onAfterUnequip as needed
}
*/

// Called after equipment is removed
Game_Actor.prototype.onAfterUnequip = function(slotId, item) {
    // Your code here
    console.log(this.name() + ' unequipped ' + item.name);
};
