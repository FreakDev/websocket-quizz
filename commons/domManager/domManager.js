define(['../utils'], function (utils) {

    var DomNode = function (node) {
        this._node = node;
        this._instructions = [];
        this.alive = true;

        this._cssClassCache = node.className.split(' ');
        this._cssClassBlueprint = node.className;
    }

    // reference to "native" dom object
    DomNode.prototype._node = null;

    // for of instructions for a node
    DomNode.prototype._instructions = [];

    // virtual node should be destroyed ?
    DomNode.prototype.alive = false;

    DomNode.prototype._cssClassCache = [];
    DomNode.prototype._cssClassBlueprint = "";

    DomNode.prototype._eventListeners = [];

    DomNode.prototype._addInstructions = function (type, payload) {

        if (KNOWN_INSTRUCTIONS.indexOf(type) === -1)
            return;

        var i=0, len = this._instructions.length;
        while (i<len) {
            if (this._instructions[i].type === type && this._instructions[i].actions.key === payload.key) {
                break;
            }
            i++;
        }

        if (i<len && this._instructions[i].type === type && this._instructions[i].actions.key === payload.key) {
            this._instructions.splice(i,1);
        }
        this._instructions.push({type: type, actions: payload});
    }

    DomNode.prototype.refreshDom = function () {

        var newClassName = this._cssClassCache.join(' ').trim();
        if (newClassName !== this._cssClassBlueprint) {
            this.prop('className', newClassName);
            this._cssClassBlueprint = newClassName;
        }

        this._instructions.forEach(function (instruction, id) {
            switch(instruction.type) {
                case 'prop':
                    this._node[instruction.actions.key] = instruction.actions.value;
                    break;
                case 'attr':
                    this._node.setAttribute(instruction.actions.key, instruction.actions.value);
                    break;
                case 'eventAdd':
                    this._node.addEventListener(instruction.actions.eventName, instruction.actions.callback);
                    break;
                case 'eventRemove':
                    this._node.removeEventListener(instruction.actions.eventName, instruction.actions.callback);
                    break;
            }
        }, this);

        this._instructions = [];
    };

    DomNode.prototype.destroy = function (keepListener) {
        if (!keepListener) {
            this._eventListeners.forEach(function (listenerConf) {
                this.off(listenerConf.event, listenerConf.callback);
            }, this);            
        }

        this.alive = false;
    };

    DomNode.prototype.getValue = function (key, isAttr) {
        var instr, found = false, i = 0, len = this._instructions.length;
        while (i < len && !found) {
            instr = this._instructions[i];
            if (instr.actions.key === key && (!isAttr && instr.type === 'prop' || isAttr && instr.type === 'attr')) {
                return instr.actions.value;
            }
        }

        if (isAttr) {
            return this._node.getAttribute(key)
        } else {
            return this._node[key];
        }
        return undefined;
    };   

    DomNode.prototype.attr = function (attr, value) {
        if (arguments.length === 1)
            return this.getValue(attr, true);

        this._addInstructions('attr', {key: attr, value: value});
        return this;
    };

    DomNode.prototype.prop = function (prop, value) {
        if (arguments.length === 1)
            return this.getValue(prop);

        this._addInstructions('prop', {key: prop, value: value});
        return this;
    };

    DomNode.prototype.on = function (event, callback) {
        this._eventListeners.push({eventName: event, callback: callback});
        this._addInstructions('eventAdd', {eventName: event, callback: callback});
        return this;
    };

    DomNode.prototype.off = function (event, callback) {
        this._addInstructions('eventRemove', {eventName: event, callback: callback});
        return this;
    };

    DomNode.prototype.html = function (html) {
        if (html === undefined) {
            return this.prop('innerHTML');
        }

        this._addInstructions('prop', {key: 'innerHTML', value: html});
        return this;
    };

    DomNode.prototype.data = function (key, value) {
        if (arguments.length === 1)
            return this.getValue('data-' + key, true);

        this._addInstructions('attr', {key: 'data-' + key, value: value});
        return this;
    };

    DomNode.prototype.addClass = function (value) {
        if (!this.hasClass(value))
            this._cssClassCache.push(value);

        return this;
    };

    DomNode.prototype.removeClass = function (value) {
        var indexOf = this._cssClassCache.indexOf(value);
        if (indexOf !== -1)
            this._cssClassCache.splice(indexOf, 1);

        return this;
    };

    DomNode.prototype.toggleClass = function (value) {
        if (!this.hasClass(value))
            this.addClass(value);
        else 
            this.removeClass(value);

        return this;
    };

    DomNode.prototype.hasClass = function (value) {
        return this._cssClassCache.indexOf(value) !== -1 ? true : false;
    };

    DomNode.prototype.after = function (delay, callback) {
        utils.after(delay * 1000, utils.bind(callback, this))

        return this;
    };

    var domManagerNodes = [],
        KNOWN_INSTRUCTIONS = ['prop', 'attr', 'class', 'eventAdd', 'eventRemove']
        ;
        

    var domManager = {
        _refreshDom: function () {

            var forgettableNodes = [];

            domManagerNodes.forEach(function (node, id) {
                if (!node.alive) {
                    forgettableNodes.push(id);
                } else {
                    node.refreshDom();
                }
            }, this);

            forgettableNodes.forEach(function (el, id) {
                delete domManagerNodes[id];
            });

        },
        query: function (selector) {
            var node;
            if (typeof selector === 'string') {
                node = document.querySelector(selector);
            } else {
                node = selector;
            }
            domManagerNodes.push(new DomNode(node));
            return domManagerNodes[domManagerNodes.length - 1];
        },
        queryAll: function (selector) {
            var results = [],
                nodes = utils.toArray(document.querySelectorAll(selector));
            nodes.forEach(function (node) {
                results.push(this.query(node));
            }, this);
            return results;
        },
        run: function () {
            var that = this;
            requestAnimationFrame(function () {
                that._refreshDom();
                that.run();
            });
        }
    };

    return domManager;

});