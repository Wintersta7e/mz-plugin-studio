// ==== case: type-violating: wrong types {"eventType":7,"timing":7,"slotFilter":7}
// rejects: Field "Event Type" must be text | Field "Timing" must be text | Field "Slot Filter (optional)" must be text
// throws: TypeError

// ==== case: type-violating: null {"eventType":null,"timing":null,"slotFilter":null}
// rejects: Field "Event Type" is required | Field "Timing" is required
// throws: TypeError

// ==== case: type-violating: arrays {"eventType":["a","b"],"timing":["a","b"],"slotFilter":["a","b"]}
// rejects: Field "Event Type" must be text | Field "Timing" must be text | Field "Slot Filter (optional)" must be text
// throws: TypeError

// ==== case: type-violating: null where not required {"eventType":"both","timing":"after","slotFilter":null}
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

// ==== case: type-violating: unlisted choices {"eventType":"unlisted","timing":"unlisted","slotFilter":"unlisted"}
// rejects: Field "Event Type" must be one of its choices | Field "Timing" must be one of its choices | Field "Slot Filter (optional)" must be one of its choices
// Equipment Hook: Unlisted - After (undefined slot only)


// ==== case: type-violating: empty text {"eventType":"both","timing":"after","slotFilter":"all"}
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

// ==== case: type-violating: required fields only {"eventType":"both","timing":"after"}
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

// ==== case: type-violating: slotFilter=7 {"eventType":"both","timing":"after","slotFilter":7}
// rejects: Field "Slot Filter (optional)" must be text
// throws: TypeError

// ==== case: type-violating: eventType="change",slotFilter=7 {"eventType":"change","timing":"after","slotFilter":7}
// rejects: Field "Slot Filter (optional)" must be text
// throws: TypeError

// ==== case: type-violating: eventType="unequip",slotFilter=7 {"eventType":"unequip","timing":"after","slotFilter":7}
// rejects: Field "Slot Filter (optional)" must be text
// throws: TypeError
