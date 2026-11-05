// ==== case: type-violating: wrong types {"databaseType":7,"tagName":42,"tagFormat":7,"valueType":7,"propertyName":42,"defaultValue":42}
// rejects: Field "Database" must be text | Field "Tag Name" must be text | Field "Tag Format" must be text | Field "Value Type" must be text | Field "Property Name" must be text | Field "Default Value" must be text
// throws: TypeError

// ==== case: type-violating: null {"databaseType":null,"tagName":null,"tagFormat":null,"valueType":null,"propertyName":null,"defaultValue":null}
// rejects: Field "Database" is required | Field "Tag Name" is required
// throws: TypeError

// ==== case: type-violating: arrays {"databaseType":["a","b"],"tagName":["a","b"],"tagFormat":["a","b"],"valueType":["a","b"],"propertyName":["a","b"],"defaultValue":["a","b"]}
// rejects: Field "Database" must be text | Field "Tag Name" must be text | Field "Tag Format" must be text | Field "Value Type" must be text | Field "Property Name" must be text | Field "Default Value" must be text
// throws: TypeError

// ==== case: type-violating: propertyName=null {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","propertyName":null}
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

// ==== case: type-violating: tagName=null,defaultValue=null {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":null,"defaultValue":null}
// rejects: Field "Tag Name" is required
// Notetag Parser: null
// Database: Actors ($dataActors)
// Access via: item.meta.
//
// Usage: <null: value>
// Example: <null: 50>

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processNotetags(object);
    }
};

DataManager.processNotetags = function(database) {
    const regex = /<null:\s*(.+?)>/i;
    for (const item of database) {
        if (item) {
            item.meta. = 0;
            const match = item.note.match(regex);
            if (match) {
                item.meta. = Number(match[1]);
            }
        }
    }
};

// ==== case: type-violating: tagName="note",tagFormat="boolean",propertyName=null {"tagFormat":"boolean","valueType":"number","databaseType":"$dataActors","tagName":"note","propertyName":null}
// rejects: "note" may conflict with existing properties. Consider a more unique name.
// Notetag Parser: note
// Database: Actors ($dataActors)
// Access via: item.meta.note
//
// Usage: <note>
// Presence of tag = true, absence = false

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processNoteNotetags(object);
    }
};

DataManager.processNoteNotetags = function(database) {
    const regex = /<note>/i;
    for (const item of database) {
        if (item) {
            item.meta.note = regex.test(item.note);
        }
    }
};

// ==== case: type-violating: tagFormat="keyValue",propertyName="bonus",defaultValue=null {"tagFormat":"keyValue","valueType":"number","databaseType":"$dataActors","tagName":"Sample","propertyName":"bonus","defaultValue":null}
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.bonus
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
            item.meta.bonus = {};
            let match;
            while ((match = regex.exec(item.note)) !== null) {
                const key = match[1];
                const value = Number(match[2]);
                item.meta.bonus[key] = value;
            }
        }
    }
};

// ==== case: type-violating: tagFormat="multiline",valueType="boolean",defaultValue="yes" {"tagFormat":"multiline","valueType":"boolean","databaseType":"$dataActors","tagName":"Sample","defaultValue":"yes"}
// rejects: Default value for boolean type must be true or false
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
            item.meta.sample = false;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = match[1].trim();
            }
        }
    }
};

// ==== case: type-violating: valueType="array",defaultValue="1, 2",propertyName=null {"tagFormat":"simple","valueType":"array","databaseType":"$dataActors","tagName":"Sample","defaultValue":"1, 2","propertyName":null}
// rejects: Default value for array type should be in JSON format starting with [
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

// ==== case: type-violating: tagFormat=7 {"tagFormat":7,"valueType":"number","databaseType":"$dataActors","tagName":"Sample"}
// rejects: Field "Tag Format" must be text
// Notetag Parser: Sample
// Database: Actors ($dataActors)
// Access via: item.meta.sample
//

const _DataManager_onLoad = DataManager.onLoad;
DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object === $dataActors) {
        this.processSampleNotetags(object);
    }
};

DataManager.processSampleNotetags = function(database) {
};

// ==== case: type-violating: valueType=7 {"tagFormat":"simple","valueType":7,"databaseType":"$dataActors","tagName":"Sample"}
// rejects: Field "Value Type" must be text
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
            item.meta.sample = null;
            const match = item.note.match(regex);
            if (match) {
                item.meta.sample = match[1];
            }
        }
    }
};

// ==== case: type-violating: valueType="number",defaultValue="abc" {"tagFormat":"simple","valueType":"number","databaseType":"$dataActors","tagName":"Sample","defaultValue":"abc"}
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
