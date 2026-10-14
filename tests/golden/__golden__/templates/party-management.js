// ==== case: base {"featureType":"sizeLimit","maxSize":4,"minSize":1,"hookTiming":"after","maxReserve":10}
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

// ==== case: featureType=sizeLimit {"featureType":"sizeLimit","maxSize":4,"minSize":1,"hookTiming":"after","maxReserve":10}
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

// ==== case: featureType=addRemoveHook {"featureType":"addRemoveHook","maxSize":4,"minSize":1,"hookTiming":"after","maxReserve":10}
// Party Member Change Hooks

// Hook for when a member is added
const _Game_Party_addActor = Game_Party.prototype.addActor;
Game_Party.prototype.addActor = function(actorId) {
    const wasInParty = this._actors.includes(actorId);
    _Game_Party_addActor.call(this, actorId);

    if (!wasInParty && this._actors.includes(actorId)) {
        // Member was successfully added
        this.onMemberAdded(actorId);
    }
};

// Called when a member is added to the party
Game_Party.prototype.onMemberAdded = function(actorId) {
    const actor = $gameActors.actor(actorId);
    console.log(actor.name() + ' joined the party!');
    // Add your custom logic here
};

// Hook for when a member is removed
const _Game_Party_removeActor = Game_Party.prototype.removeActor;
Game_Party.prototype.removeActor = function(actorId) {
    const wasInParty = this._actors.includes(actorId);
    _Game_Party_removeActor.call(this, actorId);

    if (wasInParty && !this._actors.includes(actorId)) {
        // Member was successfully removed
        this.onMemberRemoved(actorId);
    }
};

// Called when a member is removed from the party
Game_Party.prototype.onMemberRemoved = function(actorId) {
    const actor = $gameActors.actor(actorId);
    console.log(actor.name() + ' left the party!');
    // Add your custom logic here
};

// ==== case: featureType=reserveParty {"featureType":"reserveParty","maxSize":4,"minSize":1,"hookTiming":"after","maxReserve":10}
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

// ==== case: hookTiming=after {"featureType":"sizeLimit","maxSize":4,"minSize":1,"hookTiming":"after","maxReserve":10}
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

// ==== case: hookTiming=before {"featureType":"sizeLimit","maxSize":4,"minSize":1,"hookTiming":"before","maxReserve":10}
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
