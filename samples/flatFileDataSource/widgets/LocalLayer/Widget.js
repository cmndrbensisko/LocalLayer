/*global define, window, dojo*/
define([
        'dojo/_base/declare',
        'jimu/BaseWidget',
        'jimu/ConfigManager',
        'jimu/MapManager',
        'jimu/utils',
        'esri/urlUtils',
        'dojo/io-query',
        'dojo/_base/lang',
        'dojo/_base/array',
        'dojo/_base/query',
        'dojo/Deferred',
        'dojo/topic',
        'dojo/aspect',
        'jimu/WidgetManager',
        'dojo/domReady!'
    ],
    function(
        declare,
        BaseWidget,
        ConfigManager,
        MapManager,
        utils,
        urlUtils,
        ioQuery,
        lang,
        array,
        query,
        Deferred,
        topic,
        aspect,
        WidgetManager) {
        var clazz = declare([BaseWidget], {
            constructor: function() {
                _initDone = false
                this.widgetManager = WidgetManager();
                var loadWidgetViaWidgetManager = aspect.around(window._widgetManager, "loadWidgetResources", lang.hitch(this, function(originalFunction) {
                    return function(setting) {
                        var around = new Deferred()
                        if (_initDone) {
                            loadWidgetViaWidgetManager.remove()
                            originalFunction.call(this, setting).then(function(resources) {
                                around.resolve(resources)
                            });
                        } else {
                            topic.subscribe("localLayersLoaded", lang.hitch(this, function() {
                                loadWidgetViaWidgetManager.remove()
                                originalFunction.call(this, setting).then(function(resources) {
                                    around.resolve(resources)
                                })
                            }))
                        }
                        return around;
                    };
                }), true)
                var loadWidgetViaPanelManager = aspect.around(window._panelManager, "showPanel", lang.hitch(this, function(originalFunction) {
                    return function(setting) {
                        var around = new Deferred()
                        if (_initDone) {
                            loadWidgetViaPanelManager.remove()
                            originalFunction.call(this, setting).then(function(resources) {
                                around.resolve(resources)
                            });
                        } else {
                            topic.subscribe("localLayersLoaded", lang.hitch(this, function() {
                                loadWidgetViaPanelManager.remove()
                                originalFunction.call(this, setting).then(function(resources) {
                                    around.resolve(resources)
                                })
                            }))
                        }
                        return around;
                    };
                }), true)
                require(['widgets/LocalLayer/llw'], lang.hitch(this, function(ok) {
                    var ok = ok()
					if (!this.config){
						this.config = _viewerMap.config;
					}
                    ok.config = this.config;
                    ok.startup()
                }));
            }
        })
        return clazz;
    });