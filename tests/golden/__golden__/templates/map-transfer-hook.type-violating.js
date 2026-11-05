// ==== case: type-violating: wrong types {"timing":7,"filterMapId":42,"includeFadeInfo":"yes","includeDirection":"yes"}
// rejects: Field "Timing" must be text | Field "Filter by Map ID (optional)" must be text | Field "Include Fade Information" must be true or false | Field "Include Direction Information" must be true or false
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {


})();

// ==== case: type-violating: null {"timing":null,"filterMapId":null,"includeFadeInfo":null,"includeDirection":null}
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {

    // After Transfer Hook
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);

        // Check if this is a transfer (not initial load or battle return)
        if ($gamePlayer._transferring) {
            const mapId = $gameMap.mapId();
            this.onAfterMapTransfer(mapId);
        }
    };

    // Override this method to add your after-transfer logic
    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {
        // Your code here (after arriving at the new map)
        console.log('Arrived at map', mapId);

        // Access map information
        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;
        console.log('Map name:', mapName);
    };

})();

// ==== case: type-violating: arrays {"timing":["a","b"],"filterMapId":["a","b"],"includeFadeInfo":["a","b"],"includeDirection":["a","b"]}
// rejects: Field "Timing" must be text | Field "Filter by Map ID (optional)" must be text | Field "Include Fade Information" must be true or false | Field "Include Direction Information" must be true or false
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {


})();

// ==== case: type-violating: filterMapId="12",includeDirection=null {"timing":"after","includeFadeInfo":false,"includeDirection":null,"filterMapId":"12"}
// Map Transfer Hook
// Execute custom code when transferring between maps

(() => {

    // After Transfer Hook
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);

        // Check if this is a transfer (not initial load or battle return)
        if ($gamePlayer._transferring) {
            const mapId = $gameMap.mapId();
            // Filter: Only trigger for map 12
            if (mapId === 12) {
                this.onAfterMapTransfer(mapId);
            }
        }
    };

    // Override this method to add your after-transfer logic
    Scene_Map.prototype.onAfterMapTransfer = function(mapId) {
        // Your code here (after arriving at the new map)
        console.log('Arrived at map', mapId);

        // Access map information
        const mapName = $dataMap.displayName || $dataMapInfos[mapId].name;
        console.log('Map name:', mapName);
    };

})();
