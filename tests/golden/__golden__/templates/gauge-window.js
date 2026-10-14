// ==== case: base {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=1 {"gaugeCount":"1","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 1 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 60);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=2 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3 {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'TP', color1: '#40c040', color2: '#80f080', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'TP', color1: '#40c040', color2: '#80f080', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Label=empty {"gaugeCount":"2","gauge1Label":"","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Color1=empty {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Color2=empty {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Label=empty {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Color1=empty {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Color2=empty {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Label=empty {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Color1=empty {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Color2=empty {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: showLabels=true {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: showLabels=false {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"false","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    const gaugeX = 0;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: showValues=true {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: showValues=false {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"false","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 0;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: dataSource=actor {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: dataSource=variable {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"variable","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    // Using game variables for gauge values
    // Customize variable IDs as needed
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: $gameVariables.value(1), max: $gameVariables.value(2) },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: $gameVariables.value(3), max: $gameVariables.value(4) },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: dataSource=custom {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"custom","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    // Custom data source - override this method or call setGaugeValue()
    return this._gaugeData;
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: windowName=comment-space {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_XglobalThispwn1Y.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_XglobalThispwn1Y.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_XglobalThispwn1Y.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._xglobalThispwn1YWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: windowName=comment-u2028 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_XglobalThispwn1Y.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_XglobalThispwn1Y.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_XglobalThispwn1Y.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._xglobalThispwn1YWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: windowName=comment-u2029 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_XglobalThispwn1Y.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_XglobalThispwn1Y.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_XglobalThispwn1Y.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._xglobalThispwn1YWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: windowName=comment-lf {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_XglobalThispwn1Y.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_XglobalThispwn1Y.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_XglobalThispwn1Y.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._xglobalThispwn1YWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: windowName=quote-single {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_XglobalThispwn1Y.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_XglobalThispwn1Y.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_XglobalThispwn1Y.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._xglobalThispwn1YWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: windowName=quote-double {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1Y
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1Y.prototype.constructor = Window_XglobalThispwn1Y;

Window_XglobalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_XglobalThispwn1Y.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_XglobalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_XglobalThispwn1Y.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_XglobalThispwn1Y.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_XglobalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_XglobalThispwn1Y.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createXglobalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1YWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._xglobalThispwn1YWindow = new Window_XglobalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1YWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._xglobalThispwn1YWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: windowName=quote-backtick {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Window Name must start with a letter and contain only letters and numbers
//-----------------------------------------------------------------------------
// Window_XglobalThispwn1globalThispwn1Y
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_XglobalThispwn1globalThispwn1Y() {
    this.initialize(...arguments);
}

Window_XglobalThispwn1globalThispwn1Y.prototype = Object.create(Window_Base.prototype);
Window_XglobalThispwn1globalThispwn1Y.prototype.constructor = Window_XglobalThispwn1globalThispwn1Y;

Window_XglobalThispwn1globalThispwn1Y.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_XglobalThispwn1globalThispwn1Y.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_XglobalThispwn1globalThispwn1Y.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_XglobalThispwn1globalThispwn1Y.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_XglobalThispwn1globalThispwn1Y.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_XglobalThispwn1globalThispwn1Y.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_XglobalThispwn1globalThispwn1Y.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_XglobalThispwn1globalThispwn1Y.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createXglobalThispwn1globalThispwn1YWindow();
};

Scene_Map.prototype.createXglobalThispwn1globalThispwn1YWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._xglobalThispwn1globalThispwn1YWindow = new Window_XglobalThispwn1globalThispwn1Y(rect);
    this.addWindow(this._xglobalThispwn1globalThispwn1YWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._xglobalThispwn1globalThispwn1YWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Label=comment-space {"gaugeCount":"2","gauge1Label":"X */ globalThis.__pwn = 1; /* Y","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Label=comment-u2028 {"gaugeCount":"2","gauge1Label":"X */\u2028globalThis.__pwn = 1; /* Y","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Label=comment-u2029 {"gaugeCount":"2","gauge1Label":"X */\u2029globalThis.__pwn = 1; /* Y","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Label=comment-lf {"gaugeCount":"2","gauge1Label":"X */\nglobalThis.__pwn = 1; /* Y","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'X */\nglobalThis.__pwn = 1; /* Y', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'X */\nglobalThis.__pwn = 1; /* Y', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Label=quote-single {"gaugeCount":"2","gauge1Label":"X' + (globalThis.__pwn = 1) + 'Y","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'X\' + (globalThis.__pwn = 1) + \'Y', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'X\' + (globalThis.__pwn = 1) + \'Y', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Label=quote-double {"gaugeCount":"2","gauge1Label":"X\" + (globalThis.__pwn = 1) + \"Y","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'X" + (globalThis.__pwn = 1) + "Y', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'X" + (globalThis.__pwn = 1) + "Y', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Label=quote-backtick {"gaugeCount":"2","gauge1Label":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Color1=comment-space {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"X */ globalThis.__pwn = 1; /* Y","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Color1=comment-u2028 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"X */\u2028globalThis.__pwn = 1; /* Y","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Color1=comment-u2029 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"X */\u2029globalThis.__pwn = 1; /* Y","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Color1=comment-lf {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"X */\nglobalThis.__pwn = 1; /* Y","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: 'X */\nglobalThis.__pwn = 1; /* Y', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: 'X */\nglobalThis.__pwn = 1; /* Y', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Color1=quote-single {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"X' + (globalThis.__pwn = 1) + 'Y","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: 'X\' + (globalThis.__pwn = 1) + \'Y', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: 'X\' + (globalThis.__pwn = 1) + \'Y', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Color1=quote-double {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"X\" + (globalThis.__pwn = 1) + \"Y","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: 'X" + (globalThis.__pwn = 1) + "Y', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: 'X" + (globalThis.__pwn = 1) + "Y', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Color1=quote-backtick {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Color2=comment-space {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"X */ globalThis.__pwn = 1; /* Y","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: 'X */ globalThis.__pwn = 1; /* Y', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: 'X */ globalThis.__pwn = 1; /* Y', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Color2=comment-u2028 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"X */\u2028globalThis.__pwn = 1; /* Y","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: 'X */ globalThis.__pwn = 1; /* Y', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: 'X */ globalThis.__pwn = 1; /* Y', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Color2=comment-u2029 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"X */\u2029globalThis.__pwn = 1; /* Y","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: 'X */ globalThis.__pwn = 1; /* Y', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: 'X */ globalThis.__pwn = 1; /* Y', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Color2=comment-lf {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"X */\nglobalThis.__pwn = 1; /* Y","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: 'X */\nglobalThis.__pwn = 1; /* Y', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: 'X */\nglobalThis.__pwn = 1; /* Y', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Color2=quote-single {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"X' + (globalThis.__pwn = 1) + 'Y","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: 'X\' + (globalThis.__pwn = 1) + \'Y', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: 'X\' + (globalThis.__pwn = 1) + \'Y', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Color2=quote-double {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"X\" + (globalThis.__pwn = 1) + \"Y","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: 'X" + (globalThis.__pwn = 1) + "Y', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: 'X" + (globalThis.__pwn = 1) + "Y', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge1Color2=quote-backtick {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Label=comment-space {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"X */ globalThis.__pwn = 1; /* Y","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Label=comment-u2028 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"X */\u2028globalThis.__pwn = 1; /* Y","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Label=comment-u2029 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"X */\u2029globalThis.__pwn = 1; /* Y","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Label=comment-lf {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"X */\nglobalThis.__pwn = 1; /* Y","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'X */\nglobalThis.__pwn = 1; /* Y', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'X */\nglobalThis.__pwn = 1; /* Y', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Label=quote-single {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"X' + (globalThis.__pwn = 1) + 'Y","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'X\' + (globalThis.__pwn = 1) + \'Y', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'X\' + (globalThis.__pwn = 1) + \'Y', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Label=quote-double {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"X\" + (globalThis.__pwn = 1) + \"Y","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'X" + (globalThis.__pwn = 1) + "Y', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'X" + (globalThis.__pwn = 1) + "Y', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Label=quote-backtick {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Color1=comment-space {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"X */ globalThis.__pwn = 1; /* Y","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Color1=comment-u2028 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"X */\u2028globalThis.__pwn = 1; /* Y","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Color1=comment-u2029 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"X */\u2029globalThis.__pwn = 1; /* Y","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Color1=comment-lf {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"X */\nglobalThis.__pwn = 1; /* Y","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: 'X */\nglobalThis.__pwn = 1; /* Y', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: 'X */\nglobalThis.__pwn = 1; /* Y', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Color1=quote-single {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"X' + (globalThis.__pwn = 1) + 'Y","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: 'X\' + (globalThis.__pwn = 1) + \'Y', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: 'X\' + (globalThis.__pwn = 1) + \'Y', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Color1=quote-double {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"X\" + (globalThis.__pwn = 1) + \"Y","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: 'X" + (globalThis.__pwn = 1) + "Y', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: 'X" + (globalThis.__pwn = 1) + "Y', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Color1=quote-backtick {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Color2=comment-space {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"X */ globalThis.__pwn = 1; /* Y","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: 'X */ globalThis.__pwn = 1; /* Y', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: 'X */ globalThis.__pwn = 1; /* Y', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Color2=comment-u2028 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"X */\u2028globalThis.__pwn = 1; /* Y","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: 'X */ globalThis.__pwn = 1; /* Y', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: 'X */ globalThis.__pwn = 1; /* Y', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Color2=comment-u2029 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"X */\u2029globalThis.__pwn = 1; /* Y","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: 'X */ globalThis.__pwn = 1; /* Y', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: 'X */ globalThis.__pwn = 1; /* Y', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Color2=comment-lf {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"X */\nglobalThis.__pwn = 1; /* Y","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: 'X */\nglobalThis.__pwn = 1; /* Y', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: 'X */\nglobalThis.__pwn = 1; /* Y', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Color2=quote-single {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"X' + (globalThis.__pwn = 1) + 'Y","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: 'X\' + (globalThis.__pwn = 1) + \'Y', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: 'X\' + (globalThis.__pwn = 1) + \'Y', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Color2=quote-double {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"X\" + (globalThis.__pwn = 1) + \"Y","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: 'X" + (globalThis.__pwn = 1) + "Y', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: 'X" + (globalThis.__pwn = 1) + "Y', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge2Color2=quote-backtick {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Label=comment-space {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"X */ globalThis.__pwn = 1; /* Y","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Label=comment-u2028 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"X */\u2028globalThis.__pwn = 1; /* Y","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Label=comment-u2029 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"X */\u2029globalThis.__pwn = 1; /* Y","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Label=comment-lf {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"X */\nglobalThis.__pwn = 1; /* Y","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Label=quote-single {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"X' + (globalThis.__pwn = 1) + 'Y","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Label=quote-double {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"X\" + (globalThis.__pwn = 1) + \"Y","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Label=quote-backtick {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Label=comment-space {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"X */ globalThis.__pwn = 1; /* Y","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#40c040', color2: '#80f080', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#40c040', color2: '#80f080', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Label=comment-u2028 {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"X */\u2028globalThis.__pwn = 1; /* Y","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#40c040', color2: '#80f080', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#40c040', color2: '#80f080', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Label=comment-u2029 {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"X */\u2029globalThis.__pwn = 1; /* Y","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#40c040', color2: '#80f080', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'X */ globalThis.__pwn = 1; /* Y', color1: '#40c040', color2: '#80f080', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Label=comment-lf {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"X */\nglobalThis.__pwn = 1; /* Y","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'X */\nglobalThis.__pwn = 1; /* Y', color1: '#40c040', color2: '#80f080', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'X */\nglobalThis.__pwn = 1; /* Y', color1: '#40c040', color2: '#80f080', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Label=quote-single {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"X' + (globalThis.__pwn = 1) + 'Y","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'X\' + (globalThis.__pwn = 1) + \'Y', color1: '#40c040', color2: '#80f080', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'X\' + (globalThis.__pwn = 1) + \'Y', color1: '#40c040', color2: '#80f080', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Label=quote-double {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"X\" + (globalThis.__pwn = 1) + \"Y","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'X" + (globalThis.__pwn = 1) + "Y', color1: '#40c040', color2: '#80f080', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'X" + (globalThis.__pwn = 1) + "Y', color1: '#40c040', color2: '#80f080', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Label=quote-backtick {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', color1: '#40c040', color2: '#80f080', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', color1: '#40c040', color2: '#80f080', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Color1=comment-space {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"X */ globalThis.__pwn = 1; /* Y","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Color1=comment-u2028 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"X */\u2028globalThis.__pwn = 1; /* Y","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Color1=comment-u2029 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"X */\u2029globalThis.__pwn = 1; /* Y","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Color1=comment-lf {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"X */\nglobalThis.__pwn = 1; /* Y","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Color1=quote-single {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"X' + (globalThis.__pwn = 1) + 'Y","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Color1=quote-double {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"X\" + (globalThis.__pwn = 1) + \"Y","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Color1=quote-backtick {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Color1=comment-space {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"X */ globalThis.__pwn = 1; /* Y","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'TP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#80f080', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'TP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#80f080', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Color1=comment-u2028 {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"X */\u2028globalThis.__pwn = 1; /* Y","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'TP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#80f080', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'TP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#80f080', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Color1=comment-u2029 {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"X */\u2029globalThis.__pwn = 1; /* Y","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'TP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#80f080', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'TP', color1: 'X */ globalThis.__pwn = 1; /* Y', color2: '#80f080', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Color1=comment-lf {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"X */\nglobalThis.__pwn = 1; /* Y","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'TP', color1: 'X */\nglobalThis.__pwn = 1; /* Y', color2: '#80f080', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'TP', color1: 'X */\nglobalThis.__pwn = 1; /* Y', color2: '#80f080', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Color1=quote-single {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"X' + (globalThis.__pwn = 1) + 'Y","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'TP', color1: 'X\' + (globalThis.__pwn = 1) + \'Y', color2: '#80f080', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'TP', color1: 'X\' + (globalThis.__pwn = 1) + \'Y', color2: '#80f080', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Color1=quote-double {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"X\" + (globalThis.__pwn = 1) + \"Y","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'TP', color1: 'X" + (globalThis.__pwn = 1) + "Y', color2: '#80f080', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'TP', color1: 'X" + (globalThis.__pwn = 1) + "Y', color2: '#80f080', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Color1=quote-backtick {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'TP', color1: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', color2: '#80f080', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'TP', color1: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', color2: '#80f080', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Color2=comment-space {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"X */ globalThis.__pwn = 1; /* Y","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Color2=comment-u2028 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"X */\u2028globalThis.__pwn = 1; /* Y","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Color2=comment-u2029 {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"X */\u2029globalThis.__pwn = 1; /* Y","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Color2=comment-lf {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"X */\nglobalThis.__pwn = 1; /* Y","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Color2=quote-single {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"X' + (globalThis.__pwn = 1) + 'Y","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Color2=quote-double {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"X\" + (globalThis.__pwn = 1) + \"Y","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gauge3Color2=quote-backtick {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 2 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 96);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Color2=comment-space {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"X */ globalThis.__pwn = 1; /* Y","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'TP', color1: '#40c040', color2: 'X */ globalThis.__pwn = 1; /* Y', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'TP', color1: '#40c040', color2: 'X */ globalThis.__pwn = 1; /* Y', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Color2=comment-u2028 {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"X */\u2028globalThis.__pwn = 1; /* Y","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'TP', color1: '#40c040', color2: 'X */ globalThis.__pwn = 1; /* Y', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'TP', color1: '#40c040', color2: 'X */ globalThis.__pwn = 1; /* Y', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Color2=comment-u2029 {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"X */\u2029globalThis.__pwn = 1; /* Y","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'TP', color1: '#40c040', color2: 'X */ globalThis.__pwn = 1; /* Y', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'TP', color1: '#40c040', color2: 'X */ globalThis.__pwn = 1; /* Y', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Color2=comment-lf {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"X */\nglobalThis.__pwn = 1; /* Y","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'TP', color1: '#40c040', color2: 'X */\nglobalThis.__pwn = 1; /* Y', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'TP', color1: '#40c040', color2: 'X */\nglobalThis.__pwn = 1; /* Y', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Color2=quote-single {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"X' + (globalThis.__pwn = 1) + 'Y","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'TP', color1: '#40c040', color2: 'X\' + (globalThis.__pwn = 1) + \'Y', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'TP', color1: '#40c040', color2: 'X\' + (globalThis.__pwn = 1) + \'Y', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Color2=quote-double {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"X\" + (globalThis.__pwn = 1) + \"Y","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'TP', color1: '#40c040', color2: 'X" + (globalThis.__pwn = 1) + "Y', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'TP', color1: '#40c040', color2: 'X" + (globalThis.__pwn = 1) + "Y', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================

// ==== case: gaugeCount=3,gauge3Color2=quote-backtick {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y","positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
//-----------------------------------------------------------------------------
// Window_Sample
//
// A window that displays gauge bars (HP/MP style).
// Contains 3 gauge(s) that update automatically.
//-----------------------------------------------------------------------------

function Window_Sample() {
    this.initialize(...arguments);
}

Window_Sample.prototype = Object.create(Window_Base.prototype);
Window_Sample.prototype.constructor = Window_Sample;

Window_Sample.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._gaugeData = [];
    this.initializeGauges();
    this.refresh();
};

Window_Sample.prototype.initializeGauges = function() {
    // Initialize gauge configurations
    this._gaugeData = [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: 0, max: 100 },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: 0, max: 100 },
        { label: 'TP', color1: '#40c040', color2: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', current: 0, max: 100 },
    ];
};

Window_Sample.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.needsRefresh()) {
        this.refresh();
    }
};

Window_Sample.prototype.needsRefresh = function() {
    const newData = this.getCurrentValues();
    for (let i = 0; i < this._gaugeData.length; i++) {
        if (this._gaugeData[i].current !== newData[i].current ||
            this._gaugeData[i].max !== newData[i].max) {
            return true;
        }
    }
    return false;
};

Window_Sample.prototype.getCurrentValues = function() {
    const actor = $gameParty.leader();
    if (!actor) return this._gaugeData;
    
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: actor.hp, max: actor.mhp },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: actor.mp, max: actor.mmp },
        { label: 'TP', color1: '#40c040', color2: 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y', current: actor.tp, max: actor.maxTp() },
    ];
};

Window_Sample.prototype.setGaugeValue = function(index, current, max) {
    if (this._gaugeData[index]) {
        this._gaugeData[index].current = current;
        this._gaugeData[index].max = max;
        this.refresh();
    }
};

Window_Sample.prototype.refresh = function() {
    this.contents.clear();
    this._gaugeData = this.getCurrentValues();
    
    for (let i = 0; i < this._gaugeData.length; i++) {
        this.drawGauge(i, i * 36);
    }
};

Window_Sample.prototype.drawGauge = function(index, y) {
    const gauge = this._gaugeData[index];
    const rate = gauge.max > 0 ? gauge.current / gauge.max : 0;
    const gaugeHeight = 12;
    
    // Draw label
    const labelWidth = 48;
    this.drawText(gauge.label, 0, y, labelWidth);
    
    // Calculate gauge position
    const gaugeX = labelWidth + 4;
    const valueWidth = 80;
    const gaugeWidth = this.contentsWidth() - gaugeX - valueWidth;
    const gaugeY = y + (this.lineHeight() - gaugeHeight) / 2;
    
    // Draw gauge background
    this.contents.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight, '#202040');
    
    // Draw gauge fill with gradient
    const fillWidth = Math.floor(gaugeWidth * rate);
    if (fillWidth > 0) {
        this.contents.gradientFillRect(gaugeX, gaugeY, fillWidth, gaugeHeight, gauge.color1, gauge.color2);
    }
    
    // Draw values
    const valueText = gauge.current + "/" + gauge.max;
    this.drawText(valueText, gaugeX + gaugeWidth + 4, y, valueWidth - 4, 'left');
};

// Add gauge window to Scene_Map
const _Scene_Map_createAllWindows_Gauge = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows_Gauge.call(this);
    this.createSampleWindow();
};

Scene_Map.prototype.createSampleWindow = function() {
    const rect = new Rectangle(10, 10, 300, 132);
    this._sampleWindow = new Window_Sample(rect);
    this.addWindow(this._sampleWindow);
};

// ============================================
// USAGE EXAMPLE:
// ============================================
// Access the gauge window from events:
// const gaugeWindow = SceneManager._scene._sampleWindow;
//
// For custom data source, set values manually:
// gaugeWindow.setGaugeValue(0, 75, 100); // First gauge at 75%
// gaugeWindow.setGaugeValue(1, 50, 100); // Second gauge at 50%
// ============================================
