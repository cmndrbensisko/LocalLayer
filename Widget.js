define([
	'dojo/_base/declare',
	'jimu/BaseWidget',
	'esri/urlUtils',
	'dojo/on',
	'dojo/_base/lang',
	'dojo/_base/array',
	"esri/InfoTemplate",
	"esri/dijit/PopupTemplate",
	"esri/dijit/BasemapGallery",
	"esri/dijit/BasemapLayer",
	"dojo/dom-construct",
	"dojo/_base/window",
	'dojo/domReady!'
  ],
  function(
	declare,
	BaseWidget,
	urlUtils, 
	on,
	lang,
	array,
	InfoTemplate,
	PopupTemplate,
	BasemapGallery,
	BasemapLayer,
	domConstruct,
	win) {
		var clazz = declare([BaseWidget], {
			startup: function() {
				if (this.config.LocalLayerWidget.useProxy){
					urlUtils.addProxyRule({
						urlPrefix: this.config.LocalLayerWidget.proxyPrefix,
						proxyUrl: this.config.LocalLayerWidget.proxyAddress
					});
				}
				this.config.LocalLayerWidget.layerJson.forEach(function(layer) {
					if (layer.type.toUpperCase() == "DYNAMIC"){
						layerProperties = {"id": layer.name};
						if(layer.opacity !== undefined) {
						  layerProperties.opacity = layer.opacity;
						}
						var _dynamicLayer = new esri.layers.ArcGISDynamicMapServiceLayer(layer.url,layerProperties);
						if (layer.popup){
							var finalInfoTemp = {}
							array.forEach(layer.popup.infoTemplates, function(_infoTemp){
								var _dynamicInfoTemplate = new InfoTemplate();
								_dynamicInfoTemplate.setTitle(_infoTemp.title);
								_dynamicInfoTemplate.setContent(_infoTemp.content);
								finalInfoTemp[_infoTemp.layerId] = {"infoTemplate": _dynamicInfoTemplate}
							});
							_dynamicLayer.setInfoTemplates(finalInfoTemp);
						}
						this._viewerMap.addLayer(_dynamicLayer)
						this._viewerMap.setInfoWindowOnClick(true)
					} else if (layer.type.toUpperCase() == "BASEMAP"){
						var _newBasemap = new esri.dijit.Basemap({"id":layer.name,"layers":[new BasemapLayer({url:layer.url})]})
							var _basemapGallery = new BasemapGallery({
							        showArcGISBasemaps: false,
							        map: this._viewerMap
							      }, "_tmpBasemapGallery");
							_basemapGallery.add(_newBasemap)
							_basemapGallery.select(layer.name)
							_basemapGallery.destroy();
					} else if (layer.type.toUpperCase() == "FEATURE"){
						var _popupTemplate;
						if (layer.popup){
							_popupTemplate = new PopupTemplate(layer.popup)
						}
						this._viewerMap.addLayer(new esri.layers.FeatureLayer(layer.url,{"id":layer.name,"infoTemplate": _popupTemplate}))
					}
				})
			}
		})
		return clazz;
	});