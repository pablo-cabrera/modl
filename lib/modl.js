(function(global) {
    "use strict";

    var
        /**
         * The defaults asset for a modl
         *
         * @property MODL_ASSET
         * @for modl
         * @type string
         * @static
         * @private
         * @final
         */
        MODL_ASSET = "/modl",

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
        ALIAS_RE = /(.*\/)?([^\/]+)$/,

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
        PATH_RE = /\/{2,}/g,

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
        undef = void 0,

        objectProto = Object.prototype,

        arrayProto = Array.prototype,

        node = typeof exports !== "undefined" && global.exports !== exports,

        constant = function(v) { return function() { return v; }; },

        k = constant(),

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
        validSettings = ["debug", "root"],

        /**
         * Contains current settings for the modl loader
         *
         * @property settings
         * @for modl
         * @type Object
         * @static
         * @private
         */
        settings = null,

        /**
         * Points to the current module being loaded
         *
         * @property current
         * @for modl
         * @type Module
         * @static
         * @private
         */
        current,

        /**
         * Points to the asset being prepared at the moment
         *
         *  @property preparedAsset
         *  @for modl
         *  @type Asset
         *  @static
         *  @private
         */
        preparingAsset,

        /**
         * Points to the asset being loaded at the moment
         *
         * @property loadingAsset
         * @for modl
         * @type Asset
         * @static
         * @private
         */
        loadingAsset,

        work = node ?
            function(f) { process.nextTick(f); } :
            function(f) { setTimeout(f, 0); },

        /**
         * Helper function to log messages when the debug flag is enabled
         *
         * @method log
         * @for modl
         * @param args* {mixed} Arguments to be logged
         * @private
         * @static
         */
        log = function() {
            var args;
            if (settings.debug && console && typeof console.log === "function") {
                args = slice(arguments);
                args.unshift(ts());
                if (node) {
                    forEach(args, function(v, i) {
                        args[i] = require("util").inspect(v, {depth: null});
                    });
                }
                console.log.apply(this, args);
            }
        },

        /**
         * Returns a formatted current timestamp with <code>hh:mm:ss</code> to be used for logging purposes
         *
         * @method ts
         * @for modl
         * @private
         * @static
         * @return {string} The formatted timestamp
         */
        ts = function() {
            var d = new Date(),
                z = function(n) { return n < 10 ? "0" + n : String(n); };

            return "[" + z(d.getHours()) + ":" + z(d.getMinutes()) + ":" + z(d.getSeconds()) + "." + String(1000 + d.getMilliseconds()).substr(1) + "]";
        },

        hop = function(o, p) {
            return objectProto.hasOwnProperty.call(o, p);
        },

        merge = function(a, b, list) {
            if (list) {
                forEach(list, function(p) {
                    if (hop(b, p)) {
                        a[p] = b[p];
                    }
                });
            } else {
                forEach(b, function(v, p) {
                    a[p] = v;
                });
            }
        },

        indexOf = function(a, f) {
            var i = null,
                l;

            if (objectProto.toString.call(a) === "[object Array]") {
                for (i = 0, l = a.length; i < l; i += 1) {
                    if (f(a[i], i)) {
                        return i;
                    }
                }
            } else {
                for (i in a) {
                    if (hop(a, i)) {
                        if (f(a[i], i)) {
                            return i;
                        }
                    }
                }
            }
        },

        forEach = function(a, f) {
            indexOf(a, function(v, i) {
                f(v, i);
                return false;
            });
        },

        map = function(a, f) {
            var o = [];
            forEach(a, function(v, i) { o.push(f(v, i)); });
            return o;
        },

        slice = function() {
            var args = arrayProto.slice.call(arguments);
            return arrayProto.slice.apply(args.shift(), args);
        },

        overload = function() {
            var functions = {},
                args = slice(arguments);

            forEach(args, function(f) { functions[f.length] = f; });
            functions["default"] = args[args.length - 1];

            return function() {
                var args = slice(arguments),
                    f = functions[args.length] || functions["default"];

                return f.apply(this, args);
            };
        },

        that = function(f) {
            return function() {
                var args = slice(arguments);
                args.unshift(this);
                return f.apply(this, args);
            };
        },

        Token = (function() {
            var mark = typeof Object.defineProperty === "function" ?
                function(t) { return function(o, v) { Object.defineProperty(o, t, {enumerable: false, configurable: true, writable: true, value: v}); }; } :
                function(t) { return function(o, v) { o[t] = v; }; };

            return function(token) {

                /**
                 * Token's toString
                 *
                 * @method toString
                 * @for modl.Util.Token
                 * @return {string}
                 */
                this.toString = constant(token);

                /**
                 * Token's valueOf
                 *
                 * @method valueOf
                 * @for modl.Util.Token
                 * @return {string}
                 */
                this.valueOf = this.toString;

                /**
                 * Defines the token as a property for the given object
                 *
                 * @method mark
                 * @for modl.Util.Token
                 * @param {object} o
                 * @param {mixed} [v] Optional value
                 */
                this.mark = mark(token);
            };
        }()),

        token = (function() {
            var
                chars = "abcdefghijklmnopqrstwxyzABCDEFGHIJKLMNOPQRSTWXYZ",
                length = chars.length,
                lastChar = chars.charAt(chars.length - 1),
                firstChar = chars.charAt(0),
                id = [],
                suffix = [];

            while (suffix.length < 32) {
                suffix.push(chars.charAt(Math.floor(Math.random() * length)));
            }
            suffix = suffix.join("");

            return function() {
                var i, c;
                for (i = id.length - 1; i > -1; i -= 1) {
                    c = id[i];
                    if (c !== lastChar) {
                        id[i] = chars.charAt(chars.indexOf(c) + 1);
                        break;
                    }

                    id[i] = firstChar;
                }

                if (i === -1) {
                    id.unshift(firstChar);
                }

                return new Token(id.join("") + suffix);
            };
        }()),

        kin = (function() {

            var
                define = function(o, p, v) {
                    if (p instanceof Token) {
                        p.mark(o, v);
                    } else {
                        o[p] = v;
                    }
                },

                utils = {
                    proto: overload(
                        function(constructor, values) {
                            forEach(values, function(v, p) { constructor.proto(p, v); });
                            return constructor;
                        },
                        function(constructor, name, value) {
                            define(constructor.prototype, name, value);
                            return constructor;
                        }),

                    descend: function(constructor, descendant) {
                        var F = function() {};
                        F.prototype = constructor.prototype;
                        descendant.prototype = new F();
                        prepare(descendant);
                        descendant.ancestor = constructor.prototype;
                        return descendant;
                    },

                    constant: function(constructor, name) {
                        if (name in constructor) {
                            return constructor[name];
                        }

                        if ("ancestor" in constructor) {
                            return constructor.ancestor.constructor.constant(name);
                        }
                    },

                    defConstant: overload(
                        function(constructor, values) {
                            forEach(values, function(v, p) { constructor.defConstant(p, v); });
                            return constructor;
                        },

                        function(constructor, name, value) {
                            define(constructor, name, value);
                            return constructor;
                        })

                },

                prepare = function(constructor) {
                    constructor.prototype.constructor = constructor;

                    forEach(utils, function(f, p) {
                        constructor[p] = function() {
                            var args = slice(arguments);
                            args.unshift(this);
                            return f.apply(this, args);
                        };
                    });
                };

            return function(constructor) {
                prepare(constructor);
                return constructor;
            };
        }()),

        /**
         * Loads a given script.
         *
         * @method loadScript
         * @for modl
         * @static
         * @private
         * @param {string} src The script's src
         */
        loadScript = node?
            function(src) {
                delete require.cache[src];
                work(function() { require(src); });
            }:
            function(src) {
                var s = document.createElement("script"),
                    d = document.documentElement;
                s.src = src;
                d.insertBefore(s, d.firstChild);
            },

        /**
         * The Ready class provides the functionality of scheduling callbacks
         * for when a given Ready instance is marked as ready
         *
         * @class Ready
         * @constructor
         * @private
         */
        Ready = (function() {
            var
                readyStatus = token(),
                callbacks = token();

            return kin(function() {
                    /**
                     * Indicates whether the instance is ready or not
                     *
                     * @property readyStatus
                     * @for Ready
                     * @private
                     * @type {boolean}
                     */
                    readyStatus.mark(this, false);

                    /**
                     * Callback functions are stored within this guy
                     *
                     * @property callbacks
                     * @for Ready
                     * @private
                     * @type {array}
                     */
                    callbacks.mark(this, []);
                }).

                proto({
                    /**
                     * Schedules an <b>f</b> callback to be executed once the
                     * instance is marked as <b>ready</b>
                     *
                     * @method whenReady
                     * @for Ready
                     * @param {function} f The callback function to be scheduled
                     */
                    whenReady: function(f) {
                        if (this[readyStatus]) {
                            f();
                        } else {
                            this[callbacks].push(f);
                        }
                    },

                    /**
                     * Marks the instance as <b>ready</b> and runs all it's callbacks
                     *
                     * @method ready
                     * @for Ready
                     */
                    ready: function() {
                        this[readyStatus] = true;
                        forEach(this[callbacks], function(f) { f(); });
                    }
                });
        }()),

        /**
         * The Asset class represents an script file being loaded within a
         * module.
         *
         * @class Asset
         * @extends Ready
         * @constructor
         * @private
         * @param {string} name It's name
         */
        Asset = (function() {
            var _name = token();

            return Ready.descend(function(name, path) {

                /**
                 * The asset's name
                 *
                 * @property _name
                 * @for Asset
                 * @type {string}
                 * @private
                 */

                _name.mark(this, name);

                /**
                 * Holds the asset's exports
                 *
                 * @property exports
                 * @for Asset
                 * @type {mixed}
                 */
                this.exports = undef;

                Ready.call(this);

                log("Asset created: ", this);
            }).

            /**
             * Retrieves the asset and loads it
             *
             * @param {string} path It's path
             */
            proto("load", function(path) {
                loadingAsset = this;
                loadScript((path + this[_name] + ".js").replace(PATH_RE, "/"));
            });
        }()),

        /**
         * The Module class represents a module within the modl tree. It can
         * load other <b>modules</b>(dependencies contained within
         * <code>node_modules</code> directory) and <b>assets</b> (files
         * referenced within a module).
         *
         * @class Module
         * @extends Ready
         * @constructor
         * @private
         * @param {string} name The module's name
         * @param {string} path The module's path
         * @param {object} preloadedMap Object containing preloaded modules and assets
         */
        Module = (function() {
            var _name = token(),
                _path = token(),
                modules = token(),
                assets = token(),
                buildPreloadedMap = token(),
                preloadMap = token();

            return Ready.descend(function(name, path, preloadedMap) {
                    /**
                     * It's name
                     *
                     * @property _name
                     * @for Module
                     * @private
                     * @type {string}
                     */
                    _name.mark(this, name);

                    /**
                     * It's path
                     *
                     * @property _path
                     * @for Module
                     * @private
                     * @type {string}
                     */
                    _path.mark(this, path);

                    /**
                     * It's inner modules. This will contain the references for
                     * the children modules currently loaded for this module.
                     *
                     * @property _modules
                     * @for Module
                     * @private
                     * @type {object}
                     */
                    modules.mark(this, {});

                    /**
                     * It's assets. This will contain the references for all
                     * assets currently loaded within this module.
                     *
                     * @property _assets
                     * @for Module
                     * @private
                     * @type {object}
                     */
                    assets.mark(this, {});

                    /**
                     * Holds the dependency mappings while preloading
                     *
                     * @property preloadMap
                     * @for Module
                     * @private
                     * @type {object}
                     */
                    preloadMap.mark(this, preloadedMap);

                    /**
                     * Holds the asset's exports
                     *
                     * @property exports
                     * @for Module
                     * @type {mixed}
                     */
                    this.exports = undef;


                    Ready.call(this);
                    log("module created: ", this);

                    this.initialize();
                }).

                proto(buildPreloadedMap, function(name) {
                }).

                proto({

                    /**
                     * Initializes the module loading its <code>/modl</code> asset
                     *
                     * @method initialize
                     * @for Module
                     */
                    initialize : that(function(that) {
                        var map = this[preloadMap];

                        if (map) {
                            this[assets] = preloadedMap.root;
                            forEach(preloadedMap.modules, function(map, name) {
                                if (
                                that[modules] = new Module(name)
                            });

preloadMap.modules

                        } else {
                            if (this[_name] !== "") {
                                this.asset(MODL_ASSET).
                                when(function(err, asset) {
                                    that.exports = asset.exports;
                                    that.ready();
                                });
                            } else {
                                this.ready();
                            }
                        }
                    }),

                    /**
                     * Loads an asset within the module.
                     *
                     * @method asset
                     * @for Module
                     * @param {string} name The asset's name
                     * @return {modl.Util.Future} The future representing when the asset will
                     *         be loaded
                     */
                    asset: function(name) {
                        var future = new Future(),
                            asset;

                        if (name in this[assets]) {
                            asset = this[assets][name];
                        } else {
                            asset = new Asset(name);
                            asset.load(this[_path]);
                            this[assets][name] = asset;
                        }

                        asset.whenReady(function() {
                            future.fulfill(null, asset);
                        });

                        return future;
                    },

                    /**
                     * Loads child module within the module <i>(Yo dawg! I heard you like modules...)</i>.
                     *
                     * @method module
                     * @for Module
                     * @param {string} name The module's name
                     * @return {modl.Util.Future} The future representing when the module will
                     *         be loaded
                     */
                    module: that(function(that, name) {
                        var future = new Future(),
                            module;

                        if (name in this[modules]) {
                            module = this[modules][name];
                        } else {
                            module = new Module(name, this[_path] + "/node_modules/" + name);
                            this[modules][name] = module;
                        }

                        current = module;

                        module.whenReady(function() {
                            current = that;
                            future.fulfill(null, module);
                        });

                        return future;
                    }),

                    startPreloading: function(name) {
                        log("start preloading", this, name);

                        if (name === undef) {
                            this[preloadMap] = {
                                current: [],
                                root: {},
                                modules: {}
                            };
                        } else {
                            var map = this[preloadMap],
                                current = map.current;

                            current.push(name);

                            map.modules[current.join("/")] = {};
                        }
                    },

                    endPreloading: function(dispatch) {
                        var map = this[preloadMap];

                        log("end preloading", this, dispatch);

                        map.current.pop();

                        if (dispatch) {

                        }
                    },

                    prepareAsset: function(name) {

                        var map = this[preloadMap],
                            currentModule = map.current.join("/"),
                            preloadingModule = currentModule === "" ? map.root : map.modules[currentModule],
                            asset;

                        log("prepare asset", name);

                        if (currentModule === "") {
                            if (name === MODL_ASSET) {
                                asset = this[assets][name];
                            } else {
                                asset = new Asset(name);
                                this[assets][name] = asset;
                            }
                        } else {
                            asset = new Asset(name);
                        }

                        preloadingModule[name] = asset;
                        preparingAsset = asset;
                    }

                });
        }()),

        Future = (function() {
            var _err = token(),
                _data = token(),
                fulfilled = token(),
                when = token(),
                runWhen = token();

            return kin(function() {

                /**
                 * Holds the sent error
                 *
                 * @property _err
                 * @for modl.Util.Future
                 * @private
                 * @type {mixed}
                 */
                _err.mark(this);

                /**
                 * Holds the sent data
                 *
                 * @property _data
                 * @for modl.Util.Future
                 * @private
                 * @type {mixed}
                 */
                _data.mark(this);

                /**
                 * Indicates whether the promise has been fulfilled
                 *
                 * @property fulfilled
                 * @for modl.Util.Future
                 * @private
                 * @type {boolean}
                 */
                fulfilled.mark(this, false);

                /**
                 * Holds the callback to be executed whenever the promise is fulfilled
                 *
                 * @property when
                 * @for modl.Util.Future
                 * @private
                 * @type {function}
                 */

                when.mark(this, k);
            }).

            proto(runWhen, that(function(that, when) {
                work(function() { when.call(null, that[_err], that[_data]); });
            })).

            proto({

                /**
                 * Fulfills the promise
                 *
                 * @method fulfill
                 * @for modl.Util.Future
                 * @param {mixed} [err] The error to be sent
                 * @param {mixed} [data] The data to be sent
                 */
                fulfill: that(function(that, err, data) {
                    if (this[fulfilled]) {
                        throw new Error("Future already fulfilled");
                    }

                    this[_err] = err;
                    this[_data] = data;
                    this[fulfilled] = true;
                    this[runWhen](this[when]);
                }),

                /**
                 * Register the callback if the promise is to be fulfilled,
                 * otherwise just runs it passing along the error/data
                 * associated with the future
                 *
                 * @method when
                 * @for modl.Util.Future
                 * @param {function} f The callback function
                 */
                when: function(f) {
                    if (this[fulfilled]) {
                        this[runWhen](f);
                    } else {
                        this[when] = f;
                    }
                }
            });
        }()),

        /**
         * The loader class responsible for loading the various dependencies between modules and assets
         *
         * @class Loader
         * @extends Ready
         * @constructor
         * @private
         */
        Loader = (function() {
            var requires = token(),
                modl = token(),
                _payload = token(),
                attachAsset = token(),
                dispatch = token(),
                loadRequires = token(),
                loadRequire = token();

            return Ready.descend(function() {
                /**
                 * The requires collection containing the various required
                 * data
                 *
                 * @property requires
                 * @for Loader
                 * @private
                 * @type {object}
                 */
                requires.mark(this, {});

                /**
                 * The modl instance to be passed along to the exports
                 * callback function when called
                 *
                 * @property modl
                 * @for Loader
                 * @private
                 * @type {object}
                 */
                modl.mark(this, {
                    imports: {},
                    exports: {}
                });

                /**
                 * The callback function to be executed when all the
                 * requires are ready
                 *
                 * @property _payload
                 * @for Loader
                 * @private
                 * @type {function}
                 */
                _payload.mark(this, k);

                Ready.call(this);

                log("loader created: ", this);
            }).

            /**
             * Attach a given asset to this Loader. When the loader is
             * ready, the asset will also be market as ready
             *
             * @method attachAsset
             * @for Loader
             * @private
             * @param {Asset} asset The asset to be attached
             */
            proto(attachAsset, that(function(that, asset) {
                this.whenReady(function() {
                    log("loader ready, triggering asset");
                    asset.exports = that[modl].exports;
                    asset.ready();
                });
            })).

            /**
             * Dispatches the loader processing. It will start loading all
             * its requires and finally will run the payload function.
             *
             * @method dispatch
             * @for Loader
             * @private
             */
            proto(dispatch, that(function(that) {
                var aliases = {};
                forEach(this[requires], function(alias, require) {
                    if (!alias) {
                        that[requires][require] = alias = require.replace(ALIAS_RE, "$2");
                    }

                    if (hop(aliases, alias)) {
                        throw new Error("Alias clash: " + alias);
                    }

                    aliases[alias] = undef;
                });


                that[loadRequires]().
                when(function() {
                    log("Running payload");
                    that[_payload].call(null, that[modl], that[modl].imports);
                    that.ready();
                });
            })).

            /**
             * Loads all requires for the loader.
             *
             * @method loadRequires
             * @for Loader
             * @private
             * @return {modl.Util.Future} A promise for when all the requires are ready.
             */
            proto(loadRequires, that(function(that) {
                var future = new Future(),
                    reqs = map(this[requires], function(v, k) { return k; }),
                    load = function(require) {
                        if (!require) {
                            log("done loading requires, moving on");
                            future.fulfill();
                        } else {
                            that[loadRequire](require).
                            when(function() { load(reqs.shift()); });
                        }
                    };

                log("loading requires");

                load(reqs.shift());
                return future;
            })).

            /**
             * Loads a given require
             *
             * @method loadRequire
             * @for Loader
             * @private
             * @param {string} require The require name
             * @return {modl.Util.Future} The promise for when the require is done
             */
            proto(loadRequire, that(function(that, require) {
                var
                    alias = this[requires][require],
                    future = new Future(),

                    when = function(err, thing) {
                        log("Require loaded: ", require);
                        that[modl].imports[alias] = thing.exports;
                        future.fulfill();
                    };

                log("loading require: ", require, alias);

                if (require.indexOf("/") === 0) {
                    current.asset(require).
                    when(when);
                } else {
                    current.module(require).
                    when(when);
                }

                return future;
            })).

            proto({

                /**
                 * Requires an asset from it. The <b>resource</b> string may
                 * have the following formats:
                 *
                 *  - <code>"/path/to/asset</code>: in this case the asset
                 * within the current module will be loaded
                 *
                 *  - <code>"module"</code>: in this case the "module" within
                 * <code>node_modules</code> folder will be required, and
                 * afterwards the <code>/modl</code> asset within the module
                 * will be loaded.
                 *
                 *  - <code>"module/path/to/asset"</code>: in this case the
                 * "module" within <code>node_modules</code> folder will be
                 * required, and afterwards the indicated asset within the
                 * module will be loaded.
                 *
                 * Optionally an <b>alias</b> property may be passed to name
                 * the required asset within the <b>imports</b> object. If
                 * ommited, the alias will be automatically generated based the
                 * <b>resource</b> value.
                 *
                 * @param {string} resource A given resource to be required
                 * @param {string} [alias] An optional alias which to be named
                 *              within the <b>imports</b> object.
                 * @method require
                 * @for Loader
                 * @chainable
                 * @return {Loader} The loader instance
                 */
                require : function(resource, alias) {
                    this[requires][resource] = alias;
                    return this;
                },

                /**
                 * Schedules a given <b>payload</b>
                 * function export the <i>asset</i>. The <b>payload</b> will only
                 * run when all the requires are loaded and ready for prime time.
                 *
                 * When called, the <b>payload</b> function will receive the
                 * <b>module</b> struct as its first argument and as second
                 * argument, the <b>imports</b> object containing all required
                 * resources within will be passed.
                 *
                 * The <b>module</b> object will have an <code>exports</code>
                 * property which will be published for this asset. This property
                 * can be overwritten with any value this asset may want to publish (<i>a
                 * la</i> nodejs module system).
                 *
                 * The <b>module</b> object will also have an <code>imports</code>
                 * object containing all required resources which will be also
                 * passed as a second argument to the <b>payload</b> function
                 *
                 * @method exports
                 * @for Loader
                 * @param {function} payload The payload function
                 */
                exports : function(payload) {
                    this[_payload] = payload;

                    if (preparingAsset !== undef) {
                        this[attachAsset](preparingAsset);
                        preparingAsset = undef;
                    } else {

                        if (loadingAsset !== undef) {
                            this[attachAsset](loadingAsset);
                            loadingAsset = undef;
                        }

                        this[dispatch]();
                    }
                }
            });
        }()),

        /**
         * The modl loader
         *
         * @class modl
         * @static
         */
        modl = {

            /**
             * Creates a <b>Loader</b> and requires an asset from it. The
             * <b>resource</b> string may have the following formats:
             *
             *  - <code>"/path/to/asset</code>: in this case the asset within
             * the current module will be loaded
             *
             *  - <code>"module"</code>: in this case the "module" within
             * <code>node_modules</code> folder will be required, and
             * afterwards the <code>/modl</code> asset within the module will
             * be loaded.
             *
             *  - <code>"module/path/to/asset"</code>: in this case the
             * "module" within <code>node_modules</code> folder will be
             * required, and afterwards the indicated asset within the module
             * will be loaded.
             *
             * Optionally an <b>alias</b> property may be passed to name the
             * required asset within the <b>imports</b> object. If
             * ommited, the alias will be automatically generated based the
             * <b>resource</b> value.
             *
             * @param {string} resource A given resource to be required
             * @param {string} [alias] An optional alias which to be named within the
             *            <b>imports</b> object.
             * @method require
             * @for modl
             * @static
             * @chainable
             * @return {Loader} The loader instance
             */
            require: function(resource, alias) {
                log("modl.require called, creating new loader");
                var loader = new Loader();
                return loader.require(resource, alias);
            },

            /**
             * Creates a <b>Loader</b> and schedules a given <b>payload</b>
             * function export the <i>asset</i>. The <b>payload</b> will only
             * run when all the requires are loaded and ready for prime time.
             *
             * When called, the <b>payload</b> function will receive the
             * <b>module</b> struct as its first argument and as second
             * argument, the <b>imports</b> object containing all required
             * resources within will be passed.
             *
             * The <b>module</b> object will have an <code>exports</code>
             * property which will be published for this asset. This property
             * can be overwritten with any value this asset may want to publish (<i>a
             * la</i> nodejs module system).
             *
             * The <b>module</b> object will also have an <code>imports</code>
             * object containing all required resources which will be also
             * passed as a second argument to the <b>payload</b> function
             *
             * @method exports
             * @for modl
             * @static
             * @param {function} payload The payload function
             */
            exports: function(payload) {
                log("modl.exports called, creating new loader");
                var loader = new Loader();
                loader.exports(payload);
            },

            /**
             * Sets up the modl environment. It will reset all loaded modules
             * and will set up the settings object along with the values passed
             * along with the <b>options</b> parameter.
             *
             * This function <b>MUST</b> be called before any require/exports
             * can be actually made.
             *
             * @method setup
             * @for modl
             * @static
             * @param {object} options The options parameter
             * @param {string} options.root The root directory form which to load all
             *            assets and modules
             * @param {boolean} [options.debug] If this flag is on, it will emit debug
             *            messages to a console if available
             */
            setup: function(options) {
                settings = {};
                merge(settings, options, validSettings);
                current = new Module("", settings.root);
            },

            /**
             * Util class that provides inner utils to the outside world
             *
             * @class modl.Util
             * @static
             */
            Util: {

                /**
                 * Flag that indicates if we are running under nodejs environment
                 *
                 * @property Uode
                 * @for modl.Util
                 * @type boolean
                 * @final
                 */
                node: node,

                /**
                 * Returns a function that always returns the same value
                 *
                 * @method constant
                 * @for modl.Util
                 * @param {mixed} v Returned value
                 * @return {function}
                 */
                constant: constant,

                /**
                 * Short for setTimeout(f, 0);
                 *
                 * @method work
                 * @for modl.Util
                 * @param {function} f Work function
                 * @return {number} timeout id
                 */
                work: work,

                /**
                 * Short for Object.prototype.hasOwnProperty
                 *
                 * @method hop
                 * @for modl
                 * @param {object} o Object to check its property
                 * @param {string} p Property name
                 * @return {boolean} whether a property exists within the object or not
                 */
                hop: hop,

                /**
                 * Merges all properties from <b>b</b> into <b>a</b>. Optionally it
                 * can be passes a property whitelist
                 *
                 * @method merge
                 * @for modl.Util
                 * @param {object} a The target object
                 * @param {object} b The source object
                 * @param {array} [list] Properties whitelist
                 */
                merge: merge,

                /**
                 * Iterates over an object's properties or an array's values calling the
                 * <b>f</b> callback function each time passing the value as it's first
                 * argument and the index or property name as it's second argument. The
                 * callback function must return either <code>true</code> or
                 * <code>false</code>. If for a given property or index the function
                 * returns <code>true</code> then the indexOf function will return the
                 * current property name or index.
                 *
                 * @method indexOf
                 * @for modl.Util
                 * @param {array|object} a The array or object to be iterated
                 * @param {function} f The callback function for each iteration
                 */
                indexOf: indexOf,

                /**
                 * Iterates over an object's properties or an array's values calling the
                 * <b>f</b> callback function each time passing the value as it's first
                 * argument and the index or property name as it's second argument.
                 *
                 * @method forEach
                 * @for modl.Util
                 * @param {array|object} a The array or object to be iterated
                 * @param {function} f The callback function for each iteration
                 */
                forEach: forEach,

                /**
                 * Short for Array.prototype.slice.apply(arguments[0], arguments[1...n])
                 *
                 * @method slice
                 * @for modl.Util
                 * @return {array}
                 */
                slice: slice,

                /**
                 * Iterates over an object's properties or an array's values
                 * calling the <b>f</b> callback function each time passing the
                 * value as it's first argument and the index or property name
                 * as it's second argument. The returned value of each function
                 * call is stored in a new array that is returned in the end.
                 *
                 * @method map
                 * @for modl.Util
                 * @param {array|object} a The array or object to be iterated
                 * @param {function} f The callback function for each iteration
                 * @return {array}
                 */
                map: map,

                /**
                 * Returns a function that decides which function to call based on the number of arguments passed.
                 *
                 * @method overload
                 * @for modl.Util
                 * @param {function} functions*
                 * @return {function}
                 */
                overload: overload,

                /**
                 * Returns another function that passes the this arguments as first argument to the other function
                 *
                 * @method that
                 * @for modl.Util
                 * @param {function} f Function that receives "this" as "that"
                 * @return {function}
                 */
                that: that,

                /**
                 * Creates a unique token
                 *
                 * @method token
                 * @for modl.Util
                 * @return {modl.Util.Token}
                 */
                token: token,

                /**
                 * Creates new classes of things
                 *
                 * @method kin
                 * @for modl.Util
                 * @param {function} constructor
                 * @return {function} A new kin, or class if you may
                 */
                kin: kin,

                /**
                 * A noop function
                 *
                 * @method k
                 * @for modl.Util
                 */
                k: k,

                /**
                 * Token class
                 *
                 * @class modl.Util.Token
                 * @constructor
                 * @param {string} token Token value
                 */
                Token: Token,

                /**
                 * Represents a future promise
                 *
                 * @class modl.Util.Future
                 * @constructor
                 */
                Future: Future
            },

            $start: function(name) {
                current.startPreloading(name);
            },

            $end: function(dispatch) {
                current.endPreloading(dispatch);
            },

            $asset: function(name) {
                current.prepareAsset(name);
            }
        };

    if (node) {
        module.exports = modl;
    } else {
        global.modl = modl;
    }

}(this));