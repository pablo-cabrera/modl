(function(global) {
    "use strict";

    var node = (typeof exports !== "undefined" && global.exports !== exports),
        modl = node ? require(process.cwd() + "/lib/modl") : global.modl;

    modl.exports(function(modl) {
        modl.exports.name = "LocalAsset";
    });
}(this));