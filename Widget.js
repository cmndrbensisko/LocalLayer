/*global define*/
define([
 'dojo/_base/declare',
 'jimu/BaseWidget',
 'esri/urlUtils',
 'dojo/_base/array',
 'esri/layers/ArcGISDynamicMapServiceLayer',
 'esri/layers/FeatureLayer',
 'esri/layers/ImageParameters',
 'esri/dijit/BasemapGallery',
 'esri/dijit/BasemapLayer',
 'esri/dijit/Basemap',
 'esri/basemaps',
 'esri/dijit/PopupTemplate',
 'dojo/domReady!'
  ],
  function (
    declare,
    BaseWidget,
    urlUtils,
    array,
    ArcGISDynamicMapServiceLayer,
    FeatureLayer,
    ImageParameters,
    BasemapGallery,
    BasemapLayer,
    Basemap,
    esriBasemaps,
    PopupTemplate) {
    var clazz = declare([BaseWidget], {
      startup: function () {
        if (this.config.useProxy) {
          urlUtils.addProxyRule({
            urlPrefix: this.config.proxyPrefix,
            proxyUrl: this.config.proxyAddress
          });
        }

        this.config.layers.layer.forEach(function (layer) {
          var lLayer;
          var lOptions ={};
          if(layer.hasOwnProperty("opacity")){
            lOptions.opacity = layer.opacity;
          }
          if(layer.hasOwnProperty("visible") && !layer.visible){
            lOptions.visible = false;
          }else{
            lOptions.visible = true;
          }
          if(layer.name){
            lOptions.id = layer.name;
          }
          if(layer.type.toUpperCase() === "DYNAMIC"){
            if(layer.imageformat){
              var ip = new ImageParameters();
              ip.format = layer.imageformat;
              if(layer.hasOwnProperty("imagedpi")){
                ip.dpi = layer.imagedpi;
              }
              lOptions.imageParameters = ip;
            }
            lLayer = new ArcGISDynamicMapServiceLayer(layer.url, lOptions);
            if (layer.popup){
              var finalInfoTemp = {};
              array.forEach(layer.popup.infoTemplates, function(_infoTemp){
                var popupInfo = {
                  title: _infoTemp.title
                };
                if(_infoTemp.content){
                  popupInfo.description = _infoTemp.content;
                }else{
                  popupInfo.description = null;
                }
                if(_infoTemp.fieldInfos){
                  popupInfo.fieldInfos = _infoTemp.fieldInfos;
                }
                var _popupTemplate1 = new PopupTemplate(popupInfo);
                finalInfoTemp[_infoTemp.layerId] = {infoTemplate: _popupTemplate1};
              });
              lLayer.setInfoTemplates(finalInfoTemp);
            }
            if(layer.disableclientcaching){
              lLayer.setDisableClientCaching(true);
            }
            this._viewerMap.addLayer(lLayer);
            this._viewerMap.setInfoWindowOnClick(true);
          }else if (layer.type.toUpperCase() === "FEATURE") {
            var _popupTemplate;
            if (layer.popup){
              _popupTemplate = new PopupTemplate(layer.popup);
              lOptions.infoTemplate = _popupTemplate;
            }
            if(layer.hasOwnProperty("mode")){
              var lmode;
              if(layer.mode === "ondemand"){
                lmode = 1;
              }else if(layer.mode === "snapshot"){
                lmode = 0;
              }else if(layer.mode === "selection"){
                lmode = 2;
              }
              lOptions.mode = lmode;
            }
            if(layer.hasOwnProperty("autorefresh")){
              lOptions.refreshInterval = layer.autorefresh;
            }
            lLayer = new FeatureLayer(layer.url, lOptions);
            this._viewerMap.addLayer(lLayer);
          }else if(layer.type.toUpperCase() === "BASEMAP"){
            var bmLayers = array.map(layer.layers.layer, function(bLayer){
              var bmLayerObj = {url:bLayer.url, isReference: false};
              if(bLayer.displayLevels){
                bmLayerObj.displayLevels = bLayer.displayLevels;
              }
              if(layer.hasOwnProperty("opacity")){
                bmLayerObj.opacity = bLayer.opacity;
              }
              return new BasemapLayer(bmLayerObj);
            });
            var _newBasemap = new Basemap({id:"defaultBasemap", title:layer.name, layers:bmLayers});
            var _basemapGallery = new BasemapGallery({
              showArcGISBasemaps: false,
              map: this._viewerMap
            }, "_tmpBasemapGallery");
            _basemapGallery.add(_newBasemap);
            _basemapGallery.select("defaultBasemap");
            _basemapGallery.destroy();
          }
        });
      }
    });
    return clazz;
  });