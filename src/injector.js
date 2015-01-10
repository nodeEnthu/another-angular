function createInjector(modulesToLoad) {
    var providerCache = {};
    var instanceCache = {};
    var loadedModules = {};
    var strictDi = (strictDi === true);
    var INSTANTIATING = {};
    var $provide = {
        constant: function(key, value) {
            instanceCache[key] = value;
        },
        provider: function(key, provider) {
            if (typeof provider === 'function') {
                provider = instantiate(provider);
            }
            providerCache[key + 'Provider'] = provider;
        }
    };
    var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
    var STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/mg;
    var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
    _.forEach(modulesToLoad, function loadModule(moduleName) {
        if (!loadedModules[moduleName]) {
            var module = angular.module(moduleName);
            loadedModules[moduleName] = 'loaded';
            if (!module) {
                throw " module with name: " + moduleName + "  does not exist";
            }
            _.forEach(module.requires, function(depModuleName) {
                loadModule(depModuleName);
            });
            _.forEach(module._invokeQueue, function(invokeArgs) {
                var methodToInvoke = invokeArgs[0];
                var argsToBeCalled = invokeArgs[1];
                $provide[methodToInvoke].apply($provide, argsToBeCalled);
            });
        }
    });

    function invoke(fn, self, locals) {
        self = self || null;
        fn.$inject = fn.$inject || annotate(fn);
        if (fn.$inject && (fn.$inject instanceof Array)) {
            var args = [];
            _.forEach(fn.$inject, function(injectedVal) {
                if (locals && locals[injectedVal]) {
                    args.push(locals[injectedVal]);
                } else if ((typeof injectedVal === 'string') && getService(injectedVal)) args.push(getService(injectedVal));
                else throw 'constants are not cached ' + injectedVal;
            });
            fn = (fn instanceof Array) ? fn[fn.length - 1] : fn;
            return fn.apply(self, args);
        }
    }

    function annotate(fn) {
        if (_.isArray(fn)) {
            return fn.slice(0, fn.length - 1);
        } else if (fn.$inject) {
            return fn.$inject;
        } else if (!fn.length) {
            return [];
        } else {
            if (strictDi) {
                throw 'fn is not using explicit annotation and ' +
                    'cannot be invoked in strict mode';
            }
            var source = fn.toString().replace(STRIP_COMMENTS, '');
            var argDeclaration = source.match(FN_ARGS);
            return _.map(argDeclaration[1].split(','), function(argName) {
                return argName.match(FN_ARG)[2];
            });
        }
    }

    function instantiate(fn, locals) {
        var Constr = function() {};
        Constr.prototype = fn.prototype;
        var instance = new Constr();
        invoke(fn, instance, locals);
        return instance;
    }

    function getService(name) {
        if (instanceCache.hasOwnProperty(name)) {
            if (instanceCache[name] === INSTANTIATING) {
                throw new Error('Circular Dependency found');
            }
            return instanceCache[name];
        } else if (providerCache.hasOwnProperty(name)) {
            return providerCache[name];
        } else if (providerCache.hasOwnProperty(name + 'Provider')) {
            instanceCache[name] = INSTANTIATING;
            try {
                var provider = providerCache[name + 'Provider'];
                var instance;
                instance = instanceCache[name] = invoke(provider.$get, provider);
                return instance;
            } finally {
                if (instanceCache[name] === INSTANTIATING) {
                    delete instanceCache[name];
                }
            }
        }
    }

    return {
        has: function(key) {
            return (instanceCache.hasOwnProperty(key) || providerCache.hasOwnProperty(key + 'Provider'));
        },
        get: getService,
        invoke: invoke,
        annotate: annotate,
        instantiate: instantiate
    };
}