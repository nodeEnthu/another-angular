/* jshint globalstrict: true */  
'use strict' ;

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [];
    this.$$phsae = null;
    this.$$applyAsyncQueue = [];
    this.$$applyAsyncId = null;
    this.$root = this;
    this.$$children = [];
    this.$$listeners = {};
}

function initFunction() {}
Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
    var self = this;
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function() {},
        last: initFunction,
        valueEq: !!valueEq
    };
    this.$$watchers.unshift(watcher);
    this.$root.$$lastDirtyWatch = null;
    return function() {
        var index = self.$$watchers.indexOf(watcher);
        if (index >= 0) {
            self.$$watchers.splice(index, 1);
            self.$root.$$lastDirtyWatch = null;
        }
    };
};
Scope.prototype.$$digestOnce = function() {
    var self = this,
        continueLoop = true,
        dirty;
    this.$$everyScope(function(scope) {
        dirty = false;
        var oldVal, newVal;
        _.forEachRight(scope.$$watchers, function(watcher) {
            oldVal = watcher.last;
            newVal = watcher.watchFn(scope);
            if (!scope.$$areEqual(newVal, oldVal, watcher.valueEq)) {
                watcher.last = (watcher.valueEq ? _.cloneDeep(newVal) : newVal);
                self.$root.$$lastDirtyWatch = watcher;
                watcher.listenerFn(newVal, ((oldVal === initFunction) ? newVal : oldVal), scope);
                dirty = true; // if even one of the watches is dirty, entire $$watchers will be iterated again
            } else if (self.$root.$$lastDirtyWatch === watcher) { //  function is only equal to itself
                dirty = false;
                return false;
            }
        });
        return continueLoop;
    });
    return dirty;
};
Scope.prototype.$digest = function() {
    this.$beginPhase("$digest");
    var dirty = true;
    var ttl = 0;
    this.$root.$$lastDirtyWatch = null;
    if (this.$root.$$applyAsyncId) {
        clearTimeout(this.$root.$$applyAsyncId); // clear the timeout as it runs $apply function
        this.$$flushApplyAsync(); // run all of em first
    }
    while (dirty || this.$$asyncQueue.length > 0) {
        while (this.$$asyncQueue.length > 0) {
            var asyncTask = this.$$asyncQueue.shift();
            asyncTask.scope.$eval(asyncTask.expression);
        }
        ttl = ttl + 1;
        dirty = this.$$digestOnce();
        if ((dirty || this.$$asyncQueue.length > 0) && ttl === 10) {
            this.$clearPhase();
            throw "10 digest iteratons reached";
        }
    }
    this.$clearPhase();
};
Scope.prototype.$$areEqual = function(newVal, oldVal, valueEq) {
    if (valueEq) {
        return _.isEqual(newVal, oldVal);
    } else return newVal === oldVal;
};
Scope.prototype.$eval = function(expr, locals) {
    return expr(this, locals);
};
Scope.prototype.$apply = function(expr) {
    this.$beginPhase("$apply");
    try {
        return this.$eval(expr);
    } finally {
        this.$clearPhase();
        this.$root.$digest();
    }
};
Scope.prototype.$evalAsync = function(expr) {
    var self = this;
    if (!this.$$phase && !this.$$asyncQueue.length) {
        setTimeout(function() {
            if (self.$$asyncQueue.length) {
                self.$root.$digest();
            }
        }, 0);
    }
    this.$$asyncQueue.push({
        scope: this,
        expression: expr
    });
};
Scope.prototype.$beginPhase = function(phase) {
    if (this.$$phase) {
        throw "digest loop is already going on bugger on";
    } else this.$$phase = phase;
};
Scope.prototype.$clearPhase = function() {
    this.$$phase = null;
};
Scope.prototype.$applyAsync = function(expr) {
    var self = this;
    self.$$applyAsyncQueue.push(function() {
        self.$eval(expr);
    });
    if (self.$root.$$applyAsyncId === null) { // this is to make sure setTimeout is ran only once
        self.$root.$$applyAsyncId = setTimeout(function() {
            self.$apply(_.bind(self.$$flushApplyAsync, self));
        }, 0);
    }
};
Scope.prototype.$$flushApplyAsync = function() {
    while (this.$$applyAsyncQueue.length) {
        this.$$applyAsyncQueue.shift()();
    }
    this.$root.$$applyAsyncId = null;
};
Scope.prototype.$watchGroup = function(watchFuncs, listenerFunc) {
    var self = this;
    var firstRun = true;
    var newVals = new Array(watchFuncs.length),
        oldVals = new Array(watchFuncs.length),
        changeScheduled = false;
    _.forEach(watchFuncs, function(watchFunc, index) {
        self.$watch(watchFunc, function(newVal, oldVal) {
            newVals[index] = newVal;
            oldVals[index] = oldVal;
            if (!changeScheduled) {
                changeScheduled = true;
                self.$evalAsync(watchGroupListener);
            }
        });
    });

    function watchGroupListener() {
        if (firstRun) {
            firstRun = false;
            listenerFunc(newVals, newVals, self);
        } else {
            listenerFunc(newVals, oldVals, self);
        }
        changeScheduled = false;
    }
};
Scope.prototype.$new = function(isolated, parent) {
    parent = parent || this;
    var child;
    if (isolated) {
        child = new Scope();
        child.$root = parent.$root;
        child.$$asyncQueue = parent.$$asyncQueue;
        child.$$postDigestQueue = parent.$$postDigestQueue;
        child.$$applyAsyncQueue = parent.$$applyAsyncQueue;
    } else {
        var Child = function() {};
        Child.prototype = this;
        child = new Child();
    }
    parent.$$children.push(child);
    child.$$watchers = [];
    child.$$children = [];
    child.$$listeners = {};
    return child;
};
Scope.prototype.$$everyScope = function(fn) {
    if (fn(this)) {
        return this.$$children.every(function(child) {
            return child.$$everyScope(fn);
        });
    } else {
        return false;
    }
};
Scope.prototype.$watchCollection = function(watchFn, listenerFn) {
    var self = this;
    var newValue;
    var oldValue;
    var oldLength;
    var veryOldValue;
    var trackVeryOldValue = (listenerFn.length > 1);
    var changeCount = 0;
    var firstRun = true;
    var internalWatchFn = function(scope) {
        var newLength, key;
        newValue = watchFn(scope);
        if (_.isObject(newValue)) {
            if (_.isArrayLike(newValue)) {
                if (!_.isArray(oldValue)) {
                    changeCount++;
                    oldValue = [];
                }
                if (newValue.length !== oldValue.length) {
                    changeCount++;
                    oldValue.length = newValue.length;
                }
                _.forEach(newValue, function(newItem, i) {
                    var bothNaN = _.isNaN(newItem) && _.isNaN(oldValue[i]);
                    if (!bothNaN && newItem !== oldValue[i]) {
                        changeCount++;
                        oldValue[i] = newItem;
                    }
                });
            } else {
                if (!_.isObject(oldValue) || _.isArrayLike(oldValue)) {
                    changeCount++;
                    oldValue = {};
                    oldLength = 0;
                }
                newLength = 0;
                _.forOwn(newValue, function(newVal, key) {
                    newLength++;
                    if (oldValue.hasOwnProperty(key)) {
                        var bothNaN = _.isNaN(newVal) && _.isNaN(oldValue[key]);
                        if (!bothNaN && oldValue[key] !== newVal) {
                            changeCount++;
                            oldValue[key] = newVal;
                        }
                    } else {
                        changeCount++;
                        oldLength++;
                        oldValue[key] = newVal;
                    }
                });
                if (oldLength > newLength) {
                    changeCount++;
                    _.forOwn(oldValue, function(oldVal, key) {
                        if (!newValue.hasOwnProperty(key)) {
                            oldLength--;
                            delete oldValue[key];
                        }
                    });
                }
            }
        } else {
            if (!self.$$areEqual(newValue, oldValue, false)) {
                changeCount++;
            }
            oldValue = newValue;
        }
        return changeCount;
    };
    var internalListenerFn = function() {
        if (firstRun) {
            listenerFn(newValue, newValue, self);
            firstRun = false;
        } else {
            listenerFn(newValue, veryOldValue, self);
        }
        if (trackVeryOldValue) {
            veryOldValue = _.clone(newValue);
        }
    };
    return this.$watch(internalWatchFn, internalListenerFn);
};
Scope.prototype.$on = function(eventName, listenerFn) {
    var self = this;
    this.$$listeners[eventName] = this.$$listeners[eventName] || [];
    this.$$listeners[eventName].push(listenerFn);
    return function() {
        var index = self.$$listeners[eventName].indexOf(listenerFn);
        if (index >= 0) {
            self.$$listeners[eventName].splice(index, 1);
        }
    };
};
Scope.prototype.$emit = function(eventName) {
    var additionalArgs = _.rest(arguments);
    this.$$fireEventOnScope(eventName, additionalArgs);
    return this.$$fireEventOnScope(eventName, additionalArgs);
};
Scope.prototype.$broadcast = function(eventName) {
    var additionalArgs = _.rest(arguments);
    this.$$fireEventOnScope(eventName, additionalArgs);
    return this.$$fireEventOnScope(eventName, additionalArgs);
};
Scope.prototype.$$fireEventOnScope = function(eventName, additionalArgs) {
    var event = {
        name: eventName
    };
    var listenerArgs = [event].concat(additionalArgs);
    var listeners = this.$$listeners[eventName] || [];
    _.forEach(listeners, function(listener) {
        listener.apply(null, listenerArgs);
    });
    return event;
};