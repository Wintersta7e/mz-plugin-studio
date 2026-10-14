// ==== case: base {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: databaseType=$dataActors {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: databaseType=$dataClasses {"tagFormat":"simple","valueType":"number","databaseType":"$dataClasses","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Classes ($dataClasses)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataClasses) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: databaseType=$dataSkills {"tagFormat":"simple","valueType":"number","databaseType":"$dataSkills","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Skills ($dataSkills)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataSkills) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: databaseType=$dataItems {"tagFormat":"simple","valueType":"number","databaseType":"$dataItems","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Items ($dataItems)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataItems) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: databaseType=$dataWeapons {"tagFormat":"simple","valueType":"number","databaseType":"$dataWeapons","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Weapons ($dataWeapons)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataWeapons) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: databaseType=$dataArmors {"tagFormat":"simple","valueType":"number","databaseType":"$dataArmors","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Armors ($dataArmors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataArmors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: databaseType=$dataEnemies {"tagFormat":"simple","valueType":"number","databaseType":"$dataEnemies","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Enemies ($dataEnemies)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataEnemies) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: databaseType=$dataStates {"tagFormat":"simple","valueType":"number","databaseType":"$dataStates","tagName":"Sample"}
// Notetag Parser: Sample
// Database: States ($dataStates)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataStates) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: databaseType=$dataTilesets {"tagFormat":"simple","valueType":"number","databaseType":"$dataTilesets","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Tilesets ($dataTilesets)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataTilesets) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: databaseType=$dataCommonEvents {"tagFormat":"simple","valueType":"number","databaseType":"$dataCommonEvents","tagName":"Sample"}
// Notetag Parser: Sample
// Database: CommonEvents ($dataCommonEvents)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataCommonEvents) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: databaseType=$dataMapInfos {"tagFormat":"simple","valueType":"number","databaseType":"$dataMapInfos","tagName":"Sample"}
// Notetag Parser: Sample
// Database: MapInfos ($dataMapInfos)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataMapInfos) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: tagFormat=simple {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: tagFormat=boolean {"tagFormat":"boolean","valueType":"number","databaseType":"$dataActors","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample>
// Presence of tag = true, absence = false

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = regex.test(item.note);
        }
    }
};

// ==== case: tagFormat=keyValue {"tagFormat":"keyValue","valueType":"number","databaseType":"$dataActors","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample key: value>
// Example: <Sample fire: 50>
// Multiple tags allowed per entry

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample\s+(\w+):\s*(.+?)>/gi;
    for (const item of database) {
        if (item) {
            item.meta.sample = {};
            let match;
            while ((match = regex.exec(item.note)) !== null) {
                const key = match[1];
                const value = Number(match[2]);
                item.meta.sample[key] = value;
            }
        }
    }
};

// ==== case: tagFormat=multiline {"tagFormat":"multiline","valueType":"number","databaseType":"$dataActors","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample>content</Sample>
// Example:
// <Sample>
// Multi-line content here
// </Sample>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample>([\s\S]*?)<\/Sample>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = match[1].trim();
            }
        }
    }
};

// ==== case: valueType=number {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: valueType=string {"tagFormat":"simple","valueType":"string","databaseType":"$dataActors","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = "";
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = String(match[1]).trim();
            }
        }
    }
};

// ==== case: valueType=boolean {"tagFormat":"simple","valueType":"boolean","databaseType":"$dataActors","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = false;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = match[1].toLowerCase() === 'true';
            }
        }
    }
};

// ==== case: valueType=array {"tagFormat":"simple","valueType":"array","databaseType":"$dataActors","tagName":"Sample"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = [];
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = match[1].split(',').map(s => s.trim());
            }
        }
    }
};

// ==== case: propertyName=empty {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","propertyName":""}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: defaultValue=empty {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","defaultValue":""}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: tagName=comment-space {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Tag Name must start with a letter or underscore and contain only letters, numbers, and underscores
// Notetag Parser: X */ globalThis.__pwn = 1; /* Y
// Database: Actors ($dataActors)
// Access via: item.meta.x */ globalThis.__pwn = 1; /* Y
//
// Usage: <X */ globalThis.__pwn = 1; /* Y: value>
// Example: <X */ globalThis.__pwn = 1; /* Y: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processX */ globalThis.__pwn = 1; /* YNotetags(object);
    }
};

DataManager.processX */ globalThis.__pwn = 1; /* YNotetags = function(database) {
    const regex = /<X */ globalThis.__pwn = 1; /* Y:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.x */ globalThis.__pwn = 1; /* Y = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.x */ globalThis.__pwn = 1; /* Y = Number(match[1]);
            }
        }
    }
};

// ==== case: tagName=comment-u2028 {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Tag Name must start with a letter or underscore and contain only letters, numbers, and underscores
// Notetag Parser: X */ globalThis.__pwn = 1; /* Y
// Database: Actors ($dataActors)
// Access via: item.meta.x */ globalThis.__pwn = 1; /* Y
//
// Usage: <X */ globalThis.__pwn = 1; /* Y: value>
// Example: <X */ globalThis.__pwn = 1; /* Y: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processX */ globalThis.__pwn = 1; /* YNotetags(object);
    }
};

DataManager.processX */ globalThis.__pwn = 1; /* YNotetags = function(database) {
    const regex = /<X */ globalThis.__pwn = 1; /* Y:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.x */ globalThis.__pwn = 1; /* Y = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.x */ globalThis.__pwn = 1; /* Y = Number(match[1]);
            }
        }
    }
};

// ==== case: tagName=comment-u2029 {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Tag Name must start with a letter or underscore and contain only letters, numbers, and underscores
// Notetag Parser: X */ globalThis.__pwn = 1; /* Y
// Database: Actors ($dataActors)
// Access via: item.meta.x */ globalThis.__pwn = 1; /* Y
//
// Usage: <X */ globalThis.__pwn = 1; /* Y: value>
// Example: <X */ globalThis.__pwn = 1; /* Y: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processX */ globalThis.__pwn = 1; /* YNotetags(object);
    }
};

DataManager.processX */ globalThis.__pwn = 1; /* YNotetags = function(database) {
    const regex = /<X */ globalThis.__pwn = 1; /* Y:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.x */ globalThis.__pwn = 1; /* Y = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.x */ globalThis.__pwn = 1; /* Y = Number(match[1]);
            }
        }
    }
};

// ==== case: tagName=comment-lf {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Tag Name must start with a letter or underscore and contain only letters, numbers, and underscores
// Notetag Parser: X */
globalThis.__pwn = 1; /* Y
// Database: Actors ($dataActors)
// Access via: item.meta.x */
globalThis.__pwn = 1; /* Y
//
// Usage: <X */
globalThis.__pwn = 1; /* Y: value>
// Example: <X */
globalThis.__pwn = 1; /* Y: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processX */
globalThis.__pwn = 1; /* YNotetags(object);
    }
};

DataManager.processX */
globalThis.__pwn = 1; /* YNotetags = function(database) {
    const regex = /<X */
globalThis.__pwn = 1; /* Y:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.x */
globalThis.__pwn = 1; /* Y = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.x */
globalThis.__pwn = 1; /* Y = Number(match[1]);
            }
        }
    }
};

// ==== case: tagName=quote-single {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Tag Name must start with a letter or underscore and contain only letters, numbers, and underscores
// Notetag Parser: X' + (globalThis.__pwn = 1) + 'Y
// Database: Actors ($dataActors)
// Access via: item.meta.x' + (globalThis.__pwn = 1) + 'Y
//
// Usage: <X' + (globalThis.__pwn = 1) + 'Y: value>
// Example: <X' + (globalThis.__pwn = 1) + 'Y: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processX' + (globalThis.__pwn = 1) + 'YNotetags(object);
    }
};

DataManager.processX' + (globalThis.__pwn = 1) + 'YNotetags = function(database) {
    const regex = /<X' + (globalThis.__pwn = 1) + 'Y:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.x' + (globalThis.__pwn = 1) + 'Y = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.x' + (globalThis.__pwn = 1) + 'Y = Number(match[1]);
            }
        }
    }
};

// ==== case: tagName=quote-double {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Tag Name must start with a letter or underscore and contain only letters, numbers, and underscores
// Notetag Parser: X" + (globalThis.__pwn = 1) + "Y
// Database: Actors ($dataActors)
// Access via: item.meta.x" + (globalThis.__pwn = 1) + "Y
//
// Usage: <X" + (globalThis.__pwn = 1) + "Y: value>
// Example: <X" + (globalThis.__pwn = 1) + "Y: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processX" + (globalThis.__pwn = 1) + "YNotetags(object);
    }
};

DataManager.processX" + (globalThis.__pwn = 1) + "YNotetags = function(database) {
    const regex = /<X" + (globalThis.__pwn = 1) + "Y:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.x" + (globalThis.__pwn = 1) + "Y = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.x" + (globalThis.__pwn = 1) + "Y = Number(match[1]);
            }
        }
    }
};

// ==== case: tagName=quote-backtick {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Tag Name must start with a letter or underscore and contain only letters, numbers, and underscores
// Notetag Parser: X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y
// Database: Actors ($dataActors)
// Access via: item.meta.x${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y
//
// Usage: <X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y: value>
// Example: <X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processX${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `YNotetags(object);
    }
};

DataManager.processX${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `YNotetags = function(database) {
    const regex = /<X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.x${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.x${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y = Number(match[1]);
            }
        }
    }
};

// ==== case: propertyName=comment-space {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","propertyName":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Property Name must be a valid JavaScript identifier
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.X */ globalThis.__pwn = 1; /* Y
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.X */ globalThis.__pwn = 1; /* Y = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.X */ globalThis.__pwn = 1; /* Y = Number(match[1]);
            }
        }
    }
};

// ==== case: propertyName=comment-u2028 {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","propertyName":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Property Name must be a valid JavaScript identifier
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.X */ globalThis.__pwn = 1; /* Y
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.X */ globalThis.__pwn = 1; /* Y = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.X */ globalThis.__pwn = 1; /* Y = Number(match[1]);
            }
        }
    }
};

// ==== case: propertyName=comment-u2029 {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","propertyName":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Property Name must be a valid JavaScript identifier
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.X */ globalThis.__pwn = 1; /* Y
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.X */ globalThis.__pwn = 1; /* Y = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.X */ globalThis.__pwn = 1; /* Y = Number(match[1]);
            }
        }
    }
};

// ==== case: propertyName=comment-lf {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","propertyName":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Property Name must be a valid JavaScript identifier
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.X */
globalThis.__pwn = 1; /* Y
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.X */
globalThis.__pwn = 1; /* Y = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.X */
globalThis.__pwn = 1; /* Y = Number(match[1]);
            }
        }
    }
};

// ==== case: propertyName=quote-single {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","propertyName":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Property Name must be a valid JavaScript identifier
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.X' + (globalThis.__pwn = 1) + 'Y
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.X' + (globalThis.__pwn = 1) + 'Y = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.X' + (globalThis.__pwn = 1) + 'Y = Number(match[1]);
            }
        }
    }
};

// ==== case: propertyName=quote-double {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","propertyName":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Property Name must be a valid JavaScript identifier
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.X" + (globalThis.__pwn = 1) + "Y
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.X" + (globalThis.__pwn = 1) + "Y = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.X" + (globalThis.__pwn = 1) + "Y = Number(match[1]);
            }
        }
    }
};

// ==== case: propertyName=quote-backtick {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","propertyName":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Property Name must be a valid JavaScript identifier
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta.X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y = Number(match[1]);
            }
        }
    }
};

// ==== case: defaultValue=comment-space {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","defaultValue":"X */ globalThis.__pwn = 1; /* Y"}
// rejects: Default value for number type must be a valid number
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = NaN;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: defaultValue=comment-u2028 {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","defaultValue":"X */\u2028globalThis.__pwn = 1; /* Y"}
// rejects: Default value for number type must be a valid number
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = NaN;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: defaultValue=comment-u2029 {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","defaultValue":"X */\u2029globalThis.__pwn = 1; /* Y"}
// rejects: Default value for number type must be a valid number
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = NaN;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: defaultValue=comment-lf {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","defaultValue":"X */\nglobalThis.__pwn = 1; /* Y"}
// rejects: Default value for number type must be a valid number
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = NaN;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: defaultValue=quote-single {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","defaultValue":"X' + (globalThis.__pwn = 1) + 'Y"}
// rejects: Default value for number type must be a valid number
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = NaN;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: defaultValue=quote-double {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","defaultValue":"X\" + (globalThis.__pwn = 1) + \"Y"}
// rejects: Default value for number type must be a valid number
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = NaN;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: defaultValue=quote-backtick {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","defaultValue":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// rejects: Default value for number type must be a valid number
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = NaN;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = Number(match[1]);
            }
        }
    }
};

// ==== case: valueType=string,defaultValue=comment-space {"tagFormat":"simple","valueType":"string","databaseType":"$dataActors","tagName":"Sample","defaultValue":"X */ globalThis.__pwn = 1; /* Y"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 'X */ globalThis.__pwn = 1; /* Y';
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = String(match[1]).trim();
            }
        }
    }
};

// ==== case: valueType=string,defaultValue=comment-u2028 {"tagFormat":"simple","valueType":"string","databaseType":"$dataActors","tagName":"Sample","defaultValue":"X */\u2028globalThis.__pwn = 1; /* Y"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 'X */\u2028globalThis.__pwn = 1; /* Y';
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = String(match[1]).trim();
            }
        }
    }
};

// ==== case: valueType=string,defaultValue=comment-u2029 {"tagFormat":"simple","valueType":"string","databaseType":"$dataActors","tagName":"Sample","defaultValue":"X */\u2029globalThis.__pwn = 1; /* Y"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 'X */\u2029globalThis.__pwn = 1; /* Y';
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = String(match[1]).trim();
            }
        }
    }
};

// ==== case: valueType=string,defaultValue=comment-lf {"tagFormat":"simple","valueType":"string","databaseType":"$dataActors","tagName":"Sample","defaultValue":"X */\nglobalThis.__pwn = 1; /* Y"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 'X */\nglobalThis.__pwn = 1; /* Y';
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = String(match[1]).trim();
            }
        }
    }
};

// ==== case: valueType=string,defaultValue=quote-single {"tagFormat":"simple","valueType":"string","databaseType":"$dataActors","tagName":"Sample","defaultValue":"X' + (globalThis.__pwn = 1) + 'Y"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 'X\' + (globalThis.__pwn = 1) + \'Y';
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = String(match[1]).trim();
            }
        }
    }
};

// ==== case: valueType=string,defaultValue=quote-double {"tagFormat":"simple","valueType":"string","databaseType":"$dataActors","tagName":"Sample","defaultValue":"X\" + (globalThis.__pwn = 1) + \"Y"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 'X" + (globalThis.__pwn = 1) + "Y';
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = String(match[1]).trim();
            }
        }
    }
};

// ==== case: valueType=string,defaultValue=quote-backtick {"tagFormat":"simple","valueType":"string","databaseType":"$dataActors","tagName":"Sample","defaultValue":"X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y"}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//
// Usage: <Sample: value>
// Example: <Sample: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
    const regex = /<Sample:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta.sample = 'X${globalThis.__pwn = 1}` + (globalThis.__pwn = 1) + `Y';
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = String(match[1]).trim();
            }
        }
    }
};
