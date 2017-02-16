var xlsx = require('xlsx');
const jsxml = require("node-jsxml");
var Namespace = jsxml.Namespace,
    QName = jsxml.QName,
    XML = jsxml.XML,
    XMLList = jsxml.XMLList;
var fs = require('fs');
var unserialize = require('php-unserialize').unserialize;
var serialize = require('js-php-serialize').serialize;

var fileDictionaryName = "./data/dictionary.xlsx";
var fileExportedContentsName = "./data/exported-contents.xml";
var workbook = xlsx.readFile(fileDictionaryName);

var sheetName = workbook.SheetNames[0];
var worksheet = workbook.Sheets[sheetName];

var dictionary = xlsx.utils.sheet_to_row_object_array(worksheet);

fs.readFile(fileExportedContentsName, 'utf-8', function(error, data) {
    var xml = new XML(data);
    var ns = xml.namespace("wp");

    var nsNew = new Namespace("wp", 'http://wordpress.org/export/1.2/');
    xml.addNamespace(nsNew);
    // var child = xml.child('channel');
    var postItems = xml.descendants('item');
    var count = 0;
    postItems.each(function(item, index) {
        var postMetas = item.descendants('postmeta');
        postMetas.each(function(postMeta) {
            var metaValueElement = postMeta.child('meta_value');
            var metaValueRaw;
            var metaValueData;
            if (metaValueElement && metaValueElement.length() > 0) {
                var metaValueRaw = metaValueElement.getValue();
                try {
                    metaValueData = unserialize(metaValueRaw);
                    var translatedLabel = tranlsate(metaValueData.label);
                    var translatedDefaultValue = tranlsate(metaValueData.default_value);
                    if (translatedLabel) {
                        metaValueData.label = translatedLabel;
                    }
                    if (translatedDefaultValue) {
                        metaValueData.default_value = translatedDefaultValue;
                    }
                    if (translatedLabel || translatedDefaultValue) {
                        count++;
                        var serializedData = serialize(metaValueData)
                        metaValueElement.setValue(serializedData);
                    }
                } catch (e) {
                    try {
                        var translated = tranlsate(metaValueRaw);
                        metaValueElement.setValue(translated);
                    } catch (ee) {

                    }
                }
            }
        })
    })
    console.log('tranlsated', count);
    fs.writeFile('./data/output.xml', xml.toXMLString());
    console.log("DONE!")
});
// RegExp.escape = function(string) {
//     return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
// };

function tranlsate(sourceText) {
    if (sourceText) {
        var translated = "";
        var sources = sourceText.split('\n');

        var translates = [];
        sources.forEach(function(line) {
            // if (line.indexOf("This training will be di") > -1) {
            //     debugger;
            // }
            dictionary.forEach(function(item) {
                var english = item.ENGLISH && item.ENGLISH.trim();
                var translation = item.TRANSLATION && item.TRANSLATION.trim();
                // if (line.indexOf("This training will be di") > -1 && english.indexOf("This training will be di") > -1) {
                //     debugger;
                // }
                if (english && translation) {
                    var pattern = english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    var reg = new RegExp(pattern, 'ig');
                    line = line.replace(english, translation);
                }
            });
            translates.push(line);
        })
        translated += translates.join('\n');
        return translated;
    }
    return "";
}

function search(keyword) {
    if (keyword) {
        // console.log("Search for " + keyword)
        var result = dictionary.filter(function(item) {
            return (item.ENGLISH && keyword && item.ENGLISH.toLowerCase() === keyword.toLowerCase())
        });
        return result && result.length > 0 && result[0].TRANSLATION;
    }
}

function tryParseJSON(jsonString) {
    try {
        var o = JSON.parse(jsonString);
        // Handle non-exception-throwing cases:
        // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
        // but... JSON.parse(null) returns null, and typeof null === "object", 
        // so we must check for that, too. Thankfully, null is falsey, so this suffices:
        if (o && typeof o === "object") {
            return o;
        }
    } catch (e) {}
    return false;
};