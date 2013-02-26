(function(global) {
    "use strict";

    var
        MODL_ASSET = "/modl",

        undef = void 0,

        node = typeof exports !== "undefined" && global.exports !== exports,
        validSettings = ["root"],

        settings = null,
        current,
        loadingAsset,

        hop = function(o, p) {
            return Object.prototype.hasOwnProperty.call(o, p);
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

        forEach = function(a, f) {
            indexOf(a, function(v, i) {
                f(v, i);
                return false;
            });
        },

        indexOf = function(a, f) {
            var i, l;

            if (Object.prototype.toString.call(a) === "[object Array]") {
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

        find = function(a, f) {
            var i = indexOf(a, f);
            if (i !== undef) {
                return a[i];
            }
        },

        every = function(a, f) {
            return indexOf(a, function(v, i) { return !f(v, i); }) === undef;
        },

        some = function(a, f) {
            return indexOf(a, function(v, i) { return f(v, i); }) !== undef;
        },

        type = function(specs) {
            var constr = specs.constr || function() {};
            if (specs.proto) {
                merge(constr.prototype, specs.proto);
            }

            constr.descend = function(specs) {
                var child = specs.constr || function() {},
                    F = function() {};

                F.prototype = constr.prototype;
                child.prototype = new F();
                child.prototype.constructor = child;
                child.ancestor = constr.prototype;

                if (specs.proto) {
                    merge(child.prototype, specs.proto);
                }

                return child;
            };

            return constr;
        },

        RESOURCE_RE = /([^\/]*)(\/.+)?/,
        ALIAS_RE = /(.*\/)?([^\/]+)$/,

        parseResource = function(require) {
            var matches = require.resource.match(RESOURCE_RE),
                alias = require.alias,
                module = matches[1],
                asset = matches[2],
                aliasRe;

            if (!alias) {
                if (module) {
                    if (asset) {
                        alias = asset.replace(ALIAS_RE, "$2");
                    } else {
                        alias = module;
                        asset = MODL_ASSET;
                    }
                } else {
                    alias = asset.replace(ALIAS_RE, "$2");
                }
            }

            if (!asset) {
                asset = MODL_ASSET;
            }

            return {
                module : matches[1],
                asset : asset,
                alias : alias
            };
        },

        loadScript = (function() {
            return node ?
                function(src) {
                    delete require.cache[src];
                    require(src);
                } :
                function(src) {
                    var s = document.createElement("script"),
                        d = document.documentElement;
                    s.src = src;
                    d.insertBefore(s, d.firstChild);
                };
        }()),

        Ready = type({
            constr : function() {
                merge(this, {
                    _readyStatus : false,
                    _callbacks : []
                });
            },

            proto : {
                _whenReady : function(f) {
                    if (this._readyStatus) {
                        f();
                    } else {
                        this._callbacks.push(f);
                    }
                },

                _ready : function() {
                    this._readyStatus = true;
                    forEach(this._callbacks, function(f) { f(); });
                }
            }
        }),

        Module = Ready.descend({
            constr : function(name, path) {

                merge(this, {
                    _name : name,
                    _path : path,
                    _modules : {},
                    _assets : {},
                    _module : { exports : {} }
                });

                Ready.call(this);
                this.initialize();
            },

            proto : {
                initialize : function() {
                    var that = this;

                    if (this._name !== "") {
                        this.asset("/modl").
                        when(function(err, asset) { that._ready(); });
                    } else {
                        this._ready();
                    }
                },

                asset : function(name) {
                    var future = new Future(),
                        asset;

                    if (name in this._assets) {
                        asset = this._assets[name];
                    } else {
                        asset = new Asset(name, this._path);
                        this._assets[name] = asset;
                    }

                    asset._whenReady(function() {
                        future.fulfill(null, asset._loader._modl.exports);
                    });

                    return future;
                },

                module : function(name) {
                    var future = new Future(),
                        module,
                        that = this;

                    if (name in this._modules) {
                        module = this._modules[name];
                    } else {
                        module = new Module(name, this._path + "/node_modules/" + name);
                        this._modules[name] = module;
                    }

                    current = module;

                    module._whenReady(function() {
                        current = that;
                        future.fulfill(null, module);
                    });

                    return future;
                }
            }
        }),

        Asset = Ready.descend({
            constr : function(name, path) {
                merge(this, {
                    _name : name,
                    _script : path + "/lib" + name + ".js"
                });

                Ready.call(this);
                this._load();
            },

            proto : {
                _load : function() {
                    loadingAsset = this;
                    loadScript(this._script);
                }
            }
        }),

        Join = type({
            constr : function() {
                merge(this, {
                    _futures : [],
                    _data : []
                });
            },

            proto : {
                add : function(future) {
                    var args = [],
                        that = this;

                    this._futures.push(future);
                    this._data.push(args);

                    future.when(function(err, data) {
                        args.push(err, data);
                        that._check();
                    });
                },

                _check : function() {
                    this._fulfilled = every(this._futures, function(f) {
                        return f._fulfilled;
                    });

                    if (this._fulfilled && this._when) {
                        this._when.call(null, this._data);
                    }
                },

                when : function(f) {
                    if (this._fulfilled) {
                        f(this._data);
                    } else {
                        this._when = f;
                    }
                }
            }
        }),

        Future = type({
            proto: {
                fulfill : function(err, data) {
                    this._err = err;
                    this._data = data;

                    if (this._fulfilled) {
                        throw new Error("Future already fulfilled");
                    }

                    this._fulfilled = true;
                    if (this._when) {
                        this._when.call(null, err, data);
                    }
                },

                when : function(f) {
                    if (this._fulfilled) {
                        f(this._err, this._data);
                    } else {
                        this._when = f;
                    }
                }
            }
        }),

        Loader = Ready.descend({
            constr : function() {
                merge(this, {
                    _requires : [],
                    _modl : {
                        imports : {},
                        exports : {}
                    },
                    _payload : function() {}
                });

                Ready.call(this);
            },

            proto : {
                require : function(resource, alias) {
                    this._requires.push({resource : resource, alias : alias});
                    return this;
                },

                exports : function(payload) {
                    if (loadingAsset) {
                        this._attachAsset(loadingAsset);
                        loadingAsset = undef;
                    }
                    this._payload = payload;
                    this._dispatch();
                },

                _attachAsset : function(asset) {
                    asset._loader = this;
                    this._whenReady(function() { asset._ready(); });
                },

                _dispatch : function() {
                    var that = this;
                    setTimeout(function() {
                        that._loadRequires().
                        when(function() {
                            that._payload.call(null, that._modl, that._modl.imports);
                            that._ready();
                        });
                    });
                },

                _loadRequires : function() {
                    var future = new Future(),
                        that = this,
                        requires = this._requires.slice(),

                        load = function(require) {
                            if (!require) {
                                return future.fulfill();
                            }

                            that._loadRequire(require).
                            when(function() { load(requires.shift()); });
                        };

                    load(requires.shift());
                    return future;
                },

                _loadRequire : function(require) {
                    var
                        resource,
                        module,
                        asset,
                        future = new Future(),
                        that = this,

                        when = function(err, asset) {
                            that._modl.imports[resource.alias] = asset;
                            future.fulfill();
                        };

                    resource = parseResource(require);
                    module = resource.module;
                    asset = resource.asset;

                    if (module) {
                        current.module(module).
                        when(function(err, module) {
                            module.asset(asset).
                            when(when);
                        });
                    } else {
                        current.asset(asset).
                        when(when);
                    }

                    return future;
                }
            }
        }),

        modl = {
            require : function(resource) {
                var loader = new Loader();
                return loader.require(resource);
            },

            exports : function(payload) {
                var loader = new Loader();
                loader.exports(payload);
            },

            setup : function(options) {
                settings = {};
                merge(settings, options, validSettings);
                current = new Module("", settings.root);
            }
        };

    if (node) {
        module.exports = modl;
    } else {
        global.modl = modl;
    }

}(this));