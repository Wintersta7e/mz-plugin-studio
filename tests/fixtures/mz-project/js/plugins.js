var $plugins =
[
{"name":"Fixture_HandWritten","status":true,"description":"Hand-written fixture plugin with a licence preamble.","parameters":{"Speed":"5","Label":"Hello","Origin":"{\"x\":\"0\",\"y\":\"0\"}"}},
{"name":"Fixture_HandWritten_CRLF","status":false,"description":"Hand-written fixture plugin with a licence preamble.","parameters":{"Speed":"5","Label":"Hello","Origin":"{\"x\":\"0\",\"y\":\"0\"}"}},
{"name":"Fixture_Bom","status":true,"description":"Fixture plugin saved with a byte order mark.","parameters":{"Volume":"90","Prefix":"Bom","Offset":"{\"pan\":\"0\",\"pitch\":\"100\"}"}},
{"name":"Fixture_JaFirst","status":true,"description":"Fixture plugin whose Japanese block comes first.","parameters":{"Limit":"3","Caption":"Steps","Area":"{\"width\":\"5\",\"height\":\"5\"}"}},
{"name":"Fixture_EnJaOnly","status":true,"description":"Fixture plugin with English and Japanese blocks only.","parameters":{"Rate":"2","Title":"Status","Frame":"{\"thickness\":\"2\",\"color\":\"#ffffff\"}"}},
{"name":"Fixture_Structs","status":true,"description":"Struct fixture whose lists close with ];","parameters":{"Entries":"[\"{\\\"label\\\":\\\"First\\\",\\\"weight\\\":\\\"1\\\"}\"]","Highlight":"{\"red\":\"255\",\"green\":\"224\",\"blue\":\"128\"}","Count":"4","Heading":"Entries"}},
{"name":"Fixture_NoIife","status":true,"description":"Fixture plugin written without a wrapping function.","parameters":{"Step":"2","Title":"Fixture","Start":"{\"mapId\":\"1\",\"x\":\"0\",\"y\":\"0\"}"}},
{"name":"Fixture_Require","status":true,"description":"Fixture plugin that declares the assets it needs.","parameters":{"Picture":"FixturePicture","Opacity":"255","Caption":"Fixture","Anchor":"{\"x\":\"408\",\"y\":\"312\"}"}},
{"name":"Fixture_NonAscii","status":true,"description":"Fixture plugin with non-ASCII text — café, naïve, 日本語 ★","parameters":{"Pause":"30","Greeting":"こんにちは","Symbol":"{\"char\":\"★\",\"size\":\"28\"}"}},
{"name":"Fixture_Dependent","status":true,"description":"Fixture plugin that builds on Fixture_HandWritten.","parameters":{"Delay":"60","Badge":"New","Placement":"{\"x\":\"16\",\"y\":\"16\"}"}},
{"name":"Fixture_Generated","status":true,"description":"Generated fixture plugin","parameters":{"Speed":"5","Label":"Hello","Points":"[]"}}
];
