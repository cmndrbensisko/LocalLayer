/*global define, window, dojo*/
define([
    'dojo/_base/declare',
    'jimu/BaseWidget',
    'jimu/ConfigManager',
    'jimu/MapManager',
    'dojo/io-query',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/_base/query',
	'dojo/Deferred',
    'dojo/topic',
    'dojo/aspect',
    'esri/tasks/PrintTask',
    "esri/PopupTemplate",
    "esri/core/Collection",
    "esri/layers/BaseTileLayer",
    "esri/Basemap",
    "esri/widgets/BasemapGallery",
    'esri/layers/MapImageLayer',
    'esri/layers/TileLayer',
    'esri/layers/ImageryLayer',
    'esri/layers/FeatureLayer',
    'esri/layers/WebTileLayer',
    'esri/Color',
    'dojo/_base/json',
    'dojo/domReady!'
  ],
  function(
    declare,
    BaseWidget,
    ConfigManager,
    MapManager,
    ioQuery,
    lang,
    array,
    query,
    Deferred,
    topic,
    aspect,
    PrintTask,
    PopupTemplate,
    Collection,
    BaseTileLayer,
    Basemap,
    BasemapGallery,
    ArcGISDynamicMapServiceLayer,
    ArcGISTiledMapServiceLayer,
    ArcGISImageServiceLayer,
    FeatureLayer,
    WebTiledLayer,
    Color,
    dojoJSON) {
    var clazz = declare([BaseWidget], {
      constructor: function() {
      this._viewerMap = this.webScene
      },
      onClose: function() {

      },
      _removeAllLayersExceptBasemap: function(){

        for(var l = this.sceneView.map.layers.length - 1; l>1; l--){
          var lyr = this.sceneView.map.layers[l];
          if(lyr){
            this.sceneView.map.remove(lyr);
          }
        }
      },
      startup: function() {
        if (this.config.replaceLayers){
          this._removeAllLayersExceptBasemap();
        }
        var _layersToAdd=[];
        var _tablesToAdd=[];
        this.config.layers.layer.forEach(function(layer) {
          var lLayer;
          var lOptions = {};
          if (layer.hasOwnProperty('opacity')) {
            lOptions.opacity = layer.opacity;
          }
          if (layer.hasOwnProperty('visible') && !layer.visible) {
            lOptions.visible = false;
          } else {
            lOptions.visible = true;
          }
          if (layer.name) {
            lOptions.id = layer.name;
          }
          if (layer.hasOwnProperty('hidelayers')) {
            if (layer.hidelayers) {
              lOptions.hidelayers = []
              lOptions.hidelayers = layer.hidelayers.split(',');
            }
          }
          if (layer.hasOwnProperty('minScale')) {
            lOptions.minScale = layer.minScale
          }
          if (layer.hasOwnProperty('maxScale')) {
            lOptions.maxScale = layer.maxScale
          }
          if (layer.type.toUpperCase() === 'DYNAMIC') {
            lLayer = new ArcGISDynamicMapServiceLayer(layer.url, lOptions);
            if (layer.name) {
              lLayer._titleForLegend = layer.name;
              lLayer.title = layer.name;
              lLayer.noservicename = true;
            }
            lLayer.on('load', function(evt) {
              if (layer.popup) {
                var finalInfoTemp = {};
                array.forEach(layer.popup.infoTemplates, function(_infoTemp,index) {
                  var popupInfo = {};
                  popupInfo.title = _infoTemp.title;
                  if (_infoTemp.description) {
                    popupInfo.description = _infoTemp.description;
                  } else {
                    popupInfo.description = null;
                  }
                  if (_infoTemp.fieldInfos) {
                    popupInfo.fieldInfos = _infoTemp.fieldInfos;
                  }
                  if (_infoTemp.showAttachments){
                    popupInfo.showAttachments = true;
                  }
                  lLayer.findSublayerById(index).popupTemplate = new PopupTemplate(popupInfo)
                });
              }
            });
            _layersToAdd.push(lLayer);
          } else if (layer.type.toUpperCase() === 'IMAGE') {
            lOptions.imageServiceParameters = new ImageServiceParameters();
            var _popupTemplate;
            if (layer.popup) {
              _popupTemplate = new PopupTemplate(layer.popup);
              lOptions.infoTemplate = _popupTemplate;
            }
            lLayer = new ArcGISImageServiceLayer(layer.url, lOptions)
            lLayer.on('error', function(evt) {
			  			  _updateLayerInfos();
            })
            if (layer.hasOwnProperty('hideInLegend')) {
              lLayer.showLegend = !layer.hideInLegend
            }
            if (layer.name) {
              lLayer._titleForLegend = layer.name;
              lLayer.title = layer.name;
              lLayer.noservicename = true;
            }
            lLayer.on('load', function(evt) {
              if (lOptions.minScale) {
                evt.layer.setMinScale(lOptions.minScale)
              }
              if (lOptions.maxScale) {
                evt.layer.setMaxScale(lOptions.maxScale)
              }
              evt.layer.name = lOptions.id;
            });
            _layersToAdd.push(lLayer);
          } else if (layer.type.toUpperCase() === 'WEBTILEDLAYER') {
            if (layer.hasOwnProperty('subdomains')) {
              lOptions.subDomains = layer.subdomains;
            }
            if (layer.hasOwnProperty('autorefresh')) {
              lOptions.refreshInterval = layer.autorefresh;
            }
            if (layer.hasOwnProperty('opacity')) {
              lOptions.opacity = layer.opacity;
            }
            lLayer = new WebTiledLayer(layer.url, lOptions)
            lLayer.on('error', function(evt) {
			  			  _updateLayerInfos();
            })
            lLayer.on('load', function(evt) {
              if (lOptions.minScale) {
                evt.layer.setMinScale(lOptions.minScale)
              }
              if (lOptions.maxScale) {
                evt.layer.setMaxScale(lOptions.maxScale)
              }
              evt.layer.name = lOptions.id;
            });
            _layersToAdd.push(lLayer);
          } else if (layer.type.toUpperCase() === 'WEBTILEDBASEMAP') {
            lOptions.type = "WebTiledLayer"
            lOptions.url = layer.url
            if (layer.hasOwnProperty('subdomains')) {
              lOptions.subDomains = layer.subdomains;
            }
            if (layer.hasOwnProperty('autorefresh')) {
              lOptions.refreshInterval = layer.autorefresh;
            }
            if (layer.hasOwnProperty('opacity')) {
              lOptions.opacity = layer.opacity;
            }
            if (layer.hasOwnProperty('copyright')) {
              lOptions.copyright = layer.copyright;
            }
            var _newBasemap = new Basemap({
              id: 'defaultBasemap',
              title: layer.name,
              layers: [new BaseTileLayer(lOptions)]
            });
            var _basemapGallery = new BasemapGallery({
              showArcGISBasemaps: false,
              view: this._sceneView
            }, '_tmpBasemapGallery');
            _basemapGallery.source = new Collection().add(_newBasemap);
            _basemapGallery.activeBasemap = _newBasemap;
            _basemapGallery.destroy();
          } else if (layer.type.toUpperCase() === 'FEATURE') {
            var _popupTemplate;
            if (layer.popup) {
              _popupTemplate = new PopupTemplate(layer.popup);
              _popupTemplate.overwriteActions = true;
              lOptions.popupTemplate = _popupTemplate;
            }
            if (layer.flyPopups){
              lOptions.infoTemplate = new PopupTemplate({  
                fieldInfos: [{  
                  fieldName: "*",  
                  visible: true,  
                  label: "*"  
                }]
              })
            }
            if (layer.hasOwnProperty('mode')) {
              var lmode;
              if (layer.mode === 'ondemand') {
                lmode = 1;
              } else if (layer.mode === 'snapshot') {
                lmode = 0;
              } else if (layer.mode === 'selection') {
                lmode = 2;
              }
              lOptions.mode = lmode;
            }
            lOptions.outFields = ['*'];
            if (layer.hasOwnProperty('autorefresh')) {
              lOptions.refreshInterval = layer.autorefresh;
            }
            if (layer.hasOwnProperty('showLabels')) {
              lOptions.showLabels = true;
            }
            if (layer.hasOwnProperty('definitionQuery')) {
              lOptions.definitionExpression = layer.definitionQuery; 
            }
            lLayer = new FeatureLayer(layer.url, lOptions);
            if (layer.hasOwnProperty('hideInLegend')) {
              lLayer.showLegend = !layer.hideInLegend
            }
            if (layer.name) {
              lLayer._titleForLegend = layer.name;
              lLayer.title = layer.name;
              lLayer.noservicename = true;
            }
              _layersToAdd.push(lLayer);
          } else if (layer.type.toUpperCase() === 'TILED') {
            if (layer.displayLevels) {
              lOptions.displayLevels = layer.displayLevels.split(',');
            }
            if (layer.hasOwnProperty('autorefresh')) {
              lOptions.refreshInterval = layer.autorefresh;
            }
            lLayer = new ArcGISTiledMapServiceLayer(layer.url, lOptions);
            lLayer.on('error', function(evt) {
			  			  _updateLayerInfos();
            })
            lLayer.on('load', function(evt) {
              //set min/max scales if present
              if (lOptions.minScale) {
                evt.layer.setMinScale(lOptions.minScale)
              }
              if (lOptions.maxScale) {
                evt.layer.setMaxScale(lOptions.maxScale)
              }
            })
            if (layer.name) {
              lLayer._titleForLegend = layer.name;
              lLayer.title = layer.name;
              lLayer.noservicename = true;
            }
            if (layer.popup) {
              var finalInfoTemp2 = {};
              array.forEach(layer.popup.infoTemplates, function(_infoTemp) {
                var popupInfo = {};
                popupInfo.title = _infoTemp.title;
                if (_infoTemp.content) {
                  popupInfo.description = _infoTemp.content;
                } else {
                  popupInfo.description = null;
                }
                if (_infoTemp.fieldInfos) {
                  popupInfo.fieldInfos = _infoTemp.fieldInfos;
                }
                var _popupTemplate2 = new PopupTemplate(popupInfo);
                finalInfoTemp2[_infoTemp.layerId] = {
                  infoTemplate: _popupTemplate2
                };
              });
              lLayer.setInfoTemplates(finalInfoTemp2);
            }
            _layersToAdd.push(lLayer);
          } else if (layer.type.toUpperCase() === 'BASEMAP') {
            var bmLayers = array.map(layer.layers.layer, function(bLayer) {
              var bmLayerObj = {
                url: bLayer.url,
                isReference: false
              };
              if (bLayer.displayLevels) {
                bmLayerObj.displayLevels = bLayer.displayLevels;
              }
              if (layer.hasOwnProperty('opacity')) {
                bmLayerObj.opacity = bLayer.opacity;
              }
              return new ArcGISTiledMapServiceLayer(bmLayerObj);
            });
            var _newBasemap = new Basemap({
              id: 'defaultBasemap',
              title: layer.name,
              baseLayers: new Collection().addMany(bmLayers)
            });
            var _basemapGallery = new BasemapGallery({
              showArcGISBasemaps: false,
              view: this._sceneView
            }, '_tmpBasemapGallery');
            _basemapGallery.source = new Collection().add(_newBasemap);
            _basemapGallery.activeBasemap = _newBasemap;
            //_basemapGallery.select('defaultBasemap');
            _basemapGallery.destroy();
          } else if (layer.type.toUpperCase() === 'WMS') {
            lLayer = new WMSLayer(layer.url)
            if (layer.name) {
              lLayer._titleForLegend = layer.name;
              lLayer.title = layer.name;
              lLayer.noservicename = true;
            }
            _layersToAdd.push(lLayer);
            lLayer.on('error', function(evt) {
			  			  _updateLayerInfos();
            })
            lLayer.on("load",lang.hitch(this,function(_layer){
              _layer.layer.title = layer.name
              if (layer.hasOwnProperty('opacity')) {
                _layer.layer.opacity = layer.opacity;
              }
              if (layer.hasOwnProperty('visible') && !layer.visible) {
                _layer.layer.visible = false;
              } else {
                _layer.layer.visible = true;
              }
              if (layer.hasOwnProperty('autorefresh')) {
                _layer.layer.refreshInterval = layer.autorefresh;
              }
              if (layer.maxScale){
                _layer.layer.maxScale = layer.maxScale
              }
              if (layer.minScale){
                _layer.layer.minScale = layer.minScale
              }
              _layer.layer.layerInfos = layer.resourceInfo.layerInfos
              _layer.layer.setVisibleLayers(layer.visibleLayers)
            }))
            this._viewerMap.setInfoWindowOnClick(true);
          } else if (layer.type.toUpperCase() === 'GEOJSON') {
			  _hasGeoRSS=true;
			  _geoRSSCount += 1;
            dojo.xhrGet({
              url: lang.trim(layer.url || ""),
              handleAs: 'json',
              headers: {
                "X-Requested-With": ""
              }
            }).then(lang.hitch(this, function(restData) {
				_geoRSSReturned += 1;
              if (layer.isValidGeoJson) {
                restData = restData.features
              }
              var featureArray = []
              if (layer.popup) {
                var _popupTemplate;
                if (layer.popup) {
                  _popupTemplate = new PopupTemplate(layer.popup);
                  lOptions.infoTemplate = _popupTemplate;
                }
              }
              if (layer.hasOwnProperty('mode')) {
                var lmode;
                if (layer.mode === 'ondemand') {
                  lmode = 1;
                } else if (layer.mode === 'snapshot') {
                  lmode = 0;
                } else if (layer.mode === 'selection') {
                  lmode = 2;
                }
                lOptions.mode = lmode;
              }
              lOptions.outFields = ['*'];
              if (layer.hasOwnProperty('autorefresh')) {
                lOptions.refreshInterval = layer.autorefresh;
              }
              if (layer.hasOwnProperty('showLabels')) {
                lOptions.showLabels = true;
              }
              if (layer.symbol) {
                var sym
                switch (layer.symbol.type) {
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
              if (layer.subArray){
                restData = lang.getObject(layer.subArray,false,restData)
              }
              var geomType = layer.geometryType;
              array.forEach(restData, function(geojsonpoint) {
                if (!layer.isValidGeoJson) {
                  geojsonpoint['OID'] = oidField
                  var geom
                  if (geomType == "esriGeometryPolyline"){
                    var newArray = []
                    array.forEach(geojsonpoint.line,lang.hitch(this,function(linepoint){
                      var tempPoint = webMercatorUtils.lngLatToXY(linepoint.x,linepoint.y)
                      newArray.push(tempPoint)
                    }))
                    geom = new esri.geometry.Polyline(newArray);
                    geom.setSpatialReference(this._viewerMap.spatialReference)
                  }else if (geomType == "esriGeometryPoint"){
                    var wmGeom = webMercatorUtils.lngLatToXY(lang.getObject(layer.longitude,false,geojsonpoint), lang.getObject(layer.latitude,false,geojsonpoint));  
                    geom = new esri.geometry.Point(wmGeom[0], wmGeom[1], this._viewerMap.spatialReference)
                  }
                } else {
                  geojsonpoint.properties['OID'] = oidField
                  if (geojsonpoint.line){
                    geom = new esri.geometry.Polyline(geojsonpoint.line);
                  }else{
                    var wmGeom = webMercatorUtils.lngLatToXY(geojsonpoint.geometry.coordinates[0], geojsonpoint.geometry.coordinates[1]);
                    geom = new esri.geometry.Point(wmGeom[0], wmGeom[1], this._viewerMap.spatialReference)
                  }
                  geojsonpoint = geojsonpoint.properties;
                }
                oidField += 1;
                featureArray.push(new esri.Graphic(geom, layer.symbol, geojsonpoint, lOptions.infoTemplate));
              })
              var defFields = [{
                "name": "OID",
                "type": "esriFieldTypeOID",
                "alias": "OID"
              }]
              if (layer.popup) {
                array.forEach(layer.popup.fieldInfos, function(FI) {
                  FI['name'] = FI.fieldName
                  FI['alias'] = FI.fieldName
                  FI['type'] = "esriFieldTypeString"
                  defFields.push(FI)
                })
              }
              var featureJson = {
                "fields": defFields,
                "geometryType": geomType,
                "spatialReference": featureArray[0].geometry.spatialReference,
                "features": featureArray
              }
              var featureSet = new esri.tasks.FeatureSet(featureJson);
              var lLayer = new esri.layers.FeatureLayer({
                "layerDefinition": {
                  "geometryType": geomType,
                  "fields": defFields
                },
                "featureSet": featureSet
              }, lOptions);
              lLayer.setRenderer(renderer)
              if (layer.name) {
                lLayer._titleForLegend = layer.name;
                lLayer.title = layer.name;
                lLayer.noservicename = true;
                lLayer.name = lOptions.id;
              }
				lLayer.on('error', function(evt) {
			  _updateLayerInfos();
				})
              lLayer.on('load', function(evt) {
                //set min/max scales if present
                if (lOptions.minScale) {
                  evt.layer.setMinScale(lOptions.minScale)
                }
                if (lOptions.maxScale) {
                  evt.layer.setMaxScale(lOptions.maxScale)
                }
              })
              this._viewerMap.addLayer(lLayer);
			  topic.publish("georssloaded")
            }), lang.hitch(this, function(err) {
				_geoRSSReturned += 1;
            }));
          }
        });
        this.sceneView.map.layers.addMany(_layersToAdd)
      }
    });
    return clazz;
  });