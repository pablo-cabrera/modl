(function(node) {
    "use strict";

    var
        main = node? global: window,
        YUITest = main.YUITest || require("yuitest"),
        root = node? process.cwd() + "/": "../",
        Assert = YUITest.Assert,
        modl = (function() {
            if (node) {
                require(root + "/lib/modl");
            }

            return main.modl;
        }()),

        util = modl.Util,

        resume = function(f) {
            return function() {
                var args = Array.prototype.slice.call(arguments);
                test.resume(function() {
                    return f.apply(test, args);
                });
            };
        },

        setup = function(f) {
            return function() {
                modl.setup({ "root": root + "test-runner" });

                f();
            };
        },

        uncaughtExceptionListeners = node? util.slice(process.listeners("uncaughtException")): null,

        catchAll = node?
                function(f) {
                    process.removeAllListeners("uncaughtException");
                    process.on("uncaughtException", function(e) { f(e.toString()); });
                }:
                function(f) {
                    main.onerror = function(e) {
                        try {
                            f(e);
                        } finally {
                            return true;
                        }
                    };
                },

        test = new YUITest.TestCase({

            name: "modl-test",

            _should: {
                error: {
                    "should break when there are 2 aliases with the same name" : "Alias clash: x",
                    "bilbo should fail when trying to grab something that isn't there": "Couldn't find stuff: yo momma's ass"
                }
            },

            tearDown: function () {
                if (node) {
                    process.removeAllListeners("uncaughtException");
                    uncaughtExceptionListeners.forEach(function(l) {
                        process.on("uncaughtException", l);
                    });
                } else {
                    main.onerror = null;
                }
            },

            "should have a module object as first argument": setup(function() {
                modl.
                unit(function(module) {
                    Assert.isObject(module);
                    Assert.isObject(module.exports);
                    Assert.isObject(module.imports);
                });
            }),

            "should load two assets that uses the same asset": setup(function() {
                modl.
                uses("/AssetA").
                uses("/AssetB").
                unit(resume(function(module) {
                    Assert.isObject(module.imports["AssetA"], "No AssetA within imports");
                    Assert.isObject(module.imports["AssetB"], "No AssetB within imports");
                }));

                test.wait();
            }),

            "should load a local asset": setup(function() {
                modl.
                uses("/LocalAsset").
                unit(resume(function(module, localAsset) {
                    Assert.isObject(module.imports["LocalAsset"], "No local asset within imports");
                    Assert.areSame(module.imports["LocalAsset"], localAsset, "No localAsset parameter");
                }));

                test.wait();
            }),

            "should load a single module": setup(function() {
                modl.
                uses("mod-a").
                unit(resume(function(module) {
                    Assert.isObject(module.imports["mod-a"]);
                }));

                test.wait();
            }),

            "should load a module that depends on another module": setup(function() {
                modl.
                uses("mod-b").
                unit(resume(function(module, modB) {
                    Assert.isObject(modB);
                    Assert.areSame("mod-b", modB.name);
                    Assert.isObject(modB["mod-c"], "No mod-c");
                    Assert.areSame("mod-c", modB["mod-c"].name, "Wrong mod-c");
                }));

                test.wait();
            }),

            "should load a module and put into imports using its alias name": setup(function() {
                modl.
                uses("mod-a", "module-a").
                unit(resume(function(module) {
                    Assert.isUndefined(module.imports["mod-a"]);
                    Assert.isObject(module.imports["module-a"]);
                    Assert.areSame("mod-a", module.imports["module-a"].name);
                }));

                test.wait();
            }),

            "should load an asset and put into imports using its alias name": setup(function() {
                modl.
                uses("/LocalAsset", "MyAsset").
                unit(resume(function(module) {
                    Assert.isUndefined(module.imports["LocalAsset"]);
                    Assert.isObject(module.imports["MyAsset"]);
                    Assert.areSame("LocalAsset", module.imports["MyAsset"].name);
                }));

                test.wait();
            }),

            "should break when there are 2 aliases with the same name": setup(function() {
                modl.
                uses("mod-a", "x").
                uses("mod-b", "x").
                unit(function() {
                    Assert.fail("Should not have reached here!");
                });
            }),

            "should reuse a parent loaded module with the same version": setup(function() {
                modl.
                uses("mod-e", "e").
                uses("mod-d", "d").
                unit(resume(function(module) {
                    Assert.areSame("mod-e", module.imports.e.name);
                    Assert.areSame(module.imports.e, module.imports.d.e);
                }));

                test.wait();
            }),

            "should load a concatenated module": setup(function() {
                modl.
                uses("mod-c").
                unit(resume(function(module, c) {
                    Assert.isObject(c);
                    Assert.areSame("mod-c", c.name);
                    Assert.isObject(c.d);
                    Assert.areSame("mod-d", c.d.name);
                }));

                test.wait();
            }),

            "should load a concatenated module with inner references": setup(function() {
                modl.
                uses("mod-f").
                unit(resume(function(module, f) {
                    Assert.isObject(f);

                    Assert.areSame("mod-f", f.name);

                    Assert.areSame("mod-g", f.g.name);
                    Assert.areSame("mod-h", f.h.name);
                    Assert.areSame(f.g, f.h.g);
                }));

                test.wait();
            }),

            "should load a concatenated module with more inner references": setup(function() {
                modl.
                uses("mod-g").
                unit(resume(function(module, g) {
                    Assert.areSame("foo", g.name);
                    Assert.areSame("foo-Thing", g.Thing.name);
                    Assert.areSame("foo-AnotherThing", g.AnotherThing.name);
                    Assert.areSame(g.Thing, g.AnotherThing.Thing);

                    Assert.areSame("bar", g.bar.name);
                    Assert.areSame("bar-Thing", g.bar.Thing.name);
                    Assert.areSame("bar-AnotherThing", g.bar.AnotherThing.name);
                    Assert.areSame(g.bar.Thing, g.bar.AnotherThing.Thing);
                    Assert.areSame(g.baz, g.bar.baz);

                    Assert.areSame("baz", g.baz.name);
                    Assert.areSame("baz-Thing", g.baz.Thing.name);
                    Assert.areSame("baz-AnotherThing", g.baz.AnotherThing.name);
                    Assert.areSame(g.baz.Thing, g.baz.AnotherThing.Thing);



                }));

                test.wait();
            }),

            "should handle a concatenated module": setup(function() {
                modl.$module({
                    "/module": function() {
                        modl.unit(function(module) {
                            Assert.pass();
                        });
                    }
                });
            }),

            "should handle a concatenated module with local assets": setup(function() {

                modl.$module({
                    "/module": function() {
                        modl.
                        uses("/SomeAsset").
                        unit(function(module, asset) {
                            Assert.areSame("SomeAsset", asset.name);
                        });
                    },

                    "/SomeAsset": function() {
                        modl.
                        unit(function(module) {
                            module.exports.name = "SomeAsset";
                        });
                    }
                });
            }),

            "should handle a concatenated module with inner references": setup(function() {
                modl.$module({
                    "/module": function() {
                        modl.
                        uses("some-crap").
                        unit(function(module, someCrap) {
                            Assert.areSame("some-crap", someCrap.name);
                        });

                    },

                    "some-crap": {
                        "/module": function() {
                            modl.
                            unit(function(module) {
                                module.exports.name = "some-crap";
                            });
                        }
                    }
                });
            }),

            "should fail when an error is thrown within the unit": setup(function() {
                catchAll(resume(function(e) {
                    Assert.areSame("Error: fail", e);
                }));

                modl.
                unit(function() {
                    throw new Error("fail");
                });

                test.wait();
            }),

            "should fail when an error is thrown within the unit of a local asset": setup(function() {
                catchAll(resume(function(e) {
                    Assert.areSame("Error: Fucked up", e);
                }));

                modl.
                uses("/Throw").
                unit(resume(function() {
                    Assert.fail();
                }));

                test.wait();
            }),

            /* modl.Bilbo tests */

            "bilbo should create a new bag": function() {
                var bag = modl.Bilbo.bag();
                Assert.isObject(bag);
            },

            "bilbo should get rid of the bag": function() {
                var bag = modl.Bilbo.bag();
                bag.vanish();

                var newBag = modl.Bilbo.bag();
                Assert.areNotSame(bag, newBag);
            },

            "bilbo should get a different bag for a different name": function() {
                var bagX = modl.Bilbo.bag("x");
                var bagY = modl.Bilbo.bag("y");

                Assert.areNotSame(bagX, bagY);
            },

            "bilbo should fail when trying to grab something that isn't there": function() {
                var bag = modl.Bilbo.bag();
                bag.grab("yo momma's ass");
            },

            "bilbo should grab a stored stuff": function() {
                var o = {};
                var bag = modl.Bilbo.bag();
                bag.stuff("a", o);
                Assert.areSame(o, bag.grab("a"));
            },

            "bilbo should grab a new object that has a stored object as prototype": function() {
                var o = { a: {}};
                var bag = modl.Bilbo.bag();
                bag.prototype("a", o);
                var o2 = bag.grab("a");

                Assert.areSame(o.a, o2.a);
                Assert.isFalse(o2.hasOwnProperty("a"));
            },

            "bilbo should grab a new stuff created by a stored factory": function() {
                var arg1 = {},
                    arg2 = {},
                    o,
                    factory = function(a1, a2) {
                        o = {};
                        Assert.areSame(a1, arg1);
                        Assert.areSame(a2, arg2);
                        return o;
                    };

                var bag = modl.Bilbo.bag();
                bag.factory("a", factory);
                var o2 = bag.grab("a", arg1, arg2);
                Assert.areSame(o, o2);
            },

            "bilbo should grab a new stuff created by a stored lazy function, that should be called just once": function() {
                var arg1 = {},
                    arg2 = {},
                    o,
                    count = 0,
                    lazy = function(a1, a2) {
                        o = {};
                        Assert.areSame(a1, arg1);
                        Assert.areSame(a2, arg2);
                        count += 1;
                        return o;
                    };

                var bag = modl.Bilbo.bag();
                bag.lazy("a", lazy);

                var o2 = bag.grab("a", arg1, arg2);
                var o3 = bag.grab("a", arg1, arg2);

                Assert.areSame(o, o2);
                Assert.areSame(o2, o3);
                Assert.areSame(1, count);
            },

            "bilbo shoud grab a new stuff using the stored function as a constructor for it": function() {
                var T = function() {};

                var bag = modl.Bilbo.bag();
                bag.type("a", T);
                var a = bag.grab("a");
                var b = bag.grab("a");

                Assert.isInstanceOf(T, a);
                Assert.isInstanceOf(T, b);

                Assert.areNotSame(a, b);
            },

            "bilbo shoud grab a new stuff using the stored function as a constructor for the singleton": function() {
                var T = function() {};

                var bag = modl.Bilbo.bag();
                bag.singleton("a", T);
                var a = bag.grab("a");
                var b = bag.grab("a");

                Assert.isInstanceOf(T, a);
                Assert.isInstanceOf(T, b);

                Assert.areSame(a, b);
            },

            "bilbo should allow to create a bag outside of modl.Bilbo and tell him to keep it": function() {
                var bag = new modl.Bilbo.Bag("a");
                modl.Bilbo.keep(bag);
                Assert.areSame(bag, modl.Bilbo.bag("a"));
            },

            "bilbo should create a mocking bag that creates and stores an object when it cannot be found within": function() {
                var bag = modl.Bilbo.mockingBag();
                var o = bag.grab("yolo");

                Assert.isObject(o);
                Assert.areSame(o, bag.grab("yolo"));
            },

            dummy: undefined

        });

    YUITest.TestRunner.add(test);
}(typeof exports !== "undefined" && global.exports !== exports));