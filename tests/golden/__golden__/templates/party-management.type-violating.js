// ==== case: type-violating: wrong types {"featureType":7,"maxSize":"abc","minSize":"abc","hookTiming":7,"maxReserve":"abc"}
// rejects: Field "Feature Type" must be text | Field "Maximum Party Size" must be a number | Field "Minimum Party Size" must be a number | Field "Hook Timing" must be text | Field "Maximum Reserve Size" must be a number


// ==== case: type-violating: null {"featureType":null,"maxSize":null,"minSize":null,"hookTiming":null,"maxReserve":null}
// rejects: Field "Feature Type" is required
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
// rejects: Field "Feature Type" must be text | Field "Maximum Party Size" must be a number | Field "Minimum Party Size" must be a number | Field "Hook Timing" must be text | Field "Maximum Reserve Size" must be a number


// ==== case: type-violating: minSize="2" {"featureType":"sizeLimit","maxSize":4,"minSize":"2","hookTiming":"after","maxReserve":10}
// rejects: Field "Minimum Party Size" must be a number
// Party Size Limit: 2 to 4 members

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

// Prevent removing members below the min size
const _Game_Party_removeActor = Game_Party.prototype.removeActor;
Game_Party.prototype.removeActor = function(actorId) {
    if (this._actors.length <= 2) {
        // Party at minimum - you can customize this behavior
        console.log('Cannot remove member - party at minimum size.');
        return;
    }
    _Game_Party_removeActor.call(this, actorId);
};

// Helper method to check if party can add members
Game_Party.prototype.canAddMember = function() {
    return this._actors.length < this.maxBattleMembers();
};

// Helper method to get remaining slots
Game_Party.prototype.remainingSlots = function() {
    return Math.max(0, this.maxBattleMembers() - this._actors.length);
};

// ==== case: type-violating: maxSize=null {"featureType":"sizeLimit","maxSize":null,"minSize":1,"hookTiming":"after","maxReserve":10}
// rejects: Maximum Party Size must be at least 1 | Minimum Party Size cannot be greater than Maximum Party Size
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

// ==== case: type-violating: featureType="addRemoveHook",hookTiming=7 {"featureType":"addRemoveHook","maxSize":4,"minSize":1,"hookTiming":7,"maxReserve":10}
// rejects: Field "Hook Timing" must be text
// Party Member Change Hooks

// Hook for when a member is about to be added
const _Game_Party_addActor = Game_Party.prototype.addActor;
Game_Party.prototype.addActor = function(actorId) {
    // Return false from canAddMember to prevent adding
    if (!this.canAddThisMember(actorId)) {
        console.log('Cannot add this member!');
        return;
    }
    _Game_Party_addActor.call(this, actorId);
};

// Override to control which actors can be added
Game_Party.prototype.canAddThisMember = function(actorId) {
    // Add your conditions here
    // Example: return actorId !== 5; // Cannot add actor 5
    return true;
};

// Hook for when a member is about to be removed
const _Game_Party_removeActor = Game_Party.prototype.removeActor;
Game_Party.prototype.removeActor = function(actorId) {
    // Return false from canRemoveMember to prevent removing
    if (!this.canRemoveThisMember(actorId)) {
        console.log('Cannot remove this member!');
        return;
    }
    _Game_Party_removeActor.call(this, actorId);
};

// Override to control which actors can be removed
Game_Party.prototype.canRemoveThisMember = function(actorId) {
    // Add your conditions here
    // Example: return actorId !== 1; // Cannot remove actor 1 (leader)
    return true;
};

// ==== case: type-violating: featureType="reserveParty",maxReserve="abc" {"featureType":"reserveParty","maxSize":4,"minSize":1,"hookTiming":"after","maxReserve":"abc"}
// rejects: Field "Maximum Reserve Size" must be a number
// Reserve Party System
// Maximum reserve members: abc

// Initialize reserve party array
const _Game_Party_initialize = Game_Party.prototype.initialize;
Game_Party.prototype.initialize = function() {
    _Game_Party_initialize.call(this);
    this._reserveMembers = [];
};

// Get maximum reserve size
Game_Party.prototype.maxReserveMembers = function() {
    return abc;
};

// Get all reserve members
Game_Party.prototype.reserveMembers = function() {
    return this._reserveMembers.map(id => $gameActors.actor(id));
};

// Add actor to reserve party
Game_Party.prototype.addToReserve = function(actorId) {
    if (this._reserveMembers.length >= this.maxReserveMembers()) {
        console.log('Reserve party is full!');
        return false;
    }
    if (!this._reserveMembers.includes(actorId)) {
        this._reserveMembers.push(actorId);
        return true;
    }
    return false;
};

// Remove actor from reserve party
Game_Party.prototype.removeFromReserve = function(actorId) {
    const index = this._reserveMembers.indexOf(actorId);
    if (index >= 0) {
        this._reserveMembers.splice(index, 1);
        return true;
    }
    return false;
};

// Swap actor between active party and reserve
Game_Party.prototype.swapWithReserve = function(activeActorId, reserveActorId) {
    if (!this._actors.includes(activeActorId)) return false;
    if (!this._reserveMembers.includes(reserveActorId)) return false;

    // Remove from current positions
    this.removeActor(activeActorId);
    this.removeFromReserve(reserveActorId);

    // Add to new positions
    this.addActor(reserveActorId);
    this.addToReserve(activeActorId);

    return true;
};

// Check if actor is in reserve
Game_Party.prototype.isInReserve = function(actorId) {
    return this._reserveMembers.includes(actorId);
};

// ==== case: type-violating: featureType="reserveParty",maxReserve=null {"featureType":"reserveParty","maxSize":4,"minSize":1,"hookTiming":"after","maxReserve":null}
// rejects: Maximum Reserve Size must be at least 1
// Reserve Party System
// Maximum reserve members: 10

// Initialize reserve party array
const _Game_Party_initialize = Game_Party.prototype.initialize;
Game_Party.prototype.initialize = function() {
    _Game_Party_initialize.call(this);
    this._reserveMembers = [];
};

// Get maximum reserve size
Game_Party.prototype.maxReserveMembers = function() {
    return 10;
};

// Get all reserve members
Game_Party.prototype.reserveMembers = function() {
    return this._reserveMembers.map(id => $gameActors.actor(id));
};

// Add actor to reserve party
Game_Party.prototype.addToReserve = function(actorId) {
    if (this._reserveMembers.length >= this.maxReserveMembers()) {
        console.log('Reserve party is full!');
        return false;
    }
    if (!this._reserveMembers.includes(actorId)) {
        this._reserveMembers.push(actorId);
        return true;
    }
    return false;
};

// Remove actor from reserve party
Game_Party.prototype.removeFromReserve = function(actorId) {
    const index = this._reserveMembers.indexOf(actorId);
    if (index >= 0) {
        this._reserveMembers.splice(index, 1);
        return true;
    }
    return false;
};

// Swap actor between active party and reserve
Game_Party.prototype.swapWithReserve = function(activeActorId, reserveActorId) {
    if (!this._actors.includes(activeActorId)) return false;
    if (!this._reserveMembers.includes(reserveActorId)) return false;

    // Remove from current positions
    this.removeActor(activeActorId);
    this.removeFromReserve(reserveActorId);

    // Add to new positions
    this.addActor(reserveActorId);
    this.addToReserve(activeActorId);

    return true;
};

// Check if actor is in reserve
Game_Party.prototype.isInReserve = function(actorId) {
    return this._reserveMembers.includes(actorId);
};
