// ==== case: type-violating: wrong types {"windowName":42,"gaugeCount":7,"gauge1Label":42,"gauge1Color1":42,"gauge1Color2":42,"gauge2Label":42,"gauge2Color1":42,"gauge2Color2":42,"gauge3Label":42,"gauge3Color1":42,"gauge3Color2":42,"positionX":"abc","positionY":"abc","width":"abc","gaugeHeight":"abc","showLabels":7,"showValues":7,"dataSource":7}
// rejects: Field "Window Name" must be text | Field "Number of Gauges" must be text | Field "Gauge 1 Label" must be text | Field "Gauge 1 Color (Start)" must be text | Field "Gauge 1 Color (End)" must be text | Field "Gauge 2 Label" must be text | Field "Gauge 2 Color (Start)" must be text | Field "Gauge 2 Color (End)" must be text | Field "Gauge 3 Label" must be text | Field "Gauge 3 Color (Start)" must be text | Field "Gauge 3 Color (End)" must be text | Field "X Position" must be a number | Field "Y Position" must be a number | Field "Width" must be a number | Field "Gauge Height" must be a number | Field "Show Labels" must be text | Field "Show Values" must be text | Field "Data Source" must be text
// throws: TypeError

// ==== case: type-violating: null {"windowName":null,"gaugeCount":null,"gauge1Label":null,"gauge1Color1":null,"gauge1Color2":null,"gauge2Label":null,"gauge2Color1":null,"gauge2Color2":null,"gauge3Label":null,"gauge3Color1":null,"gauge3Color2":null,"positionX":null,"positionY":null,"width":null,"gaugeHeight":null,"showLabels":null,"showValues":null,"dataSource":null}
// rejects: Width must be a positive number | Gauge Height must be a positive number
// throws: TypeError

// ==== case: type-violating: arrays {"windowName":["a","b"],"gaugeCount":["a","b"],"gauge1Label":["a","b"],"gauge1Color1":["a","b"],"gauge1Color2":["a","b"],"gauge2Label":["a","b"],"gauge2Color1":["a","b"],"gauge2Color2":["a","b"],"gauge3Label":["a","b"],"gauge3Color1":["a","b"],"gauge3Color2":["a","b"],"positionX":["a","b"],"positionY":["a","b"],"width":["a","b"],"gaugeHeight":["a","b"],"showLabels":["a","b"],"showValues":["a","b"],"dataSource":["a","b"]}
// rejects: Field "Window Name" must be text | Field "Number of Gauges" must be text | Field "Gauge 1 Label" must be text | Field "Gauge 1 Color (Start)" must be text | Field "Gauge 1 Color (End)" must be text | Field "Gauge 2 Label" must be text | Field "Gauge 2 Color (Start)" must be text | Field "Gauge 2 Color (End)" must be text | Field "Gauge 3 Label" must be text | Field "Gauge 3 Color (Start)" must be text | Field "Gauge 3 Color (End)" must be text | Field "X Position" must be a number | Field "Y Position" must be a number | Field "Width" must be a number | Field "Gauge Height" must be a number | Field "Show Labels" must be text | Field "Show Values" must be text | Field "Data Source" must be text
// throws: TypeError

// ==== case: type-violating: gaugeCount="3",dataSource="variable",width=null,gaugeHeight=null {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":10,"width":null,"gaugeHeight":null,"showLabels":"true","showValues":"true","dataSource":"variable","windowName":"Sample"}
// rejects: Width must be a positive number | Gauge Height must be a positive number
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
    // Using game variables for gauge values
    // Customize variable IDs as needed
    return [
        { label: 'HP', color1: '#e08040', color2: '#f0c040', current: $gameVariables.value(1), max: $gameVariables.value(2) },
        { label: 'MP', color1: '#4080c0', color2: '#40c0f0', current: $gameVariables.value(3), max: $gameVariables.value(4) },
        { label: 'TP', color1: '#40c040', color2: '#80f080', current: $gameVariables.value(5), max: $gameVariables.value(6) },
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

// ==== case: type-violating: gaugeCount=3,positionX="abc",gaugeHeight=["a","b"] {"gaugeCount":3,"gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":"abc","positionY":10,"width":300,"gaugeHeight":["a","b"],"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
// rejects: Field "Number of Gauges" must be text | Field "X Position" must be a number | Field "Gauge Height" must be a number
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
    const gaugeHeight = a,b;
    
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
    const rect = new Rectangle(abc, 10, 300, 132);
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

// ==== case: type-violating: gaugeCount="3",gauge3Color2=7 {"gaugeCount":"3","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":7,"positionX":10,"positionY":10,"width":300,"gaugeHeight":12,"showLabels":"true","showValues":"true","dataSource":"actor","windowName":"Sample"}
// rejects: Field "Gauge 3 Color (End)" must be text
// throws: TypeError

// ==== case: type-violating: dataSource="custom",showLabels="false",positionY=null {"gaugeCount":"2","gauge1Label":"HP","gauge1Color1":"#e08040","gauge1Color2":"#f0c040","gauge2Label":"MP","gauge2Color1":"#4080c0","gauge2Color2":"#40c0f0","gauge3Label":"TP","gauge3Color1":"#40c040","gauge3Color2":"#80f080","positionX":10,"positionY":null,"width":300,"gaugeHeight":12,"showLabels":"false","showValues":"true","dataSource":"custom","windowName":"Sample"}
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
