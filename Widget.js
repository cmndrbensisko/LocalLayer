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
    'dojo/topic',
    'dojo/aspect',
    'jimu/LayerInfos/LayerInfos',
    'esri/geometry/webMercatorUtils',
    'esri/tasks/PrintTask',
    'esri/arcgis/utils',
    'esri/layers/ArcGISDynamicMapServiceLayer',
    'esri/layers/ArcGISTiledMapServiceLayer',
    'esri/layers/ArcGISImageServiceLayer',
    'esri/layers/WMSLayer',
    'esri/layers/WMSLayerInfo',
    'esri/layers/FeatureLayer',
    'esri/layers/WebTiledLayer',
    'esri/layers/ImageParameters',
    'esri/layers/ImageServiceParameters',
    'esri/dijit/BasemapGallery',
    'esri/dijit/BasemapLayer',
    'esri/dijit/Basemap',
    'esri/basemaps',
    'esri/dijit/PopupTemplate',
    'esri/symbols/jsonUtils',
    'esri/symbols/TextSymbol',
    'esri/layers/LabelClass',
    'esri/Color',
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
    topic,
    aspect,
    LayerInfos,
    webMercatorUtils,
    PrintTask,
    arcgisUtils,
    ArcGISDynamicMapServiceLayer,
    ArcGISTiledMapServiceLayer,
    ArcGISImageServiceLayer,
    WMSLayer,
    WMSLayerInfo,
    FeatureLayer,
    WebTiledLayer,
    ImageParameters,
    ImageServiceParameters,
    BasemapGallery,
    BasemapLayer,
    Basemap,
    esriBasemaps,
    PopupTemplate,
    jsonUtils,
    TextSymbol,
    LabelClass,
    Color) {
    var clazz = declare([BaseWidget], {
      constructor: function() {
        this._originalWebMap = null;
      },
      onClose: function() {
        if (query('.jimu-popup.widget-setting-popup', window.parent.document).length === 0) {
          var _currentExtent = dojo.clone(this.map.extent);
          var _changedData = {
            itemId: this._originalWebMap
          };
          var _newBasemap = topic.subscribe("mapChanged", function(_map) {
            _newBasemap.remove();
            _map.setExtent(_currentExtent);
          });
          MapManager.getInstance().onAppConfigChanged(this.appConfig, 'mapChange', _changedData);
        }
      },
      _removeAllLayersExceptBasemap: function() {
        for (var l = this.map.layerIds.length - 1; l > 1; l--) {
          var lyr = this.map.getLayer(this.map.layerIds[l]);
          if (lyr) {
            this.map.removeLayer(lyr);
          }
        }
        var f = this.map.graphicsLayerIds.length;
        while (f--) {
          var fl = this.map.getLayer(this.map.graphicsLayerIds[f]);
          if (fl.declaredClass === 'esri.layers.FeatureLayer') {
            this.map.removeLayer(fl);
          }
        }
      },
      startup: function() {
        this._originalWebMap = this.map.webMapResponse.itemInfo.item.id;
        this._removeAllLayersExceptBasemap();
        if (!LayerInfos.getInstanceSync()._tables){
          LayerInfos.getInstanceSync()._tables = [];
        }
        if (this.config.review){
          var urlParams = ioQuery.queryToObject(decodeURIComponent(dojo.doc.location.search.slice(1)));
          if (urlParams._jsonconfig){
            this.config = JSON.parse(urlParams._jsonconfig);
          }
          if (urlParams._preview){
            var type
            if (urlParams._preview.toUpperCase().match("MAPSERVER")){
              type = "DYNAMIC"
            }
            if (urlParams._preview.toUpperCase().match("FEATURESERVER")){
              type = "FEATURE"
            }
            this.config = {"layers":{"layer":[{"type":type, "name":urlParams._preview.split("/")[urlParams._preview.split("/").length-2], "url":urlParams._preview, "flyPopups": true}]}} 
          }
        }
        if (this.config.useProxy) {
          urlUtils.addProxyRule({
            urlPrefix: this.config.proxyPrefix,
            proxyUrl: this.config.proxyAddress
          });
        }
        var _layersToAdd=[];
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
            if (layer.imageformat) {
              var ip = new ImageParameters();
              ip.format = layer.imageformat;
              if (layer.hasOwnProperty('imagedpi')) {
                ip.dpi = layer.imagedpi;
              }
              lOptions.imageParameters = ip;
            }
            lLayer = new ArcGISDynamicMapServiceLayer(layer.url, lOptions);
            if (layer.hasOwnProperty('definitionQueries')) {
              var definitionQueries = JSON.parse(layer.definitionQueries)
              var layerDefinitions = []
              for (var prop in definitionQueries) {
                layerDefinitions[prop] = definitionQueries[prop];
              }
              lLayer.setLayerDefinitions(layerDefinitions);
            }
            if (layer.name) {
              lLayer._titleForLegend = layer.name;
              lLayer.title = layer.name;
              lLayer.noservicename = true;
            }
            if (layer.popup) {
              var finalInfoTemp = {};
              array.forEach(layer.popup.infoTemplates, function(_infoTemp) {
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
                var _popupTemplate1 = new PopupTemplate(popupInfo);
                finalInfoTemp[_infoTemp.layerId] = {
                  infoTemplate: _popupTemplate1
                };
              });
              lLayer.setInfoTemplates(finalInfoTemp);
            }
            if (layer.hasOwnProperty('autorefresh')) {
              lLayer.refreshInterval = layer.autorefresh;
              
            }
            if (layer.disableclientcaching) {
              lLayer.setDisableClientCaching(true);
            }
            lLayer.on('error', function(evt) {
              console.log(evt);
            })
            lLayer.on('load', function(evt) {
              if (layer.flyPopups){
                var _infoTemps = []
                evt.layer.layerInfos.forEach(function(layer){
                  _infoTemps.push({infoTemplate:new PopupTemplate({
                    title:layer.name,
                    fieldInfos: [{  
                      fieldName: "*",  
                      visible: true,  
                      label: "*"  
                    }]                    
                  })})
                })
                evt.layer.setInfoTemplates(_infoTemps)
              }
              //set min/max scales if present
              if (lOptions.minScale) {
                evt.layer.setMinScale(lOptions.minScale)
              }
              if (lOptions.maxScale) {
                evt.layer.setMaxScale(lOptions.maxScale)
              }

              if (!lOptions.hasOwnProperty('hidelayers')) {
                lOptions.hidelayers = []
              }
              var removeLayers = []
              for (var i = 0; i < lOptions.hidelayers.length; i++) {
                lOptions.hidelayers[i] = parseInt(lOptions.hidelayers[i])
              }
              var showLayers = []
              array.forEach(evt.layer.layerInfos, function(layer) {
                  showLayers.push(layer.id)
                })
              array.forEach(lOptions.hidelayers, function(id) {
                showLayers.splice(showLayers.indexOf(id), 1)
              })
              lOptions.hidelayers = showLayers
              var getArrayItemById = function(_array,_id){
                var _matchItem;
                array.some(_array,function(_arrayItem){
                  if (_arrayItem.id == _id){
                    _matchItem = _arrayItem;
                    return true;
                  }
                })
                return _matchItem;
              }
              array.forEach(evt.layer.layerInfos, function(layer) {
                layer.defaultVisibility = false;
              })
              for (var i = 0; i < lOptions.hidelayers.length; i++) {
                getArrayItemById(evt.layer.layerInfos,lOptions.hidelayers[i]).defaultVisibility = true;
              }
              array.forEach(evt.layer.layerInfos, function(layer) {
                if (layer.subLayerIds) {
                  if (removeLayers.indexOf(layer.id) == -1) {
                    removeLayers.push(layer.id)
                  };
                }
              })
              for (var i = 0; i < lOptions.hidelayers.length; i++) {
                var j=getArrayItemById(evt.layer.layerInfos,lOptions.hidelayers[i]).parentLayerId
                while (j > -1) {
                  if (lOptions.hidelayers.indexOf(j) == -1) {
                    if (removeLayers.indexOf(lOptions.hidelayers[i]) == -1) {
                      removeLayers.push(lOptions.hidelayers[i])
                    }
                  }
                  j=getArrayItemById(evt.layer.layerInfos,j).parentLayerId;
                }
              }
              array.forEach(removeLayers, function(layerId) {
                if (lOptions.hidelayers.indexOf(layerId) > -1) {
                  lOptions.hidelayers.splice(lOptions.hidelayers.indexOf(layerId), 1)
                };
              })

              if (lOptions.hidelayers.length == 0) {
                lOptions.hidelayers.push(-1);
                lOptions.hidelayers.push(-1);
                lOptions.hidelayers.push(-1);
              }

              evt.layer.setVisibleLayers(lOptions.hidelayers);

              if (layer.hasOwnProperty('hideInLegends')) {
                var hideLegends = JSON.parse(layer.hideInLegends)
                var finalLegends = []
                for (var prop in hideLegends) {
                  array.forEach(evt.layer.layerInfos,lang.hitch(this,function(layerInfo){
                    if (layerInfo.id == parseInt(prop)){
                      layerInfo.showLegend = !hideLegends[prop]
                    }
                  }))
                }
              }
              lLayer.layers = evt.layer.layerInfos
            });
            _layersToAdd.push(lLayer);
            this._viewerMap.setInfoWindowOnClick(true);
          } else if (layer.type.toUpperCase() === 'IMAGE') {
            lOptions.imageServiceParameters = new ImageServiceParameters();
            var _popupTemplate;
            if (layer.popup) {
              _popupTemplate = new PopupTemplate(layer.popup);
              lOptions.infoTemplate = _popupTemplate;
            }
            lLayer = new ArcGISImageServiceLayer(layer.url, lOptions)
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
              layers: [new BasemapLayer(lOptions)]
            });
            var _basemapGallery = new BasemapGallery({
              showArcGISBasemaps: false,
              map: this._viewerMap
            }, '_tmpBasemapGallery');
            _basemapGallery.add(_newBasemap);
            _basemapGallery.select('defaultBasemap');
            _basemapGallery.destroy();
          } else if (layer.type.toUpperCase() === 'FEATURE') {
            var _popupTemplate;
            if (layer.popup) {
              _popupTemplate = new PopupTemplate(layer.popup);
              lOptions.infoTemplate = _popupTemplate;
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
            lLayer = new FeatureLayer(layer.url, lOptions);
            if (layer.hasOwnProperty('hideInLegend')) {
              lLayer.showLegend = !layer.hideInLegend
            }
            if (layer.name) {
              lLayer._titleForLegend = layer.name;
              lLayer.title = layer.name;
              lLayer.noservicename = true;
            }
            if (layer.hasOwnProperty('definitionQuery')) {
              lLayer.setDefinitionExpression(layer.definitionQuery);
            }
            if (layer.hasOwnProperty('customRenderer')) {
              if (layer.customRenderer != "") {
                lLayer.setRenderer(new esri.renderer.SimpleRenderer(jsonUtils.fromJson(JSON.parse(layer.customRenderer))))
              }
            }
            if (layer.hasOwnProperty('customLabel')) {
              if ((layer.customLabel && layer.customLabel != "")) {
                var labelClassParams = new LabelClass({
                  "labelExpressionInfo": {
                    "value": layer.customLabel
                  }
                })
                var labelClass = new LabelClass(labelClassParams)
                if (layer.hasOwnProperty('customLabelStyle') && layer.customLabelStyle != "") {
                  labelClass.symbol = new TextSymbol(jsonUtils.fromJson(JSON.parse(layer.customLabelStyle)))
                } else {
                  labelClass.symbol = new TextSymbol();
                }
                if (layer.hasOwnProperty('labelMinScale')) {
                  labelClass.minScale = layer.labelMinScale;
                }
                if (layer.hasOwnProperty('labelMaxScale')) {
                  labelClass.maxScale = layer.labelMaxScale;
                }
                if (layer.hasOwnProperty('labelPlacement')){
                  labelClass.labelPlacement = layer.labelPlacement;
                }
                lLayer.setLabelingInfo([labelClass])
              }
            }
            lLayer.on('load', function(evt) {
              //set min/max scales if present
              if (lOptions.minScale) {
                evt.layer.setMinScale(lOptions.minScale)
              }
              if (lOptions.maxScale) {
                evt.layer.setMaxScale(lOptions.maxScale)
              }
              if (lOptions.trackEditByLDAP) {
                this.userIsAdmin = true;
              }
              if (lOptions.limitEditByLDAP) {
                //If enabled, ensure that index.html is renamed to index.aspx, and add the following snippet to the index.aspx page.
                //<script type="text/javascript">var _llwUser = "<%= User.Identity.Name.Replace("\","\\") %>"</script>
                this.credential = {userId:_llwUser};
              }
              evt.layer.name = lOptions.id;
            });
            if (layer.fltype != "Table"){
              _layersToAdd.push(lLayer);
            }else{
              if (!LayerInfos.getInstanceSync()._tables){
                LayerInfos.getInstanceSync()._tables = [];
              }
              LayerInfos.getInstanceSync()._tables.push(lLayer)
            }
          } else if (layer.type.toUpperCase() === 'TILED') {
            if (layer.displayLevels) {
              lOptions.displayLevels = layer.displayLevels.split(',');
            }
            if (layer.hasOwnProperty('autorefresh')) {
              lOptions.refreshInterval = layer.autorefresh;
            }
            lLayer = new ArcGISTiledMapServiceLayer(layer.url, lOptions);
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
              return new BasemapLayer(bmLayerObj);
            });
            var _newBasemap = new Basemap({
              id: 'defaultBasemap',
              title: layer.name,
              layers: bmLayers
            });
            var _basemapGallery = new BasemapGallery({
              showArcGISBasemaps: false,
              map: this._viewerMap
            }, '_tmpBasemapGallery');
            _basemapGallery.add(_newBasemap);
            _basemapGallery.select('defaultBasemap');
            _basemapGallery.destroy();
          } else if (layer.type.toUpperCase() === 'WMS') {
            lLayer = new WMSLayer(layer.url)
            if (layer.name) {
              lLayer._titleForLegend = layer.name;
              lLayer.title = layer.name;
              lLayer.noservicename = true;
            }
            _layersToAdd.push(lLayer);
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
            dojo.xhrGet({
              url: lang.trim(layer.url || ""),
              handleAs: 'json',
              headers: {
                "X-Requested-With": ""
              }
            }).then(lang.hitch(this, function(restData) {
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
              array.forEach(restData, function(geojsonpoint) {
                if (!layer.isValidGeoJson) {
                  geojsonpoint['OID'] = oidField
                  var wmPoint = webMercatorUtils.lngLatToXY(geojsonpoint[layer.longitude], geojsonpoint[layer.latitude]);
                } else {
                  geojsonpoint.properties['OID'] = oidField
                  var wmPoint = webMercatorUtils.lngLatToXY(geojsonpoint.geometry.coordinates[0], geojsonpoint.geometry.coordinates[1]);
                  geojsonpoint = geojsonpoint.properties;
                }
                oidField += 1;
                var point = new esri.geometry.Point(wmPoint[0], wmPoint[1], this._viewerMap.spatialReference)
                featureArray.push(new esri.Graphic(point, null, geojsonpoint));
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
              }, lOptions);
              lLayer.setRenderer(renderer)
              if (layer.name) {
                lLayer._titleForLegend = layer.name;
                lLayer.title = layer.name;
                lLayer.noservicename = true;
                lLayer.name = lOptions.id;
              }
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
            }), lang.hitch(this, function(err) {
              console.log('error')
            }));
          }
        });
        aspect.before(LayerInfos.prototype,"update",function(){
          //Migrate _finalLayerInfos back to the _operLayers parameter on update.
          var newOriginOperLayers = []
          array.forEach(this._finalLayerInfos,lang.hitch(this,function(layerInfo){
            if (layerInfo.originOperLayer.layerObject instanceof ArcGISDynamicMapServiceLayer){
              layerInfo.declaredClass = 'esri.layers.ArcGISDynamicMapServiceLayer'
              layerInfo.originOperLayer.layerType = 'ArcGISMapServiceLayer';
            }   
            newOriginOperLayers.push(layerInfo.originOperLayer);
          }))
          this._operLayers = newOriginOperLayers;
          LayerInfos.getInstanceSync()._initLayerInfos();
        });
        //Note that the _bindEvent and _addTable aspects are essential to prevent redundant event binding on layer add.
        aspect.after(LayerInfos.prototype,"update",function(){
          array.forEach(this._finalLayerInfos,lang.hitch(this,function(layerInfo){
            if (layerInfo.layerObject.showLegend === false){
              layerInfo.originOperLayer.showLegend = layerInfo.layerObject.showLegend
            }
            aspect.before(layerInfo.__proto__,"_bindEvent",function(){
              if (this.layerObject){
                if (!this.layerObject.empty){
                  this.layerObject.modified = true;
                  this.layerObject.empty = true;
                }
              }
            })
            aspect.after(layerInfo.__proto__,"_bindEvent",function(){
              if (this.layerObject){
                if (this.layerObject.modified){
                  this.layerObject.empty = false;
                }
              }
            },true)         
          }))
        });       
        aspect.after(arcgisUtils,"getLegendLayers",lang.hitch(this,function(legendObject){
          var returnArray = []
          array.forEach(LayerInfos.getInstanceSync()._operLayers,function(_layer){
            var newLayer = {defaultSymbol:true,layer:_layer,title:_layer.title}
            returnArray.push(newLayer)
          })
          return returnArray;
        }))
        aspect.before(LayerInfos.prototype,"_addTable",function(changedType,evt){
          var _foundMatch = false
          array.forEach(this._finalTableInfos,function(table){
            if (table.id == changedType.id){
              _foundMatch = true;
            }
          })
          if (!_foundMatch){
            return [changedType,evt];
          }else{
            return [null, null]
          }
        }, true)
        aspect.around(LayerInfos.prototype,"_onTableChange",lang.hitch(this,function(originalFunction){
          return lang.hitch(this,function(tableInfos,changedType){
            if (tableInfos.length > 0){
              return originalFunction.call(this,tableInfos,changedType);
            }
          })
        }), true)
        var dummyLayer = new WMSLayer("__ignore__")
        dummyLayer.on("error",function(evt){
          window._viewerMap.removeLayer(evt.target)
        })
        window._viewerMap.addLayer(dummyLayer);   
        window._viewerMap.addLayers(_layersToAdd);
        window._viewerMap.updatedLayerInfos = LayerInfos.getInstanceSync()            
        LayerInfos.getInstanceSync()._initTablesInfos()
      }
    });
    return clazz;
  });