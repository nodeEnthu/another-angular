/* jshint globalstrict: true */
/* global createInjector: false, setupModuleLoader: false, angular: false */
'use strict';
describe('injector', function() {
    beforeEach(function() {
        delete window.angular;
        setupModuleLoader(window);
    });
    it('is defined', function() {
        var injector = createInjector([]);
        expect(injector).toBeDefined();
    });
    it('can register a constant to a module', function() {
        var module = angular.module('module', []);
        module.constant('anyConstant', 12);
        var injector = createInjector(['module']);
        expect(injector.has('anyConstant')).toBe(true);
    });
    it('loads the required modules of a module', function() {
        var module1 = angular.module('myModule', []);
        var module2 = angular.module('myOtherModule', ['myModule']);
        module1.constant('aConstant', 42);
        module2.constant('anotherConstant', 43);
        var injector = createInjector(['myOtherModule']);
        expect(injector.has('aConstant')).toBe(true);
        expect(injector.has('anotherConstant')).toBe(true);
    });
    it('loads the transitively required modules of a module', function() {
        var module1 = angular.module('myModule', []);
        var module2 = angular.module('myOtherModule', ['myModule']);
        var module3 = angular.module('myThirdModule', ['myOtherModule']);
        module1.constant('aConstant', 42);
        module2.constant('anotherConstant', 43);
        module3.constant('aThirdConstant', 44);
        var injector = createInjector(['myThirdModule']);
        expect(injector.has('aConstant')).toBe(true);
        expect(injector.has('anotherConstant')).toBe(true);
        expect(injector.has('aThirdConstant')).toBe(true);
    });
    it('detects circular dependencies', function() {
        var module1 = angular.module('module1', ['module2']);
        var module2 = angular.module('module2', ['module1']);
        createInjector(['module1']);
    });
    it('invokes function  with dependency injection', function() {
        var module = angular.module('module', []);
        module.constant('a', 1);
        module.constant('b', 2);
        var injector = createInjector(['module']);

        function sum(x, y) {
            return x + y;
        }
        sum.$inject = ['a', 'b'];
        expect(injector.invoke(sum)).toBe(3);
    });
    it('invokes a function with the given this context', function() {
        var module = angular.module('myModule', []);
        module.constant('a', 1);
        var injector = createInjector(['myModule']);
        var obj = {
            two: 2,
            fn: function(one) {
                return one + this.two;
            }
        };
        obj.fn.$inject = ['a'];
        expect(injector.invoke(obj.fn, obj)).toBe(3);
    });
    it('overrides dependencies with locals when invoking', function() {
        var module = angular.module('myModule', []);
        module.constant('a', 1);
        module.constant('b', 2);
        var injector = createInjector(['myModule']);
        var fn = function(one, two) {
            return one + two;
        };
        fn.$inject = ['a', 'b'];
        expect(injector.invoke(fn, undefined, {
            b: 3
        })).toBe(4);
    });
    describe('annotate', function() {
        it('returns the $inject annotation of a function when it has one', function() {
            var injector = createInjector([]);
            var fn = function() {};
            fn.$inject = ['a', 'b'];
            expect(injector.annotate(fn)).toEqual(['a', 'b']);
        });
        it('returns the array-style annotations of a function', function() {
            var injector = createInjector([]);
            var fn = ['a', 'b',
                function() {}
            ];
            expect(injector.annotate(fn)).toEqual(['a', 'b']);
        });
        it('invokes an array-annotated function with dependency injection', function() {
            var module = angular.module('myModule', []);
            module.constant('a', 1);
            module.constant('b', 2);
            var injector = createInjector(['myModule']);
            var fn = ['a', 'b',
                function(one, two) {
                    return one + two;
                }
            ];
            expect(injector.invoke(fn)).toBe(3);
        });
        it('instantiates an annotated constructor function', function() {
            var module = angular.module('myModule', []);
            module.constant('a', 1);
            module.constant('b', 2);
            var injector = createInjector(['myModule']);

            function Type(one, two) {
                this.result = one + two;
            }
            Type.$inject = ['a', 'b'];
            var instance = injector.instantiate(Type);
            expect(instance.result).toBe(3);
        });
        it('uses the prototype of the constructor when instantiating', function() {
            function BaseType() {}
            BaseType.prototype.getValue = function() {
                return 42;
            };

            function Type() {
                this.v = this.getValue();
            }
            Type.prototype = BaseType.prototype;
            var module = angular.module('myModule', []);
            var injector = createInjector(['myModule']);
            var instance = injector.instantiate(Type);
            expect(instance.v).toBe(42);
        });
        it('supports locals when instantiating', function() {
            var module = angular.module('myModule', []);
            module.constant('a', 1);
            module.constant('b', 2);
            var injector = createInjector(['myModule']);

            function Type(a, b) {
                this.result = a + b;
            }
            var instance = injector.instantiate(Type, {
                b: 3
            });
            expect(instance.result).toBe(4);
        });
    });
    describe('provider service', function() {
        it('allows registering a provider and uses its $get', function() {
            var module = angular.module('myModule', []);
            module.provider('a', {
                $get: function() {
                    return 42;
                }
            });
            var injector = createInjector(['myModule']);
            expect(injector.has('a')).toBe(true);
            expect(injector.get('a')).toBe(42);
        });
        it('allows dependency injection in the provider service', function() {
            var module = angular.module('module', []);
            module.constant('a', 1);
            module.provider('b', {
                $get: function(a) {
                    return a + 2;
                }
            });
            var injector = createInjector(['module']);
            expect(injector.get('b')).toBe(3);
        });
        it('injects the $get method of a provider lazily', function() {
            var module = angular.module('myModule', []);
            module.provider('b', {
                $get: function(a) {
                    return a + 2;
                }
            });
            module.provider('a', {
                $get: _.constant(1)
            });
            var injector = createInjector(['myModule']);
            expect(injector.get('b')).toBe(3);
        });
        it('instantiates a dependency only once', function() {
            var module = angular.module('myModule', []);
            module.provider('a', {
                $get: function() {
                    return {};
                }
            });
            var injector = createInjector(['myModule']);
            expect(injector.get('a')).toBe(injector.get('a'));
        });
        it('notifies the user about a circular dependency', function() {
            var module = angular.module('myModule', []);
            module.provider('a', {
                $get: function(b) {}
            });
            module.provider('b', {
                $get: function(c) {}
            });
            module.provider('c', {
                $get: function(a) {}
            });
            var injector = createInjector(['myModule']);
            expect(function() {
                injector.get('a');
            }).toThrowError(/Circular Dependency found/);
        });
        it('cleans up the circular marker when instantiation fails', function() {
            var module = angular.module('myModule', []);
            module.provider('a', {
                $get: function() {
                    throw 'Failing instantiation!';
                }
            });
            var injector = createInjector(['myModule']);
            expect(function() {
                injector.get('a');
            }).toThrow('Failing instantiation!');
            expect(function() {
                injector.get('a');
            }).toThrow('Failing instantiation!');
        });
        it('instantiates a provider if given as a constructor function', function() {
            var module = angular.module('myModule', []);
            module.provider('a', function AProvider() {
                this.$get = function() {
                    return 42;
                };
            });
            var injector = createInjector(['myModule']);
            expect(injector.get('a')).toBe(42);
        });
        it('injects another provider to a provider constructor function', function() {
            var module = angular.module('myModule', []);
            module.provider('a', function AProvider() {
                var value = 1;
                this.setValue = function(v) {
                    value = v;
                };
                this.$get = function() {
                    return value;
                };
            });
            module.provider('b', function BProvider(aProvider) {
                aProvider.setValue(2);
                this.$get = function() {};
            });
            var injector = createInjector(['myModule']);
            expect(injector.get('a')).toBe(2);
        });
        it('does not inject a provider to a $get constructor function', function() {
            var module = angular.module('myModule', []);
            module.provider('a', function AProvider() {
                this.$get = function() {
                    return 1;
                };
            });
            module.provider('b', function BProvider() {
                this.$get = function(aProvider) {
                    return aProvider.$get();
                };
            });
            var injector = createInjector(['myModule']);
            expect(function() {
                injector.get('b');
            }).toThrow();
        });
        it('does not inject a provider to invoke', function() {
            var module = angular.module('myModule', []);
            module.provider('a', function AProvider() {
                this.$get = function() {
                    return 1;
                };
            });
            var injector = createInjector(['myModule']);
            expect(function() {
                injector.invoke(function(aProvider) {});
            }).toThrow();
        });
        it('does not give access to providers through get', function() {
            var module = angular.module('myModule', []);
            module.provider('a', function AProvider() {
                this.$get = function() {
                    return 1;
                };
            });
            var injector = createInjector(['myModule']);
            expect(function() {
                injector.get('aProvider');
            }).toThrow();
        });
    });
});