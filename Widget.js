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
	"esri/layers/ArcGISTiledMapServiceLayer",
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
	ArcGISTiledMapServiceLayer,
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
					layerOptions = {"id": layer.name};
					if(layer.opacity !== undefined) {layerOptions.opacity = layer.opacity;}
					if(layer.visible !== undefined) {layerOptions.visible = layer.visible;}
					
					if (layer.type.toUpperCase() == "DYNAMIC"){
						var _dynamicLayer = new esri.layers.ArcGISDynamicMapServiceLayer(layer.url,layerOptions)
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
							_popupTemplate = new PopupTemplate(layer.popup);
							layerOptions.infoTemplate = _popupTemplate;
						}
						var _featureLayer = new esri.layers.FeatureLayer(layer.url,layerOptions);
						this._viewerMap.addLayer(_featureLayer);
					} else if (layer.type.toUpperCase() =="TILED") {
						var _tiledLayer = new esri.layers.ArcGISTiledMapServiceLayer(layer.url,layerOptions);
						this._viewerMap.addLayer(_tiledLayer);
					}
				})
			}
		})
		return clazz;
	});