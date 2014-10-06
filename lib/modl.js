(function (node) {
    "use strict";

    var

        main = node? global: window,

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
        MODULE_ASSET = "/module",

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

        hydratedAssets = {},

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
        validSettings = ["root"],

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
         * @property currentModule
         * @for modl
         * @type modl.Module
         * @static
         * @private
         */
        currentModule,

        /**
         * Points to the root module
         *
         * @property rootModule
         * @for modl
         * @type modl.Module
         * @static
         * @private
         */
        rootModule,

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

        objectProto = Object.prototype,

        arrayProto = Array.prototype,

        objToStringCall = function (o) {
            return objectProto.toString.call(o);
        },

        constant = function (v) { return function () { return v; }; },

        args = function (f) {
            return function () {
                return f.call(this, slice(arguments));
            };
        },

        k = constant(),

        work = node?
            function (f) { setImmediate(f); }:
            function (f) { setTimeout(f, 0); },

        hop = function (o, p) {
            return objectProto.hasOwnProperty.call(o, p);
        },

        merge = function (a, b, list) {
            if (list) {
                forEach(list, function (p) {
                    if (hop(b, p)) {
                        a[p] = b[p];
                    }
                });
            } else {
                forEach(b, function (v, p) {
                    a[p] = v;
                });
            }
        },

        indexOf = function (a, f) {
            var i = null,
                l;

            if (objToStringCall(a) === "[object Array]") {
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

        first = function (a, f) {
            var i = indexOf(a, f || constant(true));
            if (i !== undefined) {
                return a[i];
            }
        },

        forEach = function (a, f) {
            indexOf(a, function (v, i) {
                f(v, i);
                return false;
            });
        },

        map = function (a, f) {
            var o = [];
            forEach(a, function (v, i) { o.push(f(v, i)); });
            return o;
        },

        slice = function () {
            var args = arrayProto.slice.call(arguments);
            return arrayProto.slice.apply(args.shift(), args);
        },

        overload = args(function (args) {
            var functions = {};

            forEach(args, function (f) { functions[f.length] = f; });
            functions["default"] = args[args.length - 1];

            return function () {
                var args = slice(arguments),
                    f = functions[args.length] || functions["default"];

                return f.apply(this, args);
            };
        }),

        that = function (f) {
            return args(function (args) {
                args.unshift(this);
                return f.apply(this, args);
            });
        },

        /**
         * The Token class is used to created private tokens to be used along
         * with the modl type system.
         *
         * It creates a token with a random name that should be used to mark a
         * given instance with the token's name.
         *
         * It tries to hide the token property from the outside world using the
         * built in defineProperty method. Otherwise it just defines the name
         * as public property anyway.
         *
         * @class modl.Token
         * @constructor
         *
         * @param {string} token
         */
        Token = (function () {
            var mark = typeof Object.defineProperty === "function" && (function () { try { Object.defineProperty({}, "", {}); return true; } catch (e) {} return false; }())?
                function (t) { return function (o, v) { Object.defineProperty(o, t, {enumerable: false, configurable: true, writable: true, value: v}); }; } :
                function (t) { return function (o, v) { o[t] = v; }; },

                /**
                 * The token constructor
                 *
                 * @class modl.Token
                 * @constructor
                 *
                 * @param {string} token
                 */
                Token = function (token) {

                    /**
                     * Token's toString
                     *
                     * @method toString
                     * @for modl.Token
                     *
                     * @return {string}
                     */
                    this.toString = constant(token);

                    /**
                     * Token's valueOf
                     *
                     * @method valueOf
                     * @for modl.Token
                     *
                     * @return {string}
                     */
                    this.valueOf = this.toString;

                    /**
                     * Defines the token as a property for the given object
                     *
                     * @method mark
                     * @for modl.Token
                     *
                     * @param {object} o
                     * @param {mixed} [v] Optional value
                     */
                    this.mark = mark(token);
                };

            merge(Token, {

                /**
                 * Creates a new token with a random name
                 *
                 * @method create
                 * @for modl.Token
                 * @static
                 *
                 * @return {modl.Token}
                 */
                create: (function () {
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

                    return function () {
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

                /**
                 * Passes created tokens to a given function. The number of created
                 * tokens are the same of the number of arguments that the function
                 * expects.
                 *
                 * Returns the returned value from the given function.
                 *
                 * @method tokens
                 * @for modl.Token
                 * @static
                 *
                 * @return {mixed}
                 */
                tokens: function (f) {
                    var t = [], i = f.length;
                    while (i !== 0) {
                        t.push(Token.create());
                        i -= 1;
                    }

                    return f.apply(this, t);
                }
            });

            return Token;
        }()),

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
        MODULE_REFERENCE = Token.create(),

        inherits,

        bond = function (constructor, superConstructor) {
            var F = constant();
            F.prototype = superConstructor.prototype;
            constructor.prototype = new F();
            constructor.prototype.constructor = constructor;
            return constructor;
        },

        /**
         * The pseudo Type class for the modl type system. This class is
         * used to describe the available methods within the type system itself.
         *
         * Actually there is no Type class, just the added functionality for the
         * classes created with this type system.
         *
         * The type constructor should be called without the new keyword itself,
         * it will receive the constructor function, add some features to it and
         * the return the same reference.
         *
         * The constant method is also assigned to the constructor's prototype.
         * This way it's instances also benefits from the constant method.
         *
         * If the constructor is ommited, an empty constructor is created.
         *
         * @class modl.Type
         * @constructor
         *
         * @param {function} [constructor]
         */
        type = (function () {
            var
                define = function (o, p, v) {
                    if (p instanceof Token) {
                        p.mark(o, v);
                    } else {
                        o[p] = v;
                    }
                },

                utils = {

                    proto: overload(

                        /**
                         * Assigns the values from the object to the constructor's prototype instance
                         *
                         * @method proto
                         * @for modl.Type
                         * @static
                         * @chainable
                         *
                         * @param {object} values Various key/value pairs to be assigned to it's prototype
                         *
                         * @return {modl.Type} returns the constructor itself
                         */
                        function (constructor, values) {
                            forEach(values, function (v, p) { constructor.proto(p, v); });
                            return constructor;
                        },

                        /**
                         * Assigns a simgle value to a specific name to the constructor's prototype instance
                         *
                         * @method proto
                         * @for modl.Type
                         * @static
                         * @chainable
                         *
                         * @param {string|modl.Token} name
                         * @param {mixed} value
                         *
                         * @return {modl.Type} returns the constructor itself
                         */
                        function (constructor, name, value) {
                            define(constructor.prototype, name, value);
                            return constructor;
                        }),

                    /**
                     * Resolves a constant value within the constructor itself.
                     * If it doens't have the constant directly, it walks up the
                     * inheritance tree looking for it.
                     *
                     * @method constant
                     * @for modl.Type
                     * @static
                     *
                     * @param {string|modl.Token} name
                     *
                     * @return {mixed}
                     */
                    constant: function (constructor, name) {
                        if (name in constructor) {
                            return constructor[name];
                        }

                        if ("ancestor" in constructor) {
                            return constructor.ancestor.constructor.constant(name);
                        }
                    },

                    defConstant: overload(
                        /**
                         * Defines a set of constant within the constructor
                         * itself. Uses the values object as key/value pairs to
                         * define the constants.
                         *
                         * @method defConstant
                         * @for modl.Type
                         * @static
                         * @chainable
                         *
                         * @param {object} values Various key/value pairs to be assigned as constants
                         *
                         * @return {modl.Type} returns the constructor itself
                         */
                        function (constructor, values) {
                            forEach(values, function (v, p) { constructor.defConstant(p, v); });
                            return constructor;
                        },

                        /**
                         * Defines a single constant within the constructor.
                         *
                         * @method defConstant
                         * @for modl.Type
                         * @static
                         * @chainable
                         *
                         * @param {string|modl.Token} name The constant name
                         * @param {mixed} value The constant value
                         *
                         * @return {modl.Type}
                         */
                        function (constructor, name, value) {
                            define(constructor, name, value);
                            return constructor;
                        })

                },

                prepare = function (constructor) {
                    var tokens;

                    constructor.prototype.constant = function (name) { return constructor.constant(name); };

                    /**
                     * Stores the shared tokens within the constructor's
                     * closure, so whenever a descendant asks for the ancestors
                     * tokens, it will receive a copy of them within the merged
                     * shared object.
                     *
                     * @method shared
                     * @for modl.Type
                     *
                     * @param {object} shared
                     *
                     * @return {modl.Type}
                     */
                    constructor.shared = function (shared) {
                        tokens = shared;
                        return constructor;
                    };

                    /**
                     * Creates a new type descendant from this one. It applies
                     * the same syntatic sugar as it's parent and does the
                     * inherintance linking.
                     *
                     * If ommited, a constructor that calls the superclass is
                     * created and returned.
                     *
                     * @method descend
                     * @for modl.Type
                     *
                     * @param {function} [constructor] The descendant's constructor
                     * @param {object} [shared] The descendant's shared tokens
                     *
                     * @return {modl.Type} The descendant's constructor
                     */
                    constructor.descend = function (descendant, shared) {
                        if (!descendant) {
                            descendant = args(function (args) { constructor.apply(this, args); });
                        }

                        if (tokens && shared) { merge(shared, tokens); }

                        return inherits(descendant, constructor).shared(shared || tokens);
                    };

                    forEach(utils, function (f, p) {
                        constructor[p] = args(function (args) {
                            args.unshift(this);
                            return f.apply(this, args);
                        });
                    });
                };

            inherits = function (constructor, superConstructor) {
                bond(constructor, superConstructor);
                constructor.ancestor = superConstructor.prototype;
                prepare(constructor);
                return constructor;
            };

            return function (constructor) {
                if (!constructor) {
                    constructor = constant();
                }

                prepare(constructor);
                return constructor;
            };
        }()),

        /**
         * The Ready class provides the functionality of scheduling callbacks
         * for when a given Ready instance is marked as ready
         *
         * @class modl.Ready
         * @constructor
         * @private
         */
        Ready = Token.tokens(function (
            readyStatus,
            readyCallbacks,

            failStatus,
            failCallbacks,
            failure
        ) {
            return type(that(function (t) {
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
                    if (!t[failStatus]){
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
                            work(function() { throw e; });
                        }
                    });
                })

            });
        }),

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
        Asset = Token.tokens(function (myName) {
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
                loadAsset(Asset.path(path, that[myName]), k, function (e) { that.fail(e); });
            })).

            defConstant("path", function (path, name) {
                return (path + name + ".js").replace(PATH_RE, "/");
            });
        }),

        loadAsset = function (a, s, f) {
            if (hop(hydratedAssets, a)) {
                hydratedAssets[a].call(null);
                s();
            } else {
                loadScript(a, s, f);
            }
        },

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
        loadScript = node?
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
                 * Tracks the loading of a script element. When the script is loaded and
                 * run, first the "success" callback
                 *
                 * @param {HTMLScriptElement} node the "script" node
                 * @param {function} success The success callback
                 * @param {function} fail The fail callback
                 */
                var track = (function () {
                    if ((function (m) { return m && m[1]; })(navigator.userAgent.match(/MSIE (8|9).0([^;]*)/))) {
                        return (function () {
                            var check = function (readyState, context) {
                                    if ("loaded" === readyState || "complete" === readyState) {
                                        if (context.modlCalled) {
                                            context.success.call(null);
                                        } else {
                                            context.fail.call(null);
                                        }
                                    }
                                },

                                hijack = function (name, context) {
                                    return args(function (args) {
                                        context.modlCalled = true;
                                        merge(modl, context.previousMethods);
                                        return modl[name].apply(this, args);
                                    });
                                };


                            return function (node, success, fail) {
                                var context = {
                                    modlCalled: false,
                                    success: success,
                                    fail: fail,
                                    previousMethods: {
                                        uses: modl.uses,
                                        unit: modl.unit,
                                        $module: modl.$module
                                    }
                                };

                                merge(modl, {
                                    uses: hijack("uses", context),
                                    unit: hijack("unit", context),
                                    $module: hijack("$module", context)
                                });

                                check(node.readyState, context);
                                node.onreadystatechange = function () { check(node.readyState, context); };
                            };
                        }());
                    }

                    if (/KHTML/.test(navigator.userAgent)) {
                        return function (node, success, error) {
                            node.addEventListener("load", function () { success(); }, false);
                            node.addEventListener("error", function () { error(); }, false);
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
            }()),

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
         * @param {boolean} hydrating Indicates that this module is being hydrated and should not be initialized automatically
         *
         */
        Module = Token.tokens(function (
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
                    module = new Module(name, Module.path(that[myPath], name), that, true);
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
                        v[MODULE_REFERENCE][hydrateModuleReferences](v, root, stack);
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
                 * Loads child module within the module <i>(Yo dawg! I heard you like modules...)</i>.
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
                                fail(new Error("Failed to load module \"" + name + "\""));
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

            defConstant("path", function (path, name) {
                return path + "/node_modules/" + name;
            });
        }),

        /**
         * The loader class responsible for loading the various dependencies between modules and assets
         *
         * @class modl.Loader
         * @extends modl.Ready
         * @constructor
         * @private
         */
        Loader = Token.tokens(function (
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

                        forEach(t[usesOrder], function (u) { args.push(loadedUses[u]); });
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
                 * @param {string} [alias] An optional alias which to be named within the
                 *            <b>imports</b> object.
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
                 * can be overwritten with any value this asset may want to publish (<i>a
                 * la</i> nodejs module system).
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
        }),

        Bilbo = (function () {
            var bags = {},

                /**
                 * The standard bilbo's bag.
                 *
                 * @class modl.Bilbo.Bag
                 * @constructor
                 *
                 * @param {string} name The bag's name
                 */
                Bag = Token.tokens(function (
                    myName,
                    stuff
                ) {
                    var builder = function (type) {
                        var F = function () {};
                        F.prototype = type.prototype;
                        return function (args) {
                            var stuff = new F(),
                                result = type.apply(stuff, slice(args));

                            if (objToStringCall(result) === "[object Object]") {
                                stuff = result;
                            }

                            return stuff;
                        };
                    };


                    return type(that(function (that, name) {
                        myName.mark(that, name);
                        stuff.mark(that, {});
                    })).

                    proto({

                        /**
                         * Return the bag's name
                         *
                         * @method name
                         * @for modl.Bilbo.Bag
                         *
                         * @return {string}
                         */
                        name: function () {
                            return this[myName];
                        },

                        /**
                         * Empties the bag, and vanishes it removing it from bilbo
                         * altogether.
                         *
                         * @method vanish
                         * @for modl.Bilbo.Bag
                         */
                        vanish: that(function (that) {
                            that.empty();
                            delete bags[that[myName]];
                        }),

                        /**
                         * Empties the bag, removing all stored stuff from within
                         *
                         * @method empty
                         * @for modl.Bilbo.Bag
                         */
                        empty: function () {
                            this[stuff] = {};
                        },

                        /**
                         * Tries to grab a stored stuff. If a given thing can't be found
                         * within the bag, it throws an error.
                         *
                         * It may also receive aditional arguments if the storage method
                         * supports varargs.
                         *
                         * @method grab
                         * @for modl.Bilbo.Bag
                         * @param {string} name The thing's name
                         * @param {mixed} [args*] Optional arguments passed to stored thing if supported
                         * @return {mixed}
                         */
                        grab: that(function (that, name) {
                            if (!hop(that[stuff], name)) {
                                throw new Error("Couldn't find stuff: " + name);
                            }

                            return that[stuff][name].apply(null, slice(arguments, 2));
                        }),

                        /**
                         * Stores an object within this bag under a given name. When
                         * <code>grab</code> is called, it will give a new object
                         * having the previous object as prototype.
                         *
                         * @method prototype
                         * @for modl.Bilbo.Bag
                         * @param {string} name The given name
                         * @param {object} proto The object to be used as prototype
                         */
                        prototype: function (name, proto) {
                            this[stuff][name] = function () {
                                var F = function () {};
                                F.prototype = proto;
                                return new F();
                            };
                        },

                        /**
                         * Stores something within the bag itself. When
                         * <code>grab</code> is called, it will give it back as is.
                         *
                         * @method stuff
                         * @for modl.Bilbo.Bag
                         * @param {string} name The given name
                         * @param {mixed} thing The thing to be stored
                         */
                        stuff: function (name, thing) {
                            this[stuff][name] = function () {
                                return thing;
                            };
                        },

                        /**
                         * Stores a lazy initializer. When <code>grab</code> is
                         * called, it will call the lazy function and return it's value.
                         * Subsequent calls will always receive the same value.
                         *
                         * The lazy function may receive aditional arguments upon
                         * calling <code>grab</code> as varargs
                         *
                         * @method lazy
                         * @for modl.Bilbo.Bag
                         * @param {string} name The given name
                         * @param {function} lazy The lazy function
                         */
                        lazy: that(function (that, name, lazy) {
                            that[stuff][name] = args(function (args) {
                                var lazyStuff;
                                that[stuff][name] = function () {
                                    return lazyStuff;
                                };

                                lazyStuff = lazy.apply(null, args);
                                return lazyStuff;
                            });
                        }),

                        /**
                         * Stores a factory function. When <code>grab</code> is
                         * called, it will call the factory function and return it's
                         * value.
                         *
                         * The factory function may receive aditional arguments upon
                         * calling <code>grab</code> as varargs
                         *
                         * @method factory
                         * @for modl.Bilbo.Bag
                         * @param {string} name The given name
                         * @param {function} factory The factory function
                         */
                        factory: function (name, factory) {
                            this[stuff][name] = args(function (args) {
                                return factory.apply(null, args);
                            });
                        },

                        /**
                         * Stores a constructor to be used as a singleton. When
                         * <code>grab</code> is called, it will instantiate the object
                         * using the <code>type</code> as a constructor for it.
                         * Subsequent calls will always receive the same instance.
                         *
                         * The constructor may receive aditional arguments upon calling
                         * <code>grab</code> as varargs
                         *
                         * @method singleton
                         * @for modl.Bilbo.Bag
                         * @param {string} name The given name
                         * @param {function} type The singleton constructor
                         */
                        singleton: function (name, type) {
                            var singletonBuilder = builder(type);
                            this.lazy(name, function () {
                                return singletonBuilder(arguments);
                            });
                        },

                        /**
                         * Stores a constructor to be used as a type constructor. When
                         * <code>grab</code> is called, it will instantiate the object
                         * using the <code>type</code> as a constructor for it.
                         *
                         * The constructor may receive aditional arguments upon calling
                         * <code>grab</code> as varargs
                         *
                         * @method type
                         * @for modl.Bilbo.Bag
                         * @param {string} name The given name
                         * @param {function} type The type constructor
                         */
                        type: function (name, type) {
                            var typeBuilder = builder(type);
                            this[stuff][name] = function () {
                                return typeBuilder(arguments);
                            };
                        },

                        /**
                         * Registers a thing within the bag itself with a
                         * specific storage method. The bag looks for a property
                         * named "precious" or "〇" (Unicode Character
                         * 'IDEOGRAPHIC NUMBER ZERO' (U+3007)) within the thing.
                         * The property may have the following values as hints:
                         * <b>"prototype"</b>, <b>"lazy"</b>, <b>"singleton"</b>,
                         * <b>"factory"</b>, <b>"type"</b>, and <b>"stuff"</b>.
                         * The default storage method is <b>"singleton"</b> for
                         * functions or <b>"stuff"</b> for objects.
                         *
                         * @method register
                         * @for modl.Bilbo.Bag
                         *
                         * @param {string} name The thing's name
                         * @param {mixed} stuff The stuff to be registered
                         */
                        register: that(function (that, name, stuff) {
                            var precious = stuff["\u3007"] || stuff.precious;
                            if (["prototype", "lazy", "singleton", "factory", "type", "stuff"].indexOf(precious) !== -1) {
                                that[precious](name, stuff);
                            } else if (typeof stuff === "function") {
                                that.singleton(name, stuff);
                            } else {
                                that.stuff(name, stuff);
                            }
                        })
                    });
                }),

                /**
                 * The MockingBag is a bag creates and stores empty objects when things
                 * are not found within. It's intended for <b>testing</b> usage.
                 *
                 * When the bag creates objects it will store them with the "stuff"
                 * storage method. Like so, modifying objects will modify created
                 * references within.
                 *
                 * @class modl.Bilbo.MockingBag
                 * @extends modl.Bilbo.Bag
                 */
                MockingBag = Bag.descend().

                /**
                 * Just like {{#crossLink "modl.Bilbo.Bag"}}{{/crossLink}}'s
                 * grab method but when it cannot find stuff within, it creates a
                 * new object and stores within itself.
                 *
                 * @method grab
                 * @for modl.Bilbo.MockingBag
                 * @param {string} name The thing's name
                 * @return {mixed}
                 */
                proto("grab", that(function (that, name) {
                    try {
                        return MockingBag.ancestor.grab.call(that, name);
                    } catch (e) {
                        var mock = {};
                        that.stuff(name, mock);
                        return mock;
                    }
                }));

            /**
             * Bilbo baggins!
             *
             * @class modl.Bilbo
             * @static
             */
            return {

                /**
                 * Retrieves or creates a new bag
                 *
                 * @method bag
                 * @for modl.Bilbo
                 * @param {string} name The bag's name
                 * @return {modl.Bilbo.Bag}
                 */
                bag: function (name) {
                    name = String(name);

                    return hop(bags, name)?
                        bags[name]:
                        bags[name] = new Bag(name);
                },

                /**
                 * Creates and returns a <code>bilbo.MockingBag</code>
                 *
                 * @method mockingBag
                 * @for modl.Bilbo
                 * @param {string} name The bag's name
                 * @return {modl.bilbo.MockingBag}
                 */
                mockingBag: function (name) {
                    name = String(name);
                    var bag = new MockingBag(name);
                    bags[name] = bag;
                    return bag;
                },

                /**
                 * Gives a bag for bilbo to keep
                 *
                 * @param {modl.Bilbo.Bag} ba
                 */
                keep: function (bag) {
                    bags[bag.name()] = bag;
                },

                /**
                 * Vanishes all bags reseting bilbo to it's initial state. All bags
                 * will be emptied, existing references will still be valid, but all
                 * bags will have nothing inside.
                 *
                 * @method vanish
                 * @for modl.Bilbo
                 */
                vanish: function () {
                    forEach(bags, function (b) { b.vanish(); });
                },

                Bag: Bag,
                MockingBag : MockingBag
            };
        }()),

        modl = {

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
             * @param {string} [alias] An optional alias which to be named within the
             *            <b>imports</b> object.
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
             * can be overwritten with any value this asset may want to publish (<i>a
             * la</i> nodejs module system).
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
                merge(settings, options, validSettings);
                currentModule = new Module("", settings.root);
                rootModule = currentModule;
                Bilbo.vanish();
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

            /**
             * Exported utilities class from modl module system
             *
             * @class modl.Util
             * @static
             */
            Util: {

                /**
                 * Returns a function that when called returns always the same starting value
                 *
                 * @method constant
                 * @for modl.Util
                 *
                 * @param {mixed} value
                 * @return {function}
                 */
                constant: constant,

                /**
                 * A function that does nothing and returns undefined. Useful when you need a noop function
                 *
                 * @method k
                 * @for modl.Util
                 */
                k: k,

                /**
                 * Returns a function that whe called, passes the arguments
                 * collection as an array to the passed function as its first
                 * parameter.
                 *
                 * @method args
                 * @for modl.Util
                 *
                 * @param {function} f
                 *
                 * @return {function}
                 */
                args: args,

                /**
                 * Processes the function on the next tick
                 *
                 * @method work
                 * @for modl.Util
                 *
                 * @param {function} f
                 */
                work: work,

                /**
                 * Short for object.hasOwnProperty(property)
                 *
                 * @method hop
                 * @for modl.Util
                 *
                 * @param {Object} object
                 * @param {string} property
                 *
                 * @return {boolean}
                 */
                hop: hop,

                /**
                 * Copy the properties from the "source" object onto the
                 * "target" object. Optionally it can be passed an array
                 * containing the property-list to be copied, if ommited, all
                 * own properties should be copied.
                 *
                 * @method merge
                 * @for modl.Util
                 *
                 * @param {Object} target
                 * @param {Object} source
                 * @param {array} [propertyList]
                 */
                merge: merge,

                /**
                 * Looks for the first ocurrence that satisfies the conditional
                 * function of a given value within an array or an object,
                 * returning its index or property.
                 *
                 * The conditional function will be called for each item within
                 * the collection, it will receive the item as first parameter
                 * and its index as the second. The function must return a
                 * boolean indicating whether the condition has been met.
                 *
                 * @method indexOf
                 * @for modl.Util
                 *
                 * @param {array|object} collection
                 * @param {function} condition
                 *
                 * @return {number|string}
                 */
                indexOf: indexOf,

                /**
                 * Returns the first ocurrence that satisfies the conditional
                 * function of a given value within an array or an object.
                 *
                 * The conditional function will be called for each item within
                 * the collection, it will receive the item as first parameter
                 * and its index as the second. The function must return a
                 * boolean indicating whether the condition has been met.
                 *
                 * If the function is ommited, it will return the first item
                 * within the collection.
                 *
                 * @method first
                 * @for modl.Util
                 *
                 * @param {array|object} collection
                 * @param {function} [condition]
                 *
                 * @return {mixed}
                 */
                first: first,

                /**
                 * Executes a function for each item within the collection
                 * (array or object), passing the item itself as the first
                 * parameter and it's index as the second parameter.
                 *
                 * @method forEach
                 * @for modl.Util
                 *
                 * @param {array|object} collection
                 * @param {function} f
                 */
                forEach: forEach,

                /**
                 * Iterates through the items of a collection, calling the map
                 * function for each of those items, passing the item itself as
                 * first parameter and it's index as the second parameter. The
                 * function's return will be pushed to a new array that will be
                 * returned in the end.
                 *
                 * @method map
                 * @for modl.Util
                 *
                 * @param {array|object} collection
                 * @param {function} f
                 *
                 * @return {array}
                 */
                map: map,

                /**
                 * Short for:
                 * var args = Array.prototype.slice.call(arguments);
                 * return Array.prototype.slice.apply(args.shift(), args);
                 *
                 * @method slice
                 * @for modl.Util
                 *
                 * @param {mixed} collection
                 * @param {number} [begin=0]
                 * @param {number} [end]
                 *
                 * @return {array}
                 */
                slice: slice,

                /**
                 * Kind of a method overloading. It should be called passing
                 * various functions, each with a different number of declared
                 * parameters.
                 *
                 * It will return a function that depending of the number of
                 * arguments passed, will call the respective function. If there
                 * is no respective function for a given number of arguments,
                 * the latter function will be used as default.
                 *
                 * @method overload
                 * @for modl.Util
                 *
                 * @param {function} functions*
                 *
                 * @return {function}
                 */
                overload: overload,

                /**
                 * Returns a function that when called, it will pass the _this_
                 * object as first parameter, along with the remaining
                 * parameters if any.
                 *
                 * @method that
                 * @for modl.Util
                 *
                 * @param {function} thatFunction
                 *
                 * @return {function}
                 */
                that: that,

                /**
                 * Method used to create a new class using the functionality
                 * described in the pseudo {{#crossLink "modl.Type"}}{{/crossLink}} class
                 *
                 * @method type
                 * @for modl.Util
                 *
                 * @param {function} constructor
                 *
                 * @return {function}
                 */
                type: type,

                /**
                 * Inherit the prototype methods from one constructor into
                 * another. The prototype of constructor will be set to a new
                 * object created from superConstructor.
                 *
                 * As an additional convenience, superConstructor.prototype will
                 * be accessible through the constructor.ancestor property,
                 * along with other facilities within the modl's type sugar.
                 *
                 * The method returns the constructor reference.
                 *
                 * @method inherits
                 * @for modl.Util
                 *
                 * @param {function} constructor
                 * @param {function} superConstructor
                 *
                 * @return {function}
                 */
                inherits: inherits,

                /**
                 * Creates the prototype bond between a constructor and its
                 * superConstructor, nothing more.
                 *
                 * @method bond
                 * @for modl.Util
                 *
                 * @param {function} constructor
                 * @param {function} superConstructor
                 *
                 * @return {function}
                 */
                bond: bond,

                /**
                 * A reference to the undefined value
                 *
                 * @property undef
                 * @for modl.Util
                 * @type undefined
                 * @final
                 */
                undef: undef,

                /**
                 * Shortcut for {{#crossLink "modl.Token/tokens:method"}}{{/crossLink}}'s method
                 *
                 * @method tokens
                 * @for modl.Util
                 * @static
                 *
                 * @return {mixed}
                 */
                tokens: function (f) { return Token.tokens.call(Token, f); }
            },

            Bilbo: Bilbo,
            Token: Token
        };

    main.modl = modl;

    if (node) {
        module.exports = modl;
    }

}(typeof exports !== "undefined" && global.exports !== exports));