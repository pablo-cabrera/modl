(function(global) {
    "use strict";

    var root = (typeof exports !== "undefined" && global.exports !== exports) ? process.cwd() + "/" : "../",
        modl = global.modl || require(root + "/lib/modl");

    modl.exports(function(module) {});
}(this));