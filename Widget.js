define([
	'dojo/_base/declare',
	'jimu/BaseWidget',
	'esri/urlUtils',
	'dojo/domReady!'
  ],
  function(
	declare,
	BaseWidget,
	urlUtils) {
		var clazz = declare([BaseWidget], {
			startup: function() {
				if (this.config.LocalLayerWidget.useProxy){
					urlUtils.addProxyRule({
						urlPrefix: this.config.LocalLayerWidget.proxyPrefix,
						proxyUrl: this.config.LocalLayerWidget.proxyAddress
					});
				}
				this.config.LocalLayerWidget.layerJson.forEach(function(layer) {
					this._viewerMap.addLayer(new esri.layers.ArcGISDynamicMapServiceLayer(layer.url,{"id":layer.name}))
				})
			}
		})
		return clazz;
	});