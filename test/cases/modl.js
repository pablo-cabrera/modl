(function (node) {
    "use strict";

    var main;
    var gabarito;
    var parts;
    var modl;
    var root;

    if (node) {
        root = process.cwd() + "/";
        main = global;
        gabarito = require("gabarito");
        parts = require("parts");
        modl = require(root + "/lib/modl");
    } else {
        main = window;
        gabarito = main.gabarito;
        parts = main.parts;
        modl = main.modl;
        root = "/r/";
    }

    var assert = gabarito.assert;

    gabarito.add(parts.make()

    ("name", "modl-test")

    ("before", function () {
        modl.setup({ "root": root + "test/fixtures"});
    })

    ("should have a module object as first argument", function () {
        modl.
        unit(function (module) {
            assert.isObject(module);
            assert.isObject(module.exports);
            assert.isObject(module.imports);
        });
    })

    ("should load two assets that uses the same asset", function () {
        modl.
        uses("/AssetA").
        uses("/AssetB").
        unit(gabarito.going(function (module) {
            assert.isObject(module.imports["AssetA"],
                    "No AssetA within imports");
            assert.isObject(module.imports["AssetB"],
                    "No AssetB within imports");
        }));

        gabarito.stay();
    })

    ("should load a local asset", function () {
        modl.
        uses("/LocalAsset").
        unit(gabarito.going(function (module, localAsset) {
            assert.isObject(module.imports["LocalAsset"],
                    "No local asset within imports");
            assert.areSame(module.imports["LocalAsset"], localAsset,
                    "No localAsset parameter");
        }));
        gabarito.stay();
    })

    ("should load a single module", function () {
        modl.
        uses("mod-a").
        unit(gabarito.going(function (module) {
            assert.isObject(module.imports["mod-a"]);
        }));

        gabarito.stay();
    })

    ("should load a module that depends on another module", function () {
        modl.on("error", function (e) { console.log(e); });

        modl.
        uses("mod-b").
        unit(gabarito.going(function (module, modB) {
            assert.isObject(modB);
            assert.areSame("mod-b", modB.name);
            assert.isObject(modB["mod-c"], "No mod-c");
            assert.areSame("mod-c", modB["mod-c"].name, "Wrong mod-c");
        }));

        gabarito.stay();
    })

    ("should load a module and put into imports using its alias name",
    function () {
        modl.
        uses("mod-a", "module-a").
        unit(gabarito.going(function (module) {
            assert.isUndefined(module.imports["mod-a"]);
            assert.isObject(module.imports["module-a"]);
            assert.areSame("mod-a", module.imports["module-a"].name);
        }));

        gabarito.stay();
    })

    ("should load an asset and put into imports using its alias name",
    function () {
        modl.
        uses("/LocalAsset", "MyAsset").
        unit(gabarito.going(function (module) {
            assert.isUndefined(module.imports["LocalAsset"]);
            assert.isObject(module.imports["MyAsset"]);
            assert.areSame("LocalAsset", module.imports["MyAsset"].name);
        }));

        gabarito.stay();
    })

    ("should break when there are 2 aliases with the same name", function () {
        try {
            modl.
            uses("mod-a", "x").
            uses("mod-b", "x").
            unit(function () {
                assert.fail("Should not have reached here!");
            });
        } catch (e) {
            assert.areSame(e.message, "Alias clash: x");
        }
    })

    ("should reuse a parent loaded module", function () {
        modl.
        uses("mod-e", "e").
        uses("mod-d", "d").
        unit(gabarito.going(function (module) {
            assert.areSame("mod-e", module.imports.e.name);
            assert.areSame(module.imports.e, module.imports.d.e);
        }));

        gabarito.stay();
    })

    ("should load a concatenated module", function () {
        modl.
        uses("mod-c").
        unit(gabarito.going(function (module, c) {
            assert.isObject(c);
            assert.areSame("mod-c", c.name);
            assert.isObject(c.d);
            assert.areSame("mod-d", c.d.name);
        }));

        gabarito.stay();
    })

    ("should load a concatenated module with inner references", function () {
        modl.
        uses("mod-f").
        unit(gabarito.going(function (module, f) {
            assert.isObject(f);

            assert.areSame("mod-f", f.name);

            assert.areSame("mod-g", f.g.name);
            assert.areSame("mod-h", f.h.name);
            assert.areSame(f.g, f.h.g);
        }));

        gabarito.stay();
    })

    ("should load a concatenated module with more inner references",
    function () {
        modl.
        uses("mod-g").
        unit(gabarito.going(function (module, g) {
            assert.areSame("foo", g.name);
            assert.areSame("foo-Thing", g.Thing.name);
            assert.areSame("foo-AnotherThing", g.AnotherThing.name);
            assert.areSame(g.Thing, g.AnotherThing.Thing);

            assert.areSame("bar", g.bar.name);
            assert.areSame("bar-Thing", g.bar.Thing.name);
            assert.areSame("bar-AnotherThing", g.bar.AnotherThing.name);
            assert.areSame(g.bar.Thing, g.bar.AnotherThing.Thing);
            assert.areSame(g.baz, g.bar.baz);

            assert.areSame("baz", g.baz.name);
            assert.areSame("baz-Thing", g.baz.Thing.name);
            assert.areSame("baz-AnotherThing", g.baz.AnotherThing.name);
            assert.areSame(g.baz.Thing, g.baz.AnotherThing.Thing);
        }));

        gabarito.stay();
    })

    ("should handle a concatenated module", function () {
        var run = false;

        modl.$module({
            "/module": function () {
                modl.unit(function (module) {
                    run = true;
                });
            }
        });

        assert.isTrue(run);
    })

    ("should handle a concatenated module with local assets", function () {

        modl.$module({
            "/module": function () {
                modl.
                uses("/SomeAsset").
                unit(function (module, asset) {
                    assert.areSame("SomeAsset", asset.name);
                });
            },

            "/SomeAsset": function () {
                modl.
                unit(function (module) {
                    module.exports.name = "SomeAsset";
                });
            }
        });
    })

    ("should handle a concatenated module with inner references", function () {
        modl.$module({
            "/module": function () {
                modl.
                uses("some-crap").
                unit(function (module, someCrap) {
                    assert.areSame("some-crap", someCrap.name);
                });

            },

            "some-crap": {
                "/module": function () {
                    modl.
                    unit(function (module) {
                        module.exports.name = "some-crap";
                    });
                }
            }
        });
    })

    ("should fail when an error is thrown within the unit", function () {
        var error = new Error("fail");

        modl.on("error", gabarito.going(function (e) {
            assert.areSame(error, e);
        }));

        gabarito.stay();

        modl.
        unit(function () {
            throw error;
        });

    })

    ("should fail when an error is thrown within the unit of a local asset",
    function () {

        modl.on("error", gabarito.going(function (e) {
            assert.areSame("Fucked up", e.message);
        }));

        gabarito.stay();

        modl.
        uses("/Throw").
        unit(gabarito.going(function () {
            throw new Error("Shouldn't reach here");
        }));
    })

    ("dummy", undefined).build());

}(typeof exports !== "undefined" && global.exports !== exports));
