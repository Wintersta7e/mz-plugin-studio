// ==== case: type-violating: wrong types {"featureType":7,"maxSize":"abc","minSize":"abc","hookTiming":7,"maxReserve":"abc"}


// ==== case: type-violating: null {"featureType":null,"maxSize":null,"minSize":null,"hookTiming":null,"maxReserve":null}
// Party Size Limit: 1 to 4 members

// Store the party size limits
Game_Party.prototype.maxBattleMembers = function() {
    return 4;
};

// Prevent adding members beyond the max size
const _Game_Party_addActor = Game_Party.prototype.addActor;
Game_Party.prototype.addActor = function(actorId) {
    if (this._actors.length >= this.maxBattleMembers()) {
        // Party is full - you can customize this behavior
        console.log('Party is full! Cannot add more members.');
        return;
    }
    _Game_Party_addActor.call(this, actorId);
};

// Helper method to check if party can add members
Game_Party.prototype.canAddMember = function() {
    return this._actors.length < this.maxBattleMembers();
};

// Helper method to get remaining slots
Game_Party.prototype.remainingSlots = function() {
    return Math.max(0, this.maxBattleMembers() - this._actors.length);
};

// ==== case: type-violating: arrays {"featureType":["a","b"],"maxSize":["a","b"],"minSize":["a","b"],"hookTiming":["a","b"],"maxReserve":["a","b"]}

