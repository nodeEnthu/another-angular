/* jshint globalstrict: true */  
'use strict';

function setupModuleLoader(window) {
    var ensure = function(obj, name, factory) {
        return (obj[name] || (obj[name] = factory()));
    };
    var angular = ensure(window, 'angular', Object);
    angular.modules = ensure(angular, 'modules', Object);
    angular.module = ensure(angular, 'module', function() {
        return function(name, requires) {
            if (requires) {
                var newModule = createModule(name, requires);
                angular.modules[name] = newModule;
            }
            return angular.modules[name];
        };
    });
}


function createModule(name, requires) {
    var invokeQueue = [];
    var moduleInstance = {
        name: name,
        requires: requires,
        constant: invokeLater('constant'),
        provider: invokeLater('provider'),
        _invokeQueue: invokeQueue
    };

    function invokeLater(method) {
        return function() {
            invokeQueue.push([method, arguments]); // arguments : passed onto return func
            return moduleInstance;
        };
    }
    return moduleInstance;
}