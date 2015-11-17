/*global define, window, dojo*/
define([
 'dojo/_base/declare',
 'jimu/BaseWidget',
 'jimu/ConfigManager',
 'jimu/MapManager',
 'jimu/utils',
 'esri/urlUtils',
 'dojo/_base/lang',
 'dojo/_base/array',
 'dojo/_base/query',
 'dojo/topic',
 'esri/geometry/webMercatorUtils',
 'esri/layers/ArcGISDynamicMapServiceLayer',
 'esri/layers/ArcGISTiledMapServiceLayer',
 'esri/layers/FeatureLayer',
 'esri/layers/WebTiledLayer',
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
    utils,
    urlUtils,
    lang,
    array,
    query,
    topic,
    webMercatorUtils,
    ArcGISDynamicMapServiceLayer,
    ArcGISTiledMapServiceLayer,
    FeatureLayer,
    WebTiledLayer,
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
          var _currentExtent = dojo.clone(this.map.extent);
          var _changedData = {itemId:this._originalWebMap};
          var _newBasemap = topic.subscribe("mapChanged", function(_map){
            _newBasemap.remove();
            _map.setExtent(_currentExtent);
          });
          MapManager.getInstance().onAppConfigChanged(this.appConfig,'mapChange', _changedData);
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
          if(layer.hasOwnProperty('hidelayers')){
            if (layer.hidelayers){
              lOptions.hidelayers = []
              lOptions.hidelayers = layer.hidelayers.split(',');
            }
          }
          if(layer.hasOwnProperty('minScale')){
            lOptions.minScale = layer.minScale
          }
          if(layer.hasOwnProperty('maxScale')){
            lOptions.maxScale = layer.maxScale
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
            if(layer.name){
              lLayer._titleForLegend = layer.name;
              lLayer.title = layer.name;
              lLayer.noservicename = true;
            }
            if (layer.popup){
              var finalInfoTemp = {};
              array.forEach(layer.popup.infoTemplates, function(_infoTemp){
                var popupInfo = {};
                popupInfo.title = _infoTemp.title;
                if(_infoTemp.description){
                  popupInfo.description = _infoTemp.description;
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
              //set min/max scales if present
              if(lOptions.minScale){
                evt.layer.setMinScale(lOptions.minScale)
              }
              if(lOptions.maxScale){
                evt.layer.setMaxScale(lOptions.maxScale)
              }

              if (!lOptions.hasOwnProperty('hidelayers')){
                //This is wierd; esri's layerlist widget doesn't actually seem to follow the visibilities set in the mapservice.

                //make our own hidelayers object out of the default visibilities defined in the service
                lOptions.hidelayers = []
                array.forEach(evt.layer.layerInfos,function(layer){
                  if (layer.defaultVisibility == false){lOptions.hidelayers.push(layer.id)}
                })
              }
              var removeLayers = []
              //convert from a list of layers to hide to a list of layers to show
              for(var i=0;i<lOptions.hidelayers.length;i++){lOptions.hidelayers[i] = parseInt(lOptions.hidelayers[i])}
              var showLayers = []
              //get an array of all the layers
              array.forEach(evt.layer.layerInfos,function(layer){showLayers.push(layer.id)})
              //replace the hidelayers array with an inverse (shown layers only)
              array.forEach(lOptions.hidelayers,function(id){
                showLayers.splice(showLayers.indexOf(id),1)
              })
              lOptions.hidelayers = showLayers

              //set defaultvisibility for everything off by default
              array.forEach(evt.layer.layerInfos,function(layer){
                evt.layer.layerInfos[layer.id].defaultVisibility = false
              })
              //except for whats set in the config
              for(var i=0;i<lOptions.hidelayers.length;i++){
                evt.layer.layerInfos[lOptions.hidelayers[i]].defaultVisibility = true
              }
              //remove all grouplayers
              array.forEach(evt.layer.layerInfos,function(layer){
                if (layer.subLayerIds){
                   if (removeLayers.indexOf(layer.id) == -1){removeLayers.push(layer.id)};
                }
              })
              for(var i=0;i<lOptions.hidelayers.length;i++){
                var j=evt.layer.layerInfos[lOptions.hidelayers[i]].parentLayerId
                while(j > -1){
                  //has the parentlayer been turned on?
                  if (lOptions.hidelayers.indexOf(j) == -1){
                    //if the parent isnt in the visiblelayers, the child shouldn't be either.
                    if (removeLayers.indexOf(lOptions.hidelayers[i]) == -1){removeLayers.push(lOptions.hidelayers[i])}
                  }
                  j=evt.layer.layerInfos[j].parentLayerId
                }
              }
              //splice out the removelayers
              array.forEach(removeLayers,function(layerId){
                //take out removed ones, they mess up the layerlist
                if (lOptions.hidelayers.indexOf(layerId) > -1){lOptions.hidelayers.splice(lOptions.hidelayers.indexOf(layerId),1)};
              })

              //if hidelayers has been defined in the config AND it says no layers should be visible, pass the -1
              if(lOptions.hidelayers.length == 0){
                lOptions.hidelayers.push(-1);
              }

              evt.layer.setVisibleLayers(lOptions.hidelayers);
            });
            this._viewerMap.addLayer(lLayer);
            this._viewerMap.setInfoWindowOnClick(true);
          }else if (layer.type.toUpperCase() === 'WEBTILEDLAYER') {
            if(layer.hasOwnProperty('subdomains')){
              lOptions.subDomains = layer.subdomains;
            }
            if(layer.hasOwnProperty('autorefresh')){
              lOptions.refreshInterval = layer.autorefresh;
            }
            if(layer.hasOwnProperty('opacity')){
              lOptions.opacity = layer.opacity;
            }
            lLayer = new WebTiledLayer(layer.url,lOptions)
            lLayer.on('load',function(evt){
              //set min/max scales if present
              if(lOptions.minScale){
                evt.layer.setMinScale(lOptions.minScale)
              }
              if(lOptions.maxScale){
                evt.layer.setMaxScale(lOptions.maxScale)
              }
              evt.layer.name = lOptions.id;
            });
            this._viewerMap.addLayer(lLayer);
          }else if (layer.type.toUpperCase() === 'WEBTILEDBASEMAP') {
            lOptions.type = "WebTiledLayer"
            lOptions.url = layer.url
            if(layer.hasOwnProperty('subdomains')){
              lOptions.subDomains = layer.subdomains;
            }
            if(layer.hasOwnProperty('autorefresh')){
              lOptions.refreshInterval = layer.autorefresh;
            }
            if(layer.hasOwnProperty('opacity')){
              lOptions.opacity = layer.opacity;
            }
            if(layer.hasOwnProperty('copyright')){
              lOptions.copyright = layer.copyright;
            }
            var _newBasemap = new Basemap({id:'defaultBasemap', title:layer.name, layers:[new BasemapLayer(lOptions)]});
            var _basemapGallery = new BasemapGallery({
              showArcGISBasemaps: false,
              map: this._viewerMap
            }, '_tmpBasemapGallery');
            _basemapGallery.add(_newBasemap);
            _basemapGallery.select('defaultBasemap');
            _basemapGallery.destroy();
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
            if(layer.hasOwnProperty('showLabels')){
              lOptions.showLabels = true;
            }
            lLayer = new FeatureLayer(layer.url, lOptions);
            if(layer.name){
              lLayer._titleForLegend = layer.name;
              lLayer.title = layer.name;
              lLayer.noservicename = true;
            }
            lLayer.on('load',function(evt){
              //set min/max scales if present
              if(lOptions.minScale){
                evt.layer.setMinScale(lOptions.minScale)
              }
              if(lOptions.maxScale){
                evt.layer.setMaxScale(lOptions.maxScale)
              }
              evt.layer.name = lOptions.id;
            });
            this._viewerMap.addLayer(lLayer);
          }else if(layer.type.toUpperCase() === 'TILED'){
            if(layer.displayLevels){
              lOptions.displayLevels = layer.displayLevels.split(',');
            }
            if(layer.hasOwnProperty('autorefresh')){
              lOptions.refreshInterval = layer.autorefresh;
            }
            lLayer = new ArcGISTiledMapServiceLayer(layer.url, lOptions);
            lLayer.on('load', function(evt){
              //set min/max scales if present
              if(lOptions.minScale){
                evt.layer.setMinScale(lOptions.minScale)
              }
              if(lOptions.maxScale){
                evt.layer.setMaxScale(lOptions.maxScale)
              }
            })
            if(layer.name){
              lLayer._titleForLegend = layer.name;
              lLayer.title = layer.name;
              lLayer.noservicename = true;
            }
            if (layer.popup){
              var finalInfoTemp2 = {};
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
                var _popupTemplate2 = new PopupTemplate(popupInfo);
                finalInfoTemp2[_infoTemp.layerId] = {infoTemplate: _popupTemplate2};
              });
              lLayer.setInfoTemplates(finalInfoTemp2);
            }
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
          }else if(layer.type.toUpperCase() === 'GEOJSON'){
            dojo.xhrGet({
              url: lang.trim(layer.url || ""),
              handleAs: 'json',
              headers:{"X-Requested-With": ""}
            }).then(lang.hitch(this, function(restData) {
              if (layer.isValidGeoJson){
                restData = restData.features
              }
              var featureArray = []
              if (layer.popup){
                var _popupTemplate;
                if (layer.popup){
                  _popupTemplate = new PopupTemplate(layer.popup);
                  lOptions.infoTemplate = _popupTemplate;
                }
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
              if(layer.hasOwnProperty('showLabels')){
                lOptions.showLabels = true;
              }
              if (layer.symbol){
                var sym
                switch (layer.symbol.type){
                  case "esriSMS":
                    sym = new esri.symbol.SimpleMarkerSymbol(layer.symbol)
                    break;
                  case "esriSLS":
                    sym = new esri.symbol.SimpleLineSymbol(layer.symbol)
                    break;
                  case "esriSFS":
                    sym = new esri.symbol.SimpleFillSymbol(layer.symbol)
                    break;
                  case "esriPMS":
                    sym = new esri.symbol.PictureMarkerSymbol(layer.symbol)
                    break;
                  case "esriPFS":
                    sym = new esri.symbol.PictureFillSymbol(layer.symbol)
                    break;                    
                }
                var renderer = new esri.renderer.SimpleRenderer(sym)
              }
                var oidField = 0
              array.forEach(restData,function(geojsonpoint){
                if (!layer.isValidGeoJson){
                  geojsonpoint['OID'] = oidField
                  var wmPoint = webMercatorUtils.lngLatToXY(geojsonpoint[layer.longitude],geojsonpoint[layer.latitude]);
                }else{
                  geojsonpoint.properties['OID'] = oidField
                  var wmPoint = webMercatorUtils.lngLatToXY(geojsonpoint.geometry.coordinates[0],geojsonpoint.geometry.coordinates[1]);
                  geojsonpoint = geojsonpoint.properties;
                }
                oidField+=1;
                var point = new esri.geometry.Point(wmPoint[0], wmPoint[1], this._viewerMap.spatialReference)
                featureArray.push(new esri.Graphic(point,null,geojsonpoint));
              })
              var defFields = [{
                    "name": "OID",
                    "type": "esriFieldTypeOID",
                    "alias": "OID"
                  }
              ]
              if (layer.popup){
                array.forEach(layer.popup.fieldInfos, function(FI){
                  FI['name'] = FI.fieldName
                  FI['alias'] = FI.fieldName
                  FI['type'] = "esriFieldTypeString"
                  defFields.push(FI)
                })
              }
              var featureJson = {
                "fields": defFields,
                "geometryType": "esriGeometryPoint",
                "spatialReference": featureArray[0].geometry.spatialReference,
                "features": featureArray
              }
              var featureSet = new esri.tasks.FeatureSet(featureJson);
              var lLayer = new esri.layers.FeatureLayer({
                "layerDefinition": {
                  "geometryType": "esriGeometryPoint",
                  "fields": defFields
                },
                "featureSet": featureSet
              },lOptions);
              lLayer.setRenderer(renderer)
              if(layer.name){
                lLayer._titleForLegend = layer.name;
                lLayer.title = layer.name;
                lLayer.noservicename = true;
                lLayer.name = lOptions.id;
              }
              lLayer.on('load', function(evt){
                //set min/max scales if present
                if(lOptions.minScale){
                  evt.layer.setMinScale(lOptions.minScale)
                }
                if(lOptions.maxScale){
                  evt.layer.setMaxScale(lOptions.maxScale)
                }
              })
              this._viewerMap.addLayer(lLayer);
            }), lang.hitch(this, function(err){
              console.log('error')
            }));
          }
        });
      }
    });
    return clazz;
  });
