(function(global) {
    "use strict";

    var modl = {
        root : function() {
        },

        require : function(resource, alias) {
        },

        run : function(payload) {
        }
    };

    if (typeof exports !== 'undefined' && global.exports !== exports) {
        module.exports = modl;
    } else {
        global.modl = modl;
    }

}(this));