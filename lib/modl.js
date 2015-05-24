(function (node) {
    "use strict";

    var main;
    var parts;
    var ilk;
    if (node) {
        main = global;
        parts = require("parts");
        ilk = require("ilk");
    } else {
        main = window;
        parts = main.parts;
        ilk = main.ilk;
    }

    var Token = ilk.Token;
    var constant = parts.constant;
    var args = parts.args;
    var k = parts.k;
    var work = parts.work;
    var hop = parts.hop;
    var merge = parts.merge;
    var forEach = parts.forEach;
    var map = parts.map;
    var that = parts.that;

    /**
     * The defaults asset for a module
     *
     * @property MODULE_ASSET
     * @for modl
     * @type string
     * @static
     * @private
     * @final
     */
    var MODULE_ASSET = "/module";

    /**
     * The regex to get the alias from the resource name
     *
     * @property ALIAS_RE
     * @for modl
     * @type RegEx
     * @static
     * @private
     * @final
     */
    var ALIAS_RE = /(.*\/)?([^\/]+)$/;

    /**
     * The regex used to remove double (or more) slashes from a path
     *
     * @property PATH_RE
     * @for modl
     * @type RegEx
     * @static
     * @private
     * @final
     */
    var PATH_RE = /\/{2,}/g;

    /**
     * A reference to the undefined value used internally
     *
     * @property undef
     * @for modl
     * @type undefined
     * @static
     * @private
     * @final
     */
    var undef = void 0;

    var hydratedAssets = {};

    /**
     * Array containing all
     *
     * @property node
     * @for modl
     * @type boolean
     * @static
     * @private
     * @final
     */
    var validSettings = ["root"];

    /**
     * Contains current settings for the modl loader
     *
     * @property settings
     * @for modl
     * @type Object
     * @static
     * @private
     */
    var settings = null;

    var listeners;

    /**
     * Points to the current module being loaded
     *
     * @property currentModule
     * @for modl
     * @type modl.Module
     * @static
     * @private
     */
    var currentModule;

    /**
     * Points to the root module
     *
     * @property rootModule
     * @for modl
     * @type modl.Module
     * @static
     * @private
     */
    var rootModule;

    /**
     * Points to the asset being loaded at the moment
     *
     * @property loadingAsset
     * @for modl
     * @type Asset
     * @static
     * @private
     */
    var loadingAsset;

    /**
     * The module reference put within the hydrated modules during module
     * preloading
     *
     * @property MODULE_REFERENCE
     * @for modl
     * @type modl.Module
     * @static
     * @private
     * @final
     */
    var MODULE_REFERENCE = Token.create();

    /**
     * The Ready class provides the functionality of scheduling callbacks
     * for when a given Ready instance is marked as ready
     *
     * @class modl.Ready
     * @constructor
     * @private
     */
    var Ready = Token.tokens(function (
        readyStatus,
        readyCallbacks,

        failStatus,
        failCallbacks,
        failure
    ) {
        return ilk(that(function (t) {
            /**
             * Indicates whether the instance is ready or not
             *
             * @property readyStatus
             * @for modl.Ready
             * @private
             * @type {boolean}
             */
            readyStatus.mark(t, false);

            /**
             * Ready callback functions are stored within this guy
             *
             * @property readyCallbacks
             * @for modl.Ready
             * @private
             * @type {array}
             */
            readyCallbacks.mark(t, []);

            /**
             * Indicates whether the instance has failed or not
             *
             * @property failStatus
             * @for modl.Ready
             * @private
             * @type {boolean}
             */
            failStatus.mark(t, false);

            /**
             * Fail callback functions are stored within this guy
             *
             * @property failCallbacks
             * @for modl.Ready
             * @private
             * @type {array}
             */
            failCallbacks.mark(t, []);

            /**
             * Holds the failure reason
             *
             * @property failure
             * @for modl.Ready
             * @private
             * @type {mixed}
             */
            failure.mark(t);
        })).

        proto({

            /**
             * Schedules an <b>f</b> callback to be executed once the
             * instance is marked as <b>ready</b>
             *
             * @method whenReady
             * @for modl.Ready
             * @param {function} f The callback function to be scheduled
             */
            whenReady: that(function (t, f) {
                if (!t[failStatus]) {
                    if (t[readyStatus]) {
                        f();
                    } else {
                        t[readyCallbacks].push(f);
                    }
                }
            }),

            /**
             * Schedules an <b>f</b> callback to be executed once the
             * instance is marked as <b>failed</b>
             *
             * @method whenFail
             * @for modl.Ready
             * @param {function} f The callback function to be scheduled
             */
            whenFail: that(function (t, f) {
                if (!t[readyStatus]) {
                    if (t[failStatus]) {
                        f(t[failure]);
                    } else {
                        t[failCallbacks].push(f);
                    }
                }
            }),

            /**
             * Marks the instance as <b>ready</b> and runs all it's callbacks
             *
             * @method ready
             * @for modl.Ready
             */
            ready: that(function (t) {
                var callbacks = t[readyCallbacks];
                t[readyStatus] = true;

                t[readyCallbacks] = null;
                t[failCallbacks] = null;
                forEach(callbacks, function (f) { f(); });
            }),

            /**
             * Marks the instance as <b>ready</b> and runs all it's callbacks
             *
             * @method fail
             * @for modl.Ready
             *
             * @param {mixed} reason
             */
            fail: that(function (t, reason) {
                var callbacks = t[failCallbacks];
                t[failStatus] = true;
                t[failure] = reason;

                t[readyCallbacks] = null;
                t[failCallbacks] = null;
                forEach(callbacks, function (f) {
                    try {
                        f(reason);
                    } catch (e) {
                        forEach(listeners["error"], function (f) { f(e); });
                    }
                });
            })

        });
    });

    /**
     * The Asset class represents an script file being loaded within a
     * module.
     *
     * @class modl.Asset
     * @extends modl.Ready
     * @constructor
     * @private
     * @param {string} name It's name
     */
    var Asset = Token.tokens(function (myName) {
        return Ready.descend(that(function (t, name, path) {

            /**
             * The asset's name
             *
             * @property myName
             * @for modl.Asset
             * @type {string}
             * @private
             */
            myName.mark(t, name);

            /**
             * Holds the asset's exports
             *
             * @property exports
             * @for modl.Asset
             * @type {mixed}
             */
            t.exports = undef;

            Ready.call(t);
        })).

        /**
         * Retrieves the asset and loads it
         *
         * @param {string} path It's path
         */
        proto("load", that(function (that, path) {
            loadingAsset = that;
            loadAsset(Asset.path(path, that[myName]), k,
                    function (e) { that.fail(e); });
        })).

        constant("path", function (path, name) {
            return (path + name + ".js").replace(PATH_RE, "/");
        });
    });

    var loadAsset = function (a, s, f) {
        if (hop(hydratedAssets, a)) {
            hydratedAssets[a].call(null);
            s();
        } else {
            loadScript(a, s, f);
        }
    };

    /**
     * Loads a given script.
     *
     * @method loadScript
     * @for modl
     * @static
     * @private
     *
     * @param {string} src The script's src
     * @param {function} success The success callback
     * @param {function} fail The fail callback
     */
    var loadScript = node?
        function (src, success, fail) {
            delete require.cache[src];
            work(function () {
                try {
                    require(src);
                } catch (e) {
                    fail(e);
                }
                success();
            });
        }:
        (function () {

            /**
             * Tracks the loading of a script element. When the script is loaded
             * and run, first the "success" callback
             *
             * @param {HTMLScriptElement} node the "script" node
             * @param {function} success The success callback
             * @param {function} fail The fail callback
             */
            var track = (function () {
                if (/KHTML/.test(navigator.userAgent)) {
                    return function (node, success, error) {
                        node.addEventListener("load",
                                function () { success(); }, false);
                        node.addEventListener("error",
                                function () { error(); }, false);
                    };
                }

                return function (node, success, error) {
                    node.onload = function () { success(); };
                    node.onerror = function () { error(); };
                };
            }());

            return function (src, success, fail) {
                var s = document.createElement("script"),
                    d = document.documentElement;

                track(s, success, fail);

                s.src = src;
                d.insertBefore(s, d.firstChild);
            };
        }());

    /**
     * The Module class represents a module within the module tree. It can
     * load other <b>modules</b>(dependencies contained within
     * <code>node_modules</code> directory) and <b>assets</b> (files
     * referenced within a module).
     *
     * @class modl.Module
     * @extends modl.Ready
     * @constructor
     * @private
     * @param {string} name The module's name
     * @param {string} path The module's path
     * @param {modl.Module} parent The parent module for this one
     * @param {boolean} hydrating Indicates that this module is being hydrated
     *              and should not be initialized automatically
     *
     */
    var Module = Token.tokens(function (
        myName,
        myPath,
        myParent,
        modules,
        assets,
        initialized,

        hydrateAsset,
        hydrateModule,
        hydrateModuleReferences
    ) {

        return Ready.descend(that(function (t, name, path, parent, hydrating) {
            /**
             * It's name
             *
             * @property myName
             * @for modl.Module
             * @private
             * @type {string}
             */
            myName.mark(t, name);

            /**
             * It's path
             *
             * @property myPath
             * @for modl.Module
             * @private
             * @type {string}
             */
            myPath.mark(t, path);

            /**
             * It's parent module
             *
             * @property myParent
             * @for modl.Module
             * @private
             * @type {Module}
             */
            myParent.mark(t, parent);

            /**
             * It's inner modules. This will contain the references for
             * the children modules currently loaded for this module.
             *
             * @property modules
             * @for modl.Module
             * @private
             * @type {object}
             */
            modules.mark(t, {});

            /**
             * It's assets. This will contain the references for all
             * assets currently loaded within this module.
             *
             * @property assets
             * @for modl.Module
             * @private
             * @type {object}
             */
            assets.mark(t, {});

            /**
             * Holds the module's exports
             *
             * @property exports
             * @for modl.Module
             * @type {mixed}
             */
            t.exports = undef;

            Ready.call(t);

            if (!hydrating) {
                t.initialize();
            }
        })).

        proto(hydrateAsset, that(function (that, name, payload) {
            hydratedAssets[Asset.path(that[myPath], name)] = payload;
        })).

        proto(hydrateModule, that(function (that, name, value, root) {
            var module, jsonReference, parts;

            if (typeof value === "object") {
                module = new Module(name, Module.path(that[myPath], name), that,
                        true);
                MODULE_REFERENCE.mark(value, module);
                that[modules][name] = module;
                module.hydrate(value, root);
            } else {
                jsonReference = root;
                parts = value.split("/");
                if (parts.length === 1 && parts[0] === "") {
                    module = root[MODULE_REFERENCE];
                } else {
                    forEach(parts, function (p) {
                        jsonReference = jsonReference[p];
                    });

                    module = jsonReference[MODULE_REFERENCE];
                    that[modules][name] = module;
                }
            }
        })).

        proto(hydrateModuleReferences, that(function (that, json, root, stack) {
            var module, jsonReference, parts;

            if (!root) {
                root = json;
                stack = [];
            }

            stack.push(json);

            forEach(json, function (v, k) {
                if (typeof v === "string") {
                    var ref = root,
                        parts = v.split("/"),
                        module;

                    if (parts.length === 1 && parts[0] === "") {
                        module = root[MODULE_REFERENCE];
                    } else {
                        forEach(parts, function (p) { ref = ref[p]; });
                        module = ref[MODULE_REFERENCE];
                    }

                    that[modules][k] = module;
                } else if (k.indexOf("/") !== 0) {
                    v[MODULE_REFERENCE][hydrateModuleReferences](v, root,
                            stack);
                }
            });
        })).

        proto({
            /**
             * Initializes the module loading its <code>/module</code> asset
             *
             * @method initialize
             * @for modl.Module
             */
            initialize: that(function (t) {
                if (!t[initialized]) {
                    t[initialized] = true;
                    if (t[myName] !== "") {
                        t.asset(
                            MODULE_ASSET,
                            function (asset) {
                                t.exports = asset.exports;
                                t.ready();
                            },
                            function (e) { t.fail(e); });
                    } else {
                        t.ready();
                    }
                }
            }),

            /**
             * Loads an asset within the module.
             *
             * @method asset
             * @for modl.Module
             *
             * @param {string} name The asset's name
             * @param {function} success The success callback
             * @param {function} fail The fail callback
             */
            asset: that(function (that, name, success, fail) {
                var asset;

                if (name in that[assets]) {
                    asset = that[assets][name];
                } else {
                    asset = new Asset(name);
                    asset.whenFail(fail);
                    that[assets][name] = asset;
                    asset.load(that[myPath]);
                }

                asset.whenReady(function () { success(asset); });
            }),

            /**
             * Loads child module within the module <i>(Yo dawg! I heard you
             * like modules...)</i>.
             *
             * @method module
             * @for modl.Module
             * @param {string} name The module's name
             * @param {function} success The success callback
             * @param {function} fail The fail callback
             */
            module: that(function (that, name, success, fail) {
                var path, module;

                if (name in that[modules]) {
                    module = that[modules][name];

                    currentModule = module;
                    module.initialize();
                    module.whenReady(function () {
                        currentModule = that;
                        success(module);
                    });
                } else {
                    path = Module.path(that[myPath], name);

                    module = new Module(name, path, that);

                    currentModule = module;

                    module.whenReady(function () {
                        currentModule = that;
                        that[modules][name] = module;
                        success(module);
                    });

                    module.whenFail(function () {
                        var parent = that[myParent];

                        currentModule = that;

                        if (parent) {
                            parent.module(name, function (module) {
                                that[modules][name] = module;
                                success(module);
                            }, fail);
                        } else {
                            fail(new Error(
                                    "Failed to load module \"" + name + "\""));
                        }
                    });
                }
            }),

            hydrate: that(function (t, json, root) {
                var moduleReferenceName = MODULE_REFERENCE.toString();

                if (!root) {
                    root = json;
                }

                forEach(json, function (value, name) {
                    if (name !== moduleReferenceName) {
                        if (name.indexOf("/") === 0) {
                            t[hydrateAsset](name, value);
                        } else {
                            t[hydrateModule](name, value, root);
                        }
                    }
                });

                t[hydrateModuleReferences](json);


            })
        }).

        constant("path", function (path, name) {
            return path + "/node_modules/" + name;
        });
    });

    /**
     * The loader class responsible for loading the various dependencies between
     *  modules and assets.
     *
     * @class modl.Loader
     * @extends modl.Ready
     * @constructor
     * @private
     */
    var Loader = Token.tokens(function (
        // properties
        uses,
        usesOrder,
        module,
        myPayload,

        // methods
        attachAsset,
        dispatch,
        loadUses,
        loadUse
    ) {
        return Ready.descend(that(function (t) {
            /**
             * The uses collection containing the various uses data
             *
             * @property uses
             * @for modl.Loader
             * @private
             * @type {object}
             */
            uses.mark(t, {});

            /**
             * The uses order containing the order of uses declaration
             *
             * @property usesOrder
             * @for modl.Loader
             * @private
             * @type {array}
             */
            usesOrder.mark(t, []);

            /**
             * The module instance to be passed along to the exports
             * callback function when called
             *
             * @property module
             * @for modl.Loader
             * @private
             * @type {object}
             */
            module.mark(t, {
                imports: {},
                exports: {}
            });

            /**
             * The callback function to be executed when all the
             * requires are ready
             *
             * @property myPayload
             * @for modl.Loader
             * @private
             * @type {function}
             */
            myPayload.mark(t, k);

            Ready.call(t);
        })).

        /**
         * Attach a given asset to this Loader. When the loader is
         * ready, the asset will also be market as ready
         *
         * @method attachAsset
         * @for modl.Loader
         * @private
         *
         * @param {Asset} asset The asset to be attached
         */
        proto(attachAsset, that(function (t, asset) {
            t.whenReady(function () {
                asset.exports = t[module].exports;
                asset.ready();
            });

            t.whenFail(function (e) { asset.fail(e); });
        })).

        /**
         * Dispatches the loader processing. It will start loading all
         * its requires and finally will run the payload function.
         *
         * @method dispatch
         * @for modl.Loader
         * @private
         */
        proto(dispatch, that(function (t) {
            var aliases = {};

            forEach(t[uses], function (alias, name) {
                if (alias === undef) {
                    alias = name.replace(ALIAS_RE, "$2");
                    t[uses][name] = alias;
                }

                if (hop(aliases, alias)) {
                    throw new Error("Alias clash: " + alias);
                }

                aliases[alias] = undef;
            });

            t[loadUses](
                function (loadedUses) {
                    var args = [t[module]],
                        failed = false;

                    forEach(t[usesOrder],
                            function (u) { args.push(loadedUses[u]); });
                    try {
                        t[myPayload].apply(null, args);
                        t.ready();
                    } catch (e) {
                        failed = true;
                        t.fail(e);
                    }

                    if (!failed) {
                        t.ready();
                    }
                },
                function (e) { t.fail(e); });
        })).

        /**
         * Loads all requires for the loader.
         *
         * @method loadUses
         * @for modl.Loader
         * @private
         * @param {function} success The success callback
         * @param {function} fail The fail callback
         */
        proto(loadUses, that(function (that, success, fail) {
            var myUses = map(that[uses], function (v, k) { return k; }),
                loadedUses = {},
                load = function (useName) {
                    if (!useName) {
                        success(loadedUses);
                    } else {
                        that[loadUse](useName, function (myUse) {
                            loadedUses[useName] = myUse;
                            load(myUses.shift());
                        }, fail);
                    }
                };
            load(myUses.shift());
        })).

        /**
         * Loads a given require
         *
         * @method loadUse
         * @for modl.Loader
         * @private
         * @param {string} name The use's name
         * @param {function} success The success callback
         * @param {function} fail The fail callback
         */
        proto(loadUse, that(function (that, name, success, fail) {
            var alias = that[uses][name],
                registerUse = function (loadedUse) {
                    var exports = loadedUse.exports;
                    that[module].imports[alias] = exports;
                    success(exports);
                };

            if (name.indexOf("/") === 0) {
                currentModule.asset(name, registerUse, fail);
            } else {
                currentModule.module(name, registerUse, fail);
            }
        })).

        proto({

            /**
             * Requires an asset from it. The
             * <b>resource</b> string may have the following formats:
             *
             *  - <code>"/path/to/asset</code>: in this case the asset within
             * the current module will be loaded
             *
             *  - <code>"module"</code>: in this case the "module" within
             * <code>node_modules</code> folder will be required, and
             * afterwards the <code>/module</code> asset within the module will
             * be loaded.
             *
             * Optionally an <b>alias</b> property may be passed to name the
             * required asset within the <b>imports</b> object. If
             * ommited, the alias will be automatically generated based the
             * <b>resource</b> value.
             *
             * @method uses
             * @for modl.Loader
             * @static
             * @chainable
             *
             * @param {string} resource A given resource to be required
             * @param {string} [alias] An optional alias which to be named
             *            within the <b>imports</b> object.
             *
             * @return {modl.Loader} The loader instance
             */
            uses: that(function (t, resource, alias) {
                t[uses][resource] = alias;
                t[usesOrder].push(resource);
                return t;
            }),

            /**
             * Schedules a given <b>payload</b>
             * function export the <i>asset</i>. The <b>payload</b> will only
             * run when all the requires are loaded and ready for prime time.
             *
             * When called, the <b>payload</b> function will receive the
             * <b>module</b> struct as its first argument. The imports will be
             * passed as subsequent arguments in order.
             *
             * The <b>module</b> object will have an <code>exports</code>
             * property which will be published for this asset. This property
             * can be overwritten with any value this asset may want to publish
             * (<i>a la</i> nodejs module system).
             *
             * The <b>module</b> object will also have an <code>imports</code>
             * object containing all required resources.
             *
             * Every imports will be passed along as parameters to the payload
             * function
             *
             * @method unit
             * @for modl.Loader
             * @static
             *
             * @param {function} payload The payload function
             */
            unit: that(function (t, payload) {
                t[myPayload] = payload;

                if (loadingAsset !== undef) {
                    t[attachAsset](loadingAsset);
                    loadingAsset = undef;
                } else {
                    t.whenFail(function (e) { throw e; });
                }
                t[dispatch]();
            })
        });
    });

    var modl = {

        /**
         * Simply creates <b>Loader</b> and returns it.
         *
         * Good for instrumenting purposes, in case you need a reference
         * without calling {{#crossLink "modl/uses:method"}}{{/crossLink}}
         * or {{#crossLink "modl/unit:method"}}{{/crossLink}} methods
         *
         * @method loader
         * @for modl
         * @static
         *
         * @return {modl.Loader}
         */
        loader: function () {
            return new Loader();
        },

        /**
         * Creates a <b>Loader</b> and requires an asset from it. The
         * <b>resource</b> string may have the following formats:
         *
         *  - <code>"/path/to/asset</code>: in this case the asset within
         * the current module will be loaded
         *
         *  - <code>"module"</code>: in this case the "module" within
         * <code>node_modules</code> folder will be required, and
         * afterwards the <code>/module</code> asset within the module will
         * be loaded.
         *
         * Optionally an <b>alias</b> property may be passed to name the
         * required asset within the <b>imports</b> object. If
         * ommited, the alias will be automatically generated based the
         * <b>resource</b> value.
         *
         * @method uses
         * @for modl
         * @static
         * @chainable
         *
         * @param {string} resource A given resource to be required
         * @param {string} [alias] An optional alias which to be named within
         *            the <b>imports</b> object.
         *
         * @return {modl.Loader} The loader instance
         */
        uses: function (resource, alias) {
            return new Loader().uses(resource, alias);
        },

        /**
         * Creates a <b>Loader</b> and schedules a given <b>payload</b>
         * function export the <i>asset</i>. The <b>payload</b> will only
         * run when all the requires are loaded and ready for prime time.
         *
         * When called, the <b>payload</b> function will receive the
         * <b>module</b> struct as its first argument. The imports will be
         * passed as subsequent arguments in order.
         *
         * The <b>module</b> object will have an <code>exports</code>
         * property which will be published for this asset. This property
         * can be overwritten with any value this asset may want to publish
         * (<i>a la</i> nodejs module system).
         *
         * The <b>module</b> object will also have an <code>imports</code>
         * object containing all required resources.
         *
         * Every imports will be passed along as parameters to the payload
         * function
         *
         * @method unit
         * @for modl
         * @static
         *
         * @param {function} payload The payload function
         */
        unit: function (payload) {
            new Loader().unit(payload);
        },

        /**
         * Sets up the modl module environment. It will reset all loaded
         * modules and will set up the settings object along with the values
         * passed along with the <b>options</b> parameter.
         *
         * This function <b>MUST</b> be called before any require/exports
         * can be actually made.
         *
         * @method setup
         * @for modl
         * @static
         * @param {object} options The options parameter
         * @param {string} options.root The root directory form which to
         *            load all assets and modules
         */
        setup: function (options) {
            settings = {};
            listeners = {
                "error": []
            };

            merge(settings, options, validSettings);
            currentModule = new Module("", settings.root);
            rootModule = currentModule;
        },

        /**
         * Dispatches the loading of a concatenated module. This method
         * should be called only by machine generated code.
         *
         * @method $module
         * @for modl
         * @static
         * @private
         *
         * @param {object} module The concantenated module
         */
        $module: function (module) {
            MODULE_REFERENCE.mark(module, currentModule);
            currentModule.hydrate(module);
            module["/module"].call(null);
        },

        on: function (event, listener) {
            if (event in listeners) {
                listeners[event].push(listener);
            } else {
                throw new TypeError("Unknown event: " + event);
            }
        }

    };

    main.modl = modl;

    if (node) {
        module.exports = modl;
    }

}(typeof exports !== "undefined" && global.exports !== exports));
