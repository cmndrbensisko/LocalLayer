/*global define*/
define([
 'dojo/_base/declare',
 'jimu/BaseWidget',
 'jimu/ConfigManager',
 'jimu/MapManager',
 'esri/urlUtils',
 'dojo/_base/array',
 'dojo/_base/query',
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
    ConfigManager,
    MapManager,
    urlUtils,
    array,
    query,
    ArcGISDynamicMapServiceLayer,
    FeatureLayer,
    ImageParameters,
    BasemapGallery,
    BasemapLayer,
    Basemap,
    esriBasemaps,
    PopupTemplate) {
    var clazz = declare([BaseWidget], {
      constructor: function() {
        this._originalWebMap = null;
      },

      onClose: function(){
        if (query('.jimu-popup.widget-setting-popup', window.parent.document).length === 0){
          var changedData = {itemId:this._originalWebMap};
          MapManager.getInstance(ConfigManager.getConfig(),this._originalWebMap).onAppConfigChanged(ConfigManager.getConfig(),'mapChange', changedData);
        }
      },

      _removeAllLayersExceptBasemap: function(){
        for(var l = this.map.layerIds.length - 1; l>1; l--){
          var lyr = this.map.getLayer(this.map.layerIds[l]);
          if(lyr){
            this.map.removeLayer(lyr);
          }
        }
        var f = this.map.graphicsLayerIds.length;
        while (f--){
          var fl = this.map.getLayer(this.map.graphicsLayerIds[f]);
          if(fl.declaredClass === 'esri.layers.FeatureLayer'){
            this.map.removeLayer(fl);
          }
        }
      },

      startup: function () {
        this._originalWebMap = this.map.webMapResponse.itemInfo.item.id;
        this._removeAllLayersExceptBasemap();
        if (this.config.useProxy) {
          urlUtils.addProxyRule({
            urlPrefix: this.config.proxyPrefix,
            proxyUrl: this.config.proxyAddress
          });
        }

        this.config.layers.layer.forEach(function (layer) {
          var lLayer;
          var lOptions ={};
          if(layer.hasOwnProperty('opacity')){
            lOptions.opacity = layer.opacity;
          }
          if(layer.hasOwnProperty('visible') && !layer.visible){
            lOptions.visible = false;
          }else{
            lOptions.visible = true;
          }
          if(layer.name){
            lOptions.id = layer.name;
          }
          if(layer.type.toUpperCase() === 'DYNAMIC'){
            if(layer.imageformat){
              var ip = new ImageParameters();
              ip.format = layer.imageformat;
              if(layer.hasOwnProperty('imagedpi')){
                ip.dpi = layer.imagedpi;
              }
              lOptions.imageParameters = ip;
            }
            lLayer = new ArcGISDynamicMapServiceLayer(layer.url, lOptions);
            if (layer.popup){
              var finalInfoTemp = {};
              array.forEach(layer.popup.infoTemplates, function(_infoTemp){
                var popupInfo = {};
                popupInfo.title = _infoTemp.title;
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
            lLayer.on('load',function(evt){
              var removeLayers = [];
              array.forEach(evt.layer.visibleLayers,function(layer){
                if (evt.layer.layerInfos[layer].parentLayerId>-1){
                  removeLayers.push(layer);
                }
              });
              array.forEach(removeLayers,function(layerId){
                evt.layer.visibleLayers.splice(evt.layer.visibleLayers.indexOf(layerId),1);
              });
            });
            this._viewerMap.addLayer(lLayer);
            this._viewerMap.setInfoWindowOnClick(true);
          }else if (layer.type.toUpperCase() === 'FEATURE') {
            var _popupTemplate;
            if (layer.popup){
              _popupTemplate = new PopupTemplate(layer.popup);
              lOptions.infoTemplate = _popupTemplate;
            }
            if(layer.hasOwnProperty('mode')){
              var lmode;
              if(layer.mode === 'ondemand'){
                lmode = 1;
              }else if(layer.mode === 'snapshot'){
                lmode = 0;
              }else if(layer.mode === 'selection'){
                lmode = 2;
              }
              lOptions.mode = lmode;
            }
            lOptions.outFields = ['*'];
            if(layer.hasOwnProperty('autorefresh')){
              lOptions.refreshInterval = layer.autorefresh;
            }
            lLayer = new FeatureLayer(layer.url, lOptions);
            this._viewerMap.addLayer(lLayer);
          }else if(layer.type.toUpperCase() === 'BASEMAP'){
            var bmLayers = array.map(layer.layers.layer, function(bLayer){
              var bmLayerObj = {url:bLayer.url, isReference: false};
              if(bLayer.displayLevels){
                bmLayerObj.displayLevels = bLayer.displayLevels;
              }
              if(layer.hasOwnProperty('opacity')){
                bmLayerObj.opacity = bLayer.opacity;
              }
              return new BasemapLayer(bmLayerObj);
            });
            var _newBasemap = new Basemap({id:'defaultBasemap', title:layer.name, layers:bmLayers});
            var _basemapGallery = new BasemapGallery({
              showArcGISBasemaps: false,
              map: this._viewerMap
            }, '_tmpBasemapGallery');
            _basemapGallery.add(_newBasemap);
            _basemapGallery.select('defaultBasemap');
            _basemapGallery.destroy();
          }
        });
      }
    });
    return clazz;
  });
