///////////////////////////////////////////////////////////////////////////
// Copyright 2015 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////
/*jshint loopfunc: true */
define(['jimu/BaseWidget',
'jimu/LayerInfos/LayerInfos',
'jimu/utils',
'dojo/dom',
'dojo/dom-class',
'dojo/dom-construct',
'dojo/on',
'dojo/dom-style',
'dojo/_base/declare',
'dojo/_base/lang',
'dojo/_base/html',
'dojo/_base/Color',
'dojo/promise/all',
'dojo/_base/array',
'dojo/DeferredList',
'dojo/Deferred',
'dojo/query',
"dojox/gfx/fx",
'dojox/gfx',
'dojo/_base/xhr',
'dijit/_WidgetsInTemplateMixin',
'esri/graphic',
'esri/geometry/Point',
'esri/symbols/SimpleMarkerSymbol',
'esri/symbols/PictureMarkerSymbol',
'esri/symbols/SimpleLineSymbol',
'esri/symbols/SimpleFillSymbol',
'esri/Color',
'esri/tasks/query',
'esri/tasks/QueryTask',
"esri/tasks/FeatureSet",
"esri/arcgis/utils",
'esri/symbols/jsonUtils',
'esri/request',
"esri/renderers/SimpleRenderer",
"esri/renderers/jsonUtils",
'./js/ClusterLayer',
'esri/layers/LayerDrawingOptions'
],
function (BaseWidget,
  LayerInfos,
  utils,
  dom,
  domClass,
  domConstruct,
  on,
  domStyle,
  declare,
  lang,
  html,
  dojoColor,
  all,
  array,
  DeferredList,
  Deferred,
  query,
  fx,
  gfx,
  xhr,
  _WidgetsInTemplateMixin,
  Graphic,
  Point,
  SimpleMarkerSymbol,
  PictureMarkerSymbol,
  SimpleLineSymbol,
  SimpleFillSymbol,
  Color,
  Query,
  QueryTask,
  FeatureSet,
  arcgisUtils,
  jsonUtils,
  esriRequest,
  SimpleRenderer,
  jsonUtil,
  ClusterLayer,
  LayerDrawingOptions
  ) {
  return declare([BaseWidget, _WidgetsInTemplateMixin], {
    baseClass: 'jimu-widget-InfoSummary',

    name: "InfoSummary",
    opLayers: null,
    opLayerInfos: null,
    layerList: {},
    UNIQUE_APPEND_VAL_CL: "_CL",
    widgetChange: false,
    refreshInterval: 0,
    refreshIntervalValue: 0,
    configLayerInfos: [],
    legendNodes: [],
    currentQueryList: [],
    symbols: [],
    row: null,

    postCreate: function () {
      this.inherited(arguments);
      this.inPanelOverrides(this.appConfig.theme.name);
      this.configLayerInfos = this.config.layerInfos;
      this.layerList = {};
      //populates this.opLayers from this.map and creates the panel
      this._initWidget();
    },

    _orientationChange: function () { },

    inPanelOverrides: function (themeName) {
      this.isDartTheme = themeName === "DartTheme";
      var add = this.isDartTheme ? true : false;
      if (this.isDartTheme) {
        if (domClass.contains(this.pageContent, 'pageContent')) {
          domClass.remove(this.pageContent, 'pageContent');
        }
      } else {
        if (domClass.contains(this.pageContent, 'pageContent-dart')) {
          domClass.remove(this.pageContent, 'pageContent-dart');
        }
      }
      domClass.add(this.pageContent, add ? 'pageContent-dart' : 'pageContent');
    },

    addResizeOrientationHandlers: function () {
      if (typeof (this.resizeHandler) === 'undefined') {
        this.resizeHandler = on(this.map, 'resize', lang.hitch(this, this._windowResize));
      }

      if (window.hasOwnProperty('matchMedia')) {
        var mql = window.matchMedia("(orientation: portrait)");
        mql.addListener(lang.hitch(this, this._orientationChange));
      }
    },

    removeResizeOrientationHandlers: function () {
      if (typeof (this.resizeHandler) !== 'undefined') {
        this.resizeHandler.remove();
        this.resizeHandler = undefined;
      }

      if (window.hasOwnProperty('matchMedia')) {
        var mql = window.matchMedia("(orientation: portrait)");
        mql.removeListener(lang.hitch(this, this._orientationChange));
      }
    },

    startup: function () {
      this.inherited(arguments);
      if (!this.hidePanel && !this.showAllFeatures) {
        this.mapExtentChangedHandler = this.map.on("extent-change", lang.hitch(this, this._mapExtentChange));
        this._mapExtentChange();
      } else if (this.showAllFeatures) {
        this._mapExtentChange();
      }
      this.addResizeOrientationHandlers();
    },

    onOpen: function () {
      if (!this.hidePanel) {
        this._updatePanelHeader();
      }

      if (this.appConfig.theme.styles && this.appConfig.theme.styles[0]) {
        this._updateStyleColor(this.appConfig.theme.styles[0]);
      }

      var visibleSubLayers = [];
      //update the renderer for the layer in the layer list if a new one has been defined
      for (var key in this.layerList) {
        var layerListLayer = this.layerList[key];
        var li = layerListLayer.li;
        var lo = layerListLayer.layerObject;
        if (li && li.orgRenderer) {
          if (lo.setRenderer) {
            lo.setRenderer(li.newRenderer);
          } else if (lo.setLayerDrawingOptions) {
            var optionsArray = [];
            var drawingOptions = new LayerDrawingOptions();
            drawingOptions.renderer = li.newRenderer;
            optionsArray[li.subLayerId] = drawingOptions;
            lo.setLayerDrawingOptions(optionsArray);
          } else {
            console.log("Error setting the new renderer...will use the default rendering of the layer");
          }
          lo.refresh();
        }

        var _Pl;
        if (lo && lo.layerInfos) {
          _Pl = lo;
        } else if (li && typeof (li.parentLayerID) !== 'undefined') {
          _Pl = this.map.getLayer(li.parentLayerID);
        }

        var l;
        if (_Pl && _Pl.visibleLayers) {
          var _foundIt = false;
          sub_layers_id_loop:
          for (var ii = 0; ii < visibleSubLayers.length; ii++) {
            var subVizLyrId = visibleSubLayers[ii].id;
            if (subVizLyrId === _Pl.id) {
              _foundIt = true;
              break sub_layers_id_loop;
            }
          }
          if (visibleSubLayers.length === 0 || !_foundIt) {
            visibleSubLayers.push({
              id: _Pl.id,
              layers: _Pl.visibleLayers
            });
          }
          var x = 0;
          subLayerLoop:
          for (x; x < visibleSubLayers.length; x++) {
            var o = visibleSubLayers[x];
            if (o.id === _Pl.id) {
              break subLayerLoop;
            }
          }
          var visLayers = visibleSubLayers[x].layers;
          if (_Pl.layerInfos) {
            //Handle MapService layers
            if (_Pl.layerInfos.length > 0) {
              if (li && typeof (li.subLayerId) !== 'undefined') {
                var inVisLayers = visLayers.indexOf(li.subLayerId) > -1;
                var plVis = layerListLayer.parentLayerVisible;
                var loPlVis = layerListLayer.layerObject.parentLayerVisible;
                if (layerListLayer.type === "ClusterLayer" && (inVisLayers || plVis || loPlVis)) {
                  layerListLayer.parentLayerVisible = true;
                  layerListLayer.layerObject.parentLayerVisible = true;
                  layerListLayer.visible = true;
                  if (inVisLayers) {
                    visLayers.splice(visLayers.indexOf(li.subLayerId), 1);
                  }
                } else if (inVisLayers || plVis) {
                  layerListLayer.parentLayerVisible = true;
                  layerListLayer.visible = true;
                  if (visLayers.indexOf(li.subLayerId) === -1) {
                    visLayers.push(li.subLayerId);
                  }
                }else {
                  layerListLayer.parentLayerVisible = false;
                  layerListLayer.visible = false;
                  if (inVisLayers) {
                    visLayers.splice(visLayers.indexOf(li.subLayerId), 1);
                  }
                  if (layerListLayer.type === "ClusterLayer") {
                    layerListLayer.layerObject.parentLayerVisible = false;
                    if (this.map.graphicsLayerIds.indexOf(layerListLayer.id) > -1) {
                      l = this.map.getLayer(layerListLayer.id);
                      l.setVisibility(false);
                    }
                  }
                }
              }
            }
            visibleSubLayers[x].layers = visLayers;
          }
          this.updatePanelVisibility(layerListLayer, key, layerListLayer);
        } else if (lo) {
          //Handle non MapService layers
          if (layerListLayer.type === "ClusterLayer") {
            if (lo._parentLayer) {
              if (this.map.graphicsLayerIds.indexOf(layerListLayer.id) > -1) {
                l = this.map.getLayer(layerListLayer.id);
                if (typeof (layerListLayer.layerObject.parentLayerVisible) === 'undefined') {
                  layerListLayer.parentLayerVisible = lo._parentLayer.visible;
                  layerListLayer.layerObject.parentLayerVisible = lo._parentLayer.visible;
                }
                l.setVisibility(layerListLayer.layerObject.parentLayerVisible);
              }
              if (lo._parentLayer.setVisibility) {
                lo._parentLayer.setVisibility(false);
              }
            }
          }
          this.updatePanelVisibility(lo, key, layerListLayer);
        }

        if (this.showAllFeatures && this.config.expandList && layerListLayer.legendOpen && !layerListLayer.isLoaded) {
          var visScaleRange = this._inVisibleRange(layerListLayer, key);
          if (layerListLayer.visible && visScaleRange) {
            layerListLayer.updateList = true;
          }
        }
      }

      for (var i = 0; i < visibleSubLayers.length; i++) {
        var parentLayer = this.map.getLayer(visibleSubLayers[i].id);
        if (parentLayer) {
          parentLayer.setVisibleLayers(visibleSubLayers[i].layers);
        }
      }

      if (!this.hidePanel && !this.showAllFeatures) {
        if (typeof (this.mapExtentChangedHandler) === 'undefined') {
          this.mapExtentChangedHandler = this.map.on("extent-change", lang.hitch(this, this._mapExtentChange));
          this._mapExtentChange();
        }
      }

      this.addResizeOrientationHandlers();

      //if refresh is enabled set refereshInterval on any widget source layers with refresh set to true
      //and call setInterval to refresh the static graphics
      if (this.config.refreshEnabled) {
        this.enableRefresh();
      }

      if (this.map.infoWindow) {
        this.map.infoWindow.highlight = true;
      }
    },

    updatePanelVisibility: function (lo, key, layerListLayer) {
      if (!this.hidePanel) {
        if (typeof (lo.visible) !== 'undefined') {
          var c = dom.byId("recLabel_" + key);
          if (!lo.visible) {
            if (domClass.contains("recIcon_" + key, "active")) {
              domClass.remove("recIcon_" + key, "active");
            }
            if (this.config.countEnabled) {
              if (domClass.contains("recNum_" + key, "recNum")) {
                domClass.remove("recNum_" + key, "recNum");
                domClass.add("recNum_" + key, "recNumInActive");
              }
            }
            if (c && c.firstChild) {
              domClass.add(c.firstChild, "inActive");
            }
            if (!layerListLayer.listDisabled) {
              if (!domClass.contains("exp_" + key, "expandInActive")) {
                domClass.add("exp_" + key, "expandInActive");
              }
              layerListLayer.toggleLegend.remove();
            }
            if (domClass.contains("rec_" + key, "rec")) {
              domClass.add("rec_" + key, "recDefault");
            }
          } else {
            if (!domClass.contains("recIcon_" + key, "active")) {
              domClass.add("recIcon_" + key, "active");
            }
            if (this.config.countEnabled) {
              if (domClass.contains("recNum_" + key, "recNumInActive")) {
                domClass.remove("recNum_" + key, "recNumInActive");
                domClass.add("recNum_" + key, "recNum");
              }
            }
            if (c && c.firstChild) {
              domClass.remove(c.firstChild, "inActive");
            }
            if (!layerListLayer.listDisabled) {
              if (domClass.contains("exp_" + key, "expandInActive")) {
                domClass.remove("exp_" + key, "expandInActive");
              }
            }
            if (domClass.contains("rec_" + key, "recDefault")) {
              domClass.remove("rec_" + key, "recDefault");
            }
          }
        }
      }
    },

    enableRefresh: function () {
      //set refreshItereval on all widget source layers that support it
      var layerListLayer = null;
      var checkedTime = false;
      for (var key in this.layerList) {
        layerListLayer = this.layerList[key];
        if (layerListLayer.type !== "ClusterLayer") {
          if (!checkedTime && layerListLayer.li) {
            if (layerListLayer.li.itemId) {
              this.getItem(layerListLayer.li.itemId);
              checkedTime = true;
            }
          }

          layerListLayer = layerListLayer.layerObject;
        } else {
          var id;
          if (layerListLayer.li) {
            id = layerListLayer.li.id;
          } else if (layerListLayer.id) {
            id = layerListLayer.id;
          }

          for (var i = 0; i < this.opLayers.length; i++) {
            var l = this.opLayers[i];
            if (l.layerObject) {
              layerListLayer = l.layerObject;
              break;
            }
          }
        }
        if (layerListLayer) {
          layerListLayer.refreshInterval = this.config.refreshInterval;
        }
      }

      var tempVal = this.config.refreshInterval * 60000;
      if (this.refreshInterval === 0 && this.refreshIntervalValue === 0) {
        //set the refresh interval based on the configs interval value
        this.refreshIntervalValue = tempVal;
        this.refreshInterval = setInterval(lang.hitch(this, this.refreshLayers), (this.refreshIntervalValue));
      } else if (this.refreshIntervalValue !== 0 && (this.refreshIntervalValue !== tempVal)) {
        //clear and update the refresh interval if the configs refresh interval has changed
        this.refreshIntervalValue = tempVal;
        clearInterval(this.refreshInterval);
        this.refreshInterval = 0;
        this.refreshInterval = setInterval(lang.hitch(this, this.refreshLayers), (this.refreshIntervalValue));
      }
    },

    getItem: function (id) {
      var portalUrl = window.portalUrl.substr(-1) !== '/' ? window.portalUrl += '/' : window.portalUrl;
      var url = portalUrl + "sharing/rest/content/items/" + id;
      esriRequest({
        url: url,
        content: {
          f: "json",
          requestTime: Date.now()
        }
      }).then(lang.hitch(this, function (response) {
        if (response) {
          var itemModified = response.modified;
          var update = true;
          if (this.lastModifiedTime) {
            update = this.lastModifiedTime < itemModified;
          }
          if (this.currentQueryList.indexOf(id) > -1) {
            this.currentQueryList.splice(this.currentQueryList.indexOf(id), 1);
          }
          if (update) {
            this.lastModifiedTime = itemModified;
            this._updatePanelTime(itemModified);
            esriRequest({
              url: url + '/data',
              content: {
                f: "json",
                requestTime: Date.now()
              }
            }).then(lang.hitch(this, this._updateItem, id));
          }
        }
      }));
    },

    _updatePanelTime: function (modifiedTime) {
      if (!this.hidePanel) {
        this.lastUpdated.innerHTML = "<div></div>";
        var _d = new Date(modifiedTime);
        var _f = { dateFormat: 'shortDateShortTime' };
        this.lastUpdated.innerHTML = utils.fieldFormatter.getFormattedDate(_d, _f);
      }
    },

    refreshLayers: function () {
      for (var key in this.layerList) {
        var lyr = this.layerList[key];
        var id;
        if (lyr.li && lyr.li.itemId) {
          id = lyr.li.itemId;
        } else if (lyr.layerObject.itemId) {
          id = lyr.layerObject.itemId;
        }

        if (id) {
          if (this.currentQueryList.indexOf(id) === -1) {
            this.currentQueryList.push(id);
            this.getItem(id);
          }
        }
      }
    },

    _updateItem: function (id, response) {
      var featureCollection = response;
      for (var i = 0; i < featureCollection.layers.length; i++) {
        this._updateLayerItem(featureCollection.layers[i], this.lastModifiedTime);
      }
      this.currentQueryList.splice(this.currentQueryList.indexOf(id), 1);
    },

    //TDOO ensure this functions as expected when filter by map extent id disabled
    _updateLayerItem: function (responseLayer) {
      var layerListLayer;
      var parentLayer;
      var list, fields;
      for (var k in this.layerList) {
        if (this.layerList[k].pl && this.layerList[k].pl.layerDefinition) {
          if (this.layerList[k].pl.layerDefinition.name === responseLayer.layerDefinition.name) {
            layerListLayer = this.layerList[k];
            parentLayer = layerListLayer.pl;
            break;
          }
        } else if (this.layerList[k].layerObject._parentLayer) {
          if (this.layerList[k].layerObject._parentLayer.name === responseLayer.layerDefinition.name) {
            list = typeof (this.layerList[k].listDisabled) !== 'undefined' ? this.layerList[k].listDisabled : false;
            fields = this.layerList[k].li.symbolData.featureDisplayOptions.fields &&
              this.layerList[k].li.symbolData.featureDisplayOptions.fields.length > 0;
            if (!list && fields) {
              this.layerList[k].isLoaded = false;
            }
            this.layerList[k].layerObject.refreshFeatures(responseLayer);
            if (this.layerList[k].layerObject) {
              this._loadList(this.layerList[k], true);
            }
            //break;
          }
        }
      }

      if (responseLayer && parentLayer) {
        var responseFeatureSetFeatures = responseLayer.featureSet.features;
        var mapFeatureSetFeatures = parentLayer.featureSet.features;

        //var transform;
        //if (responseLayer.featureSet.transform) {
        //  transform = responseLayer.featureSet.transform;
        //  //var fs = new FeatureSet(JSON.stringify(responseLayer.featureSet.features));
        //}

        var shouldUpdate = true;
        //TODO Figure out a better test for larger responses
        if (responseFeatureSetFeatures.length < 10000) {
          shouldUpdate = JSON.stringify(mapFeatureSetFeatures) !== JSON.stringify(responseFeatureSetFeatures);
        }

        if (shouldUpdate) {
          list = typeof (layerListLayer.listDisabled) !== 'undefined' ? layerListLayer.listDisabled : false;
          fields = layerListLayer.li.symbolData.featureDisplayOptions.fields &&
            layerListLayer.li.symbolData.featureDisplayOptions.fields.length > 0;
          if (!list && fields) {
            layerListLayer.isLoaded = false;
            layerListLayer.requiresReload = true;
          }
          if (list) {
            layerListLayer.li.layerListExtentChanged = true;
          }
          parentLayer.layerObject.clear();
          var sr = layerListLayer.layerObject.spatialReference;
          for (var j = 0; j < responseFeatureSetFeatures.length; j++) {
            var item = responseFeatureSetFeatures[j];
            if (item.geometry) {
              //check li for renderer also
              var go = this.getGraphicOptions(item, sr, layerListLayer.layerObject.renderer);
              var gra = new Graphic(go);
              gra.setSymbol(go.symbol);
              gra.setAttributes(item.attributes);
              if (this._infoTemplate) {
                gra.setInfoTemplate(this._infoTemplate);
              }
              parentLayer.layerObject.add(gra);
            } else {
              console.log("Null geometry skipped");
            }
          }
          layerListLayer.layerObject.refresh();
          parentLayer.layerObject.refresh();
          parentLayer.featureSet.features = responseFeatureSetFeatures;
          this.countFeatures(layerListLayer);
          if (layerListLayer.layerObject && layerListLayer.layerObject.visible) {
            this._loadList(layerListLayer, true);
          }
        }
      }
    },

    getGraphicOptions: function (item, sr, renderer) {
      var graphicOptions;
      if (typeof (item.geometry.rings) !== 'undefined') {
        graphicOptions = {
          geometry: {
            rings: item.geometry.rings,
            "spatialReference": { "wkid": sr.wkid }
          }
        };
      } else if (typeof (item.geometry.paths) !== 'undefined') {
        graphicOptions = {
          geometry: {
            paths: item.geometry.paths,
            "spatialReference": { "wkid": sr.wkid }
          }
        };
      } else {
        graphicOptions = {
          geometry: new Point(item.geometry.x, item.geometry.y, item.geometry.spatialReference),
          symbol: renderer.symbol
        };
      }
      return graphicOptions;
    },

    _initWidget: function () {
      this.hidePanel = typeof (this.config.hidePanel) !== 'undefined' ? this.config.hidePanel : false;
      this.showAllFeatures = typeof (this.config.showAllFeatures) !== 'undefined' ? this.config.showAllFeatures : false;
      if (this.map.itemId) {
        LayerInfos.getInstance(this.map, this.map.itemInfo)
          .then(lang.hitch(this, function (operLayerInfos) {
            this.opLayers = operLayerInfos._operLayers;
            this.opLayerInfos = operLayerInfos._layerInfos;
            this.operLayerInfos = operLayerInfos;
            this._updateLayerIDs();
            if (this.config.upgradeFields) {
              this._upgradeFields();
            }
            this._createPanelUI(this.configLayerInfos, operLayerInfos);
            this._addFilterChanged(operLayerInfos);
            this._addVisibleChanged(operLayerInfos);
          }));
      }
    },

    //added for backwards compatability
    //TODO need to move away from _layerInfos and _operLayers at 5.3
    _updateLayerIDs: function () {
      for (var i = 0; i < this.configLayerInfos.length; i++) {
        var configLayer = this.configLayerInfos[i];
        var jimuLayerInfo = this.operLayerInfos.getLayerInfoById(configLayer.id);
        if (!jimuLayerInfo) {
          var updated = false;
          for (var ii = 0; ii < this.opLayerInfos.length; ii++) {
            var _opLayer = this.opLayerInfos[ii];
            var originOpLayer = _opLayer ? _opLayer.originOperLayer : undefined;
            if ((_opLayer && _opLayer.subId && _opLayer.subId === configLayer.id) ||
              (originOpLayer && originOpLayer.itemId === configLayer.itemId)) {
              if (originOpLayer && originOpLayer.itemId === configLayer.itemId) {
                if (originOpLayer.featureCollection && originOpLayer.featureCollection.layers &&
                  originOpLayer.featureCollection.layers.hasOwnProperty('length')) {
                  var id = originOpLayer.featureCollection.layers[0].id;
                  jimuLayerInfo = this.operLayerInfos.getLayerInfoById(id);
                  if (jimuLayerInfo) {
                    this.configLayerInfos[i].id = id;
                    this.configLayerInfos[i].layer = id;
                    updated = true;
                  }
                }
              }
            } else if (originOpLayer && originOpLayer.url && configLayer.url && originOpLayer.url === configLayer.url) {
              jimuLayerInfo = this.operLayerInfos.getLayerInfoById(originOpLayer.id);
              if (jimuLayerInfo) {
                this.configLayerInfos[i].id = originOpLayer.id;
                this.configLayerInfos[i].layer = originOpLayer.id;
                updated = true;
              }
            }
          }
          if (!updated) {
            this.configLayerInfos.splice(i,1);
          }
        }
      }
    },

    //added for backwards compatability
    //could not handle directly in VersionManager as some stored layerInfos
    // do not have a valid infoTemplate saved
    _upgradeFields: function () {
      if (this.config.layerInfos) {
        for (var i = 0; i < this.config.layerInfos.length; i++) {
          var li = this.config.layerInfos[i];
          if (li && li.symbolData && li.symbolData.featureDisplayOptions) {
            var lyrInfo = this.operLayerInfos.getLayerInfoById(li.id);
            var fields = li.symbolData.featureDisplayOptions.fields;
            //At previous releases we would use the first field from the infoTemplate or
            //the first non-OID field from the layer if no fields were selected by the user
            if (typeof (fields) === 'undefined' || (fields.hasOwnProperty('length') && fields.length === 0)) {
              //check layer fields
              var layerObject = (lyrInfo && lyrInfo.layerObject) ? lyrInfo.layerObject : undefined;
              var oidFieldName = (layerObject && layerObject.objectIdField) ? layerObject.objectIdField : undefined;
              var firstLayerFieldName = "";
              var firstLayerFieldAlias = "";
              var layerFields = li.fields ? li.fields : layerObject ? layerObject.fields : undefined;
              if (layerFields && layerFields.length > 0) {
                layer_field_loop:
                for (var _i = 0; _i < layerFields.length; _i++) {
                  var f = layerFields[_i];
                  if (firstLayerFieldName === "" && f.type !== "esriFieldTypeOID" &&
                    f.type !== "esriFieldTypeGeometry" && f.name !== oidFieldName) {
                    firstLayerFieldName = f.name;
                    firstLayerFieldAlias = f.alias || f.name;
                  }
                  if (!oidFieldName) {
                    oidFieldName = f.type === "esriFieldTypeOID" ? f.name : oidFieldName;
                  }
                  if (oidFieldName && firstLayerFieldName !== "") {
                    break layer_field_loop;
                  }
                }
              }

              //check popup fields
              var keyFieldName = "";
              var keyFieldAlias = "";
              var infoTemplate = li.infoTemplate && li.infoTemplate.info && li.infoTemplate.info.fieldInfos ?
                li.infoTemplate : lyrInfo ? lyrInfo.getInfoTemplate() : undefined;
              var popupFields = infoTemplate ? infoTemplate.info.fieldInfos : [];
              popup_field_loop:
              for (var j = 0; j < popupFields.length; j++) {
                var popupField = popupFields[j];
                if (popupField && popupField.visible) {
                  keyFieldName = popupField.fieldName;
                  keyFieldAlias = popupField.label || popupField.fieldName;
                  break popup_field_loop;
                }
              }

              //update the config
              this.config.layerInfos[i].symbolData.featureDisplayOptions.fields = [{
                name: keyFieldName ? keyFieldName : firstLayerFieldName,
                label: keyFieldName ? keyFieldAlias : firstLayerFieldAlias
              }];
            }
          }
        }
      }
    },


    _addFilterChanged: function (layerInfos) {
      if (parseFloat(this.appConfig.wabVersion) >= 2.1) {
        this.own(layerInfos.on('layerInfosFilterChanged', lang.hitch(this, function (changedLayerInfoArray) {
          array.forEach(changedLayerInfoArray, lang.hitch(this, function (layerInfo) {
            var id = layerInfo.id;
            var clId = layerInfo.id + this.UNIQUE_APPEND_VAL_CL;
            if (this.layerList.hasOwnProperty(id)) {
              this.layerList[id].filter = layerInfo.getFilter();
            } else if (this.layerList.hasOwnProperty(clId)) {
              this.layerList[clId].layerObject.filter = layerInfo.getFilter();
              this.layerList[clId].layerObject._initFeatures();
            }
          }));
        })));
      }
    },

    _addVisibleChanged: function (layerInfos) {
      this.own(layerInfos.on('layerInfosIsVisibleChanged', lang.hitch(this, function (changedLayerInfos) {
        array.forEach(changedLayerInfos, function (layerInfo) {
          var id = layerInfo.id;
          var vis = layerInfo.isShowInMap();
          if (this.layerList.hasOwnProperty(id)) {
            if (id === this.layerList[id].li.id && this.layerList[id].visible !== vis) {
              this._toggleLayerUI(this.layerList[id].li, vis);
            } else if (id === this.layerList[id].id && this.layerList[id].visible !== vis) {
              this._toggleLayerUI(layerInfo, vis);
            }
          } else {
            for (var key in this.layerList) {
              var _vis = vis;
              var layerListLayer = this.layerList[key];
              if (layerListLayer.layerObject && layerListLayer.layerObject.id === id) {
                var li = this.operLayerInfos.getLayerInfoById(key);
                if (layerInfo.layerObject && layerInfo.layerObject.visibleLayers &&
                  layerListLayer.hasOwnProperty('li') && layerListLayer.li.hasOwnProperty('subLayerId')) {
                  _vis = vis && layerInfo.layerObject.visibleLayers.indexOf(layerListLayer.li.subLayerId) > -1;
                } else {
                  _vis = li ? vis && li._visible : vis;
                }
                if (layerListLayer.visible !== _vis) {
                  this._toggleLayerUI(li, _vis);
                }
              }
            }
          }
        }, this);
      })));
    },

    _updatePanelHeader: function () {
      this.pageLabel.innerHTML = utils.stripHTML(this.label);
      domStyle.set(this.pageLabel, "display", "block");
      var panelTitle;
      var w = this.map.width;
      if (this.config.displayPanelIcon && w > 750) {
        if (this.pageHeader) {
          html.removeClass(this.pageHeader, "pageHeaderNoIcon");
          html.removeClass(this.pageHeader, "pageHeaderNoIconRefresh");

          if (this.config.refreshEnabled) {
            if (this.config.mainPanelText !== "") {
              html.addClass(this.pageHeader, "pageHeaderRefresh");
            } else {
              html.addClass(this.pageHeader, "pageHeaderRefreshNoText");
            }
          } else {
            html.addClass(this.pageHeader, "pageHeader");
          }
        }

        if (this.pageBody) {
          html.removeClass(this.pageBody, "pageBodyNoIcon");
          html.removeClass(this.pageBody, "pageBodyNoIconRefresh");
          if (this.config.refreshEnabled) {
            if (this.config.mainPanelText !== "") {
              html.addClass(this.pageBody, "pageBodyRefresh");
            } else {
              html.addClass(this.pageBody, "pageBodyRefreshNoText");
            }
          } else {
            html.addClass(this.pageBody, "pageBody");
          }
        }

        if (this.pageTitle) {
          html.addClass(this.pageTitle, "pageTitleWidth");
          if (this.config.refreshEnabled) {
            html.removeClass(this.pageTitle, "pageTitle");
            html.addClass(this.pageTitle, "pageTitleRefresh");
          } else {
            html.removeClass(this.pageTitle, "pageTitleRefresh");
            html.addClass(this.pageTitle, "pageTitle");
          }
        }

        panelTitle = this.config.mainPanelText;
        if (typeof (panelTitle) === 'undefined') {
          panelTitle = "";
        }
        this.pageTitle.innerHTML = panelTitle;
        this.panelMainIcon.innerHTML = this.config.mainPanelIcon;
      } else if (!this.config.displayPanelIcon && !this.config.refreshEnabled) {
        if (this.pageHeader) {
          html.removeClass(this.pageHeader, "pageHeader");
          html.removeClass(this.pageHeader, "pageHeaderNoIconRefresh");
          html.addClass(this.pageHeader, "pageHeaderNoIcon");
        }

        if (this.pageBody) {
          html.removeClass(this.pageBody, "pageBody");
          html.removeClass(this.pageBody, "pageBodyNoIconRefresh");
          html.addClass(this.pageBody, "pageBodyNoIcon");
        }
        this.pageTitle.innerHTML = "<div></div>";
        this.panelMainIcon.innerHTML = "<div></div>";
      } else if (!this.config.displayPanelIcon && this.config.refreshEnabled) {
        if (this.pageHeader) {
          html.removeClass(this.pageHeader, "pageHeader");
          html.removeClass(this.pageHeader, "pageHeaderNoIcon");
          html.addClass(this.pageHeader, "pageHeaderNoIconRefresh");
        }

        if (this.pageBody) {
          html.removeClass(this.pageBody, "pageBody");
          html.removeClass(this.pageBody, "pageBodyNoIcon");
          html.addClass(this.pageBody, "pageBodyNoIconRefresh");
        }

        if (this.pageTitle) {
          html.removeClass(this.pageTitle, "pageTitleWidth");
        }
        this.pageTitle.innerHTML = "<div></div>";
        this.panelMainIcon.innerHTML = "<div></div>";
      } else if (this.config.displayPanelIcon && w <= 750 && this.config.refreshEnabled) {
        if (this.pageHeader) {
          html.removeClass(this.pageHeader, "pageHeaderNoIcon");
          html.removeClass(this.pageHeader, "pageHeaderNoIconRefresh");
          html.removeClass(this.pageHeader, "pageHeader");
          if (this.config.mainPanelText !== "") {
            html.addClass(this.pageHeader, "pageHeaderRefresh");
          } else {
            html.addClass(this.pageHeader, "pageHeaderRefreshNoText");
          }
        }

        if (this.pageBody) {
          html.removeClass(this.pageBody, "pageBodyNoIcon");
          html.removeClass(this.pageBody, "pageBodyNoIconRefresh");
          html.removeClass(this.pageBody, "pageBody");
          if (this.config.mainPanelText !== "") {
            html.addClass(this.pageBody, "pageBodyRefresh");
          } else {
            html.addClass(this.pageBody, "pageBodyRefreshNoText");
          }
        }

        if (this.pageTitle) {
          html.addClass(this.pageTitle, "pageTitleWidth");
        }

        panelTitle = this.config.mainPanelText;
        if (typeof (panelTitle) === 'undefined') {
          panelTitle = "";
        }
        this.pageTitle.innerHTML = panelTitle;
      }

      if (this.windowWidth > 470) {
        this._setMaxHeight();
      } else {
        this._setMobileMaxHeight();
      }
      this._setMaxWidth();
    },

    _createPanelUI: function (configLayerInfos, jimuLayerInfos) {
      this.numClusterLayers = 0;

      if (!this.hidePanel) {
        this._updatePanelHeader();
        this._updateUI(null);
        this._clearChildNodes(this.pageMain);
        this.updateEnd = [];
      }

      for (var i = 0; i < configLayerInfos.length; i++) {
        var lyrInfo = configLayerInfos[i];
        if (lyrInfo.symbolData.clusterType === 'ThemeCluster') {
          this.updateThemeClusterSymbol(lyrInfo, i);
        }
        var jimuLayerInfo = jimuLayerInfos.getLayerInfoById(lyrInfo.id);
        if (!jimuLayerInfo) {
          for (var ii = 0; ii < this.opLayerInfos.length; ii++) {
            var _opLayer = this.opLayerInfos[ii];
            if (_opLayer && _opLayer._subLayerInfoIndex) {
              var subKeys = Object.keys(_opLayer._subLayerInfoIndex);
              if (subKeys.length && subKeys.length > 0) {
                configLayerInfos[i].id = subKeys[0];
                configLayerInfos[i].layer = subKeys[0];
                jimuLayerInfo = jimuLayerInfos.getLayerInfoById(lyrInfo.id);
              }
            }
          }
        }
        if (jimuLayerInfo) {
          this._createLayerListItem(lyrInfo, jimuLayerInfo);
        }
      }

      if (!this.hidePanel) {
        domConstruct.create("div", {
          'class': "expandArrow roundedBottom jimu-main-background dart-bgcolor box-bgcolor"
        }, this.pageMain);

        for (var k in this.layerList) {
          var lyr = this.layerList[k];
          if (lyr.type !== "ClusterLayer") {
            if (lyr && lyr.layerObject) {
              if (lyr.layerObject.hasOwnProperty('refreshInterval') && lyr.layerObject.refreshInterval > 0) {
                this.updateEnd.push(this.own(on(lyr.layerObject, "update-end", lang.hitch(this, this._updateEnd))));
              }
            }
          }
        }
      }
      this.addMapLayers();
    },

    _updateEnd: function (results) {
      var lid = this.layerList.hasOwnProperty(results.target.id) ? results.target.id : results.target.id + "_CL";
      var lyr = this.layerList[lid];
      lyr.isLoaded = false;
      lyr.updating = false;
      lyr.requiresReload = true;
      if (lyr) {
        if (lyr.legendOpen) {
          this._loadList(lyr, this.config.countEnabled);
        } else if (this.config.countEnabled) {
          this.countFeatures(lyr);
        }
      }
    },

    updateThemeClusterSymbol: function(lyrInfo, i){
      var sd = lyrInfo.symbolData;
      if (this.appConfig.theme.styles && this.appConfig.theme.styles[0]) {
        if (typeof (this._styleColor) === 'undefined') {
          this._updateStyleColor(this.appConfig.theme.styles[0]);
        }
      }
      if (this._styleColor) {
        var _rgb = dojoColor.fromHex(this._styleColor);
        var x = i + 1;
        var xx = x > 0 ? x * 30 : 30;
        var evenOdd = x % 2 === 0;
        var r = _rgb.r;
        var g = _rgb.g;
        var b = _rgb.b;

        var rr = r - xx;
        if (evenOdd) {
          if (rr > 255) {
            rr = rr - 255;
          }
          else if (rr < 0) {
            rr = rr + 255;
          }
        }

        var bb = b - xx;
        if (x % 3 === 0) {
          if (evenOdd) {
            if (bb > 255) {
              bb = bb - 255;
            }
            else if (bb < 0) {
              bb = bb + 255;
            }
          }
        }

        var gg = g - xx;
        if (x % 5 === 0) {
          if (evenOdd) {
            if (gg > 255) {
              gg = gg - 255;
            }
            else if (gg < 0) {
              gg = gg + 255;
            }
          }
        }
        sd.clusterType = 'CustomCluster';
        sd.clusterSymbol = {
          color: [rr, gg, bb, 1],
          outline: {
            color: [0, 0, 0, 0],
            width: 0,
            type: "esriSLS",
            style: "esriSLSNull"
          },
          type: "esriSFS",
          style: "esriSFSSolid"
        };
      }
    },

    _createLayerListItem: function (lyrInfo, jimuLayerInfo) {
      jimuLayerInfo = this.operLayerInfos.getLayerInfoById(lyrInfo.id);
      var layerTypes = ["ArcGISFeatureLayer", "KML", "ArcGISStreamLayer", "CSV", "GeoRSS"];
      for (var ii = 0; ii < this.opLayers.length; ii++) {
        var layer = this.opLayers[ii];
        if (layer.id === lyrInfo.id || layer.id === lyrInfo.parentLayerID ||
          (layer.featureCollection && layer.featureCollection.layers && layer.featureCollection.layers.length > 0 &&
            layer.featureCollection.layers[0].id === lyrInfo.id)) {
          if (layer.layerType === "ArcGISMapServiceLayer") {
            var l = this._getSubLayerByURL(lyrInfo.id);
            if (typeof (l) !== 'undefined') {
              this.updateLayerList(l, lyrInfo, "Feature Layer", jimuLayerInfo);
              break;
            }
          } else if (layerTypes.indexOf(layer.layerType) > -1 ||
            typeof (layer.layerType) === 'undefined') {
            if (layer.layerObject && layer.id === lyrInfo.id) {
              this.updateLayerList(layer, lyrInfo,
                typeof (layer.layerType) === 'undefined' ? "Feature Layer" : layer.layerType, jimuLayerInfo);
              break;
            } else if (layer.featureCollection) {
              for (var iii = 0; iii < layer.featureCollection.layers.length; iii++) {
                var lyr = layer.featureCollection.layers[iii];
                if (lyr.id === lyrInfo.id || layer.id === lyrInfo.id) {
                  this.updateLayerList(lyr, lyrInfo, "Feature Collection", jimuLayerInfo);
                  break;
                }
              }
            } else if (layer.layerObject && layer.id === lyrInfo.parentLayerID) {
              var featureLayers;
              var lType;
              if (layer.type === "GeoRSS") {
                lType = "GeoRSS";
                featureLayers = layer.layerObject.getFeatureLayers();
              } else if (layer.type === "KML") {
                lType = "KML";
                featureLayers = layer.layerObject.getLayers();
              }
              if (featureLayers) {
                for (var k = 0; k < featureLayers.length; k++) {
                  var subLayer = featureLayers[k];
                  if (subLayer.id === lyrInfo.id) {
                    this.updateLayerList(subLayer, lyrInfo, lType, jimuLayerInfo);
                    break;
                  }
                }
              }
            }
          }
        }
      }
    },

    removeOldClusterLayers: function (lInfos) {
      //check if the widget was previously configured
      // with a layer that it no longer consumes...if so remove it
      var deleteLayers = [];
      for (var id in this.layerList) {
        var l = this.layerList[id];
        if (l.type === "ClusterLayer") {
          layer_info_loop:
            for (var i = 0; i < lInfos.length; i++) {
              var lo = lInfos[i];
              var potentialNewClusterID = lo.id + this.UNIQUE_APPEND_VAL_CL;
              if (potentialNewClusterID === id) {
                if (lo.symbolData && !lo.symbolData.clusteringEnabled) {
                  deleteLayers.push(id);
                }
                break layer_info_loop;
              }
            }
        }
      }
      if (deleteLayers.length > 0) {
        for (var dl in deleteLayers) {
          if (this.layerList.hasOwnProperty(deleteLayers[dl])) {
            //  if (this.map.graphicsLayerIds.indexOf(deleteLayers[dl]) > -1) {
            //    this.map.removeLayer(this.layerList[deleteLayers[dl]].layerObject);
            //  }
            this.layerList[deleteLayers[dl]].layerObject.destroy();
            delete this.layerList[deleteLayers[dl]];
          }
        }
      }
    },

    addMapLayers: function () {
      var ids = Object.keys(this.layerList).reverse();
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        var l = this.layerList[id];
        if (l.type && l.type === "ClusterLayer") {
          if (this.map.graphicsLayerIds.indexOf(id) === -1) {
            this.map.addLayer(l.layerObject);
          }
        }
      }
    },

    _getSubLayerByURL: function (id) {
      var n = null;
      for (var i = 0; i < this.opLayerInfos.length; i++) {
        var OpLyr = this.opLayerInfos[i];
        if (OpLyr.newSubLayers.length > 0) {
          n = this._recurseOpLayers(OpLyr.newSubLayers, id);
          if (n) {
            break;
          }
        }
      }
      return n;
    },

    _recurseOpLayers: function (pNode, id) {
      for (var i = 0; i < pNode.length; i++) {
        var Node = pNode[i];
        if (Node.newSubLayers.length > 0) {
          this._recurseOpLayers(Node.newSubLayers, id);
        } else {
          if (Node.id === id) {
            return Node;
          }
        }
      }
    },

    updateLayerList: function (lyr, lyrInfo, lyrType, jimuLayerInfo) {
      var l = null;
      var ll = null;
      var id = null;
      var _id = null;
      jimuLayerInfo = jimuLayerInfo === null ? this.operLayerInfos.getLayerInfoById(lyr.id) : jimuLayerInfo;
      var infoTemplate = jimuLayerInfo.getInfoTemplate() || lyrInfo.infoTemplate;
      var vis = jimuLayerInfo && jimuLayerInfo.isShowInMap ? jimuLayerInfo.isShowInMap() : true;
      var listDisabled = lyrInfo.symbolData.featureDisplayOptions.listDisabled ?
        lyrInfo.symbolData.featureDisplayOptions.listDisabled : lyrInfo.symbolData.featureDisplayOptions.fields ?
          lyrInfo.symbolData.featureDisplayOptions.fields.length === 0 : true;
      var originOpLayer = (jimuLayerInfo && jimuLayerInfo.originOperLayer) ? jimuLayerInfo.originOperLayer : undefined;
      var selfType = (originOpLayer && originOpLayer.selfType) ? jimuLayerInfo.originOperLayer.selfType : '';
      if (lyr.layerType === "ArcGISFeatureLayer") {
        if (lyrInfo.symbolData.clusteringEnabled) {
          l = this._getClusterLayer(lyrInfo, lyr, jimuLayerInfo, lyrType);
          this.layerList[l.id] = {
            type: "ClusterLayer",
            layerObject: l,
            visible: l.visible,
            id: l.id,
            li: lyrInfo,
            filter: jimuLayerInfo ? jimuLayerInfo.getFilter() : "1=1",
            infoTemplate: infoTemplate,
            selfType: selfType,
            listDisabled: listDisabled,
            showAllFeatures: this.showAllFeatures
          };
          if (!this.hidePanel && !this.showAllFeatures) {
            this.own(on(l, "update-end", lang.hitch(this, function () {
              if (!this.layerList[l.id].listDisabled) {
                this._loadList(this.layerList[l.id], true);
              }
            })));
          }
          this.numClusterLayers += 1;
        } else {
          if (lyr.parentLayerInfo) {
            if (lyr.parentLayerInfo.layerObject) {
              ll = lyr.parentLayerInfo.layerObject;
              id = lyrInfo.id;
            }
          }
          l = lyr.layerObject;
          _id = id ? id : lyrInfo.id;
          this.layerList[_id] = {
            type: ll ? lyrType : l.type,
            layerObject: ll ? ll : l,
            visible: vis,
            pl: lyr,
            li: lyrInfo,
            filter: jimuLayerInfo ? jimuLayerInfo.getFilter() : "1=1",
            infoTemplate: infoTemplate,
            selfType: selfType,
            listDisabled: listDisabled
          };
          this.updateRenderer(_id);
        }
      } else if (lyr.layerType === "ArcGISStreamLayer") {
        l = lyr.layerObject;
        this.layerList[l.id] = {
          type: "StreamLayer",
          layerObject: l,
          visible: vis,
          id: l.id,
          filter: jimuLayerInfo ? jimuLayerInfo.getFilter() : "1=1",
          infoTemplate: infoTemplate,
          selfType: selfType,
          listDisabled: listDisabled
        };
      } else {
        //These are the ones that are not marked as ArcGISFeatureLayer
        if (lyrInfo.symbolData.clusteringEnabled) {
          l = this._getClusterLayer(lyrInfo, lyr, jimuLayerInfo, lyrType);
          this.layerList[l.id] = {
            type: "ClusterLayer",
            layerObject: l,
            visible: l.visible,
            id: l.id,
            li: lyrInfo,
            filter: jimuLayerInfo ? jimuLayerInfo.getFilter() : "1=1",
            infoTemplate: infoTemplate,
            selfType: (selfType && selfType !== '') ? selfType : (originOpLayer && originOpLayer.layerType &&
              originOpLayer.layerType === "CSV") ? "collection" : lyrType === "Feature Collection" ? "collection" : '',
            listDisabled: listDisabled,
            showAllFeatures: this.showAllFeatures
          };
          if (!this.hidePanel && !this.showAllFeatures) {
            this.own(on(l, "update-end", lang.hitch(this, function () {
              if (!this.layerList[l.id].listDisabled) {
                this._loadList(this.layerList[l.id], true);
              }
            })));
          }
          this.numClusterLayers += 1;
        } else {
          if (lyr.parentLayerInfo) {
            if (lyr.parentLayerInfo.layerObject) {
              ll = lyr.parentLayerInfo.layerObject;
              if (ll.visibleLayers) {
                id = lyr.id;
              } else {
                id = ll.id;
              }
            }
          }
          l = lyr.layerObject;
          _id = id ? id : lyr.id;
          this.layerList[_id] = {
            type: ll ? lyrType : l ? l.type : lyrType,
            layerObject: ll ? ll : l ? l : lyr,
            visible: vis,
            pl: lyr,
            li: lyrInfo,
            filter: jimuLayerInfo ? jimuLayerInfo.getFilter() : "1=1",
            infoTemplate: infoTemplate,
            selfType: (selfType && selfType !== '') ? selfType : (originOpLayer && originOpLayer.layerType &&
              originOpLayer.layerType === "CSV") ? "collection" : lyrType === "Feature Collection" ? "collection" : '',
            listDisabled: listDisabled
          };
          this.updateRenderer(_id);
        }
      }
      if (!this.hidePanel) {
        this._addPanelItem(ll ? ll : l ? l : lyr, lyrInfo, listDisabled);
      }
    },

    updateRenderer: function (id) {
      var l = this.layerList[id];
      if (l.li.symbolData.symbolType !== 'LayerSymbol') {
        if (typeof (l.li.orgRenderer) === 'undefined') {
          if (l.layerObject.renderer) {
            l.li.orgRenderer = l.layerObject.renderer;
          } else {
            l.li.orgRenderer = l.li.renderer;
          }
        }
        var renderer = new SimpleRenderer(jsonUtils.fromJson(l.li.symbolData.symbol));
        l.li.newRenderer = renderer;
        if (l.layerObject.setRenderer) {
          l.layerObject.setRenderer(renderer);
        } else if (l.layerObject.setLayerDrawingOptions) {
          var optionsArray = [];
          var drawingOptions = new LayerDrawingOptions();
          drawingOptions.renderer = renderer;
          optionsArray[l.li.subLayerId] = drawingOptions;
          l.layerObject.setLayerDrawingOptions(optionsArray);
        } else {
          console.log("Error setting the new renderer...will use the default rendering of the layer");
        }
        l.layerObject.refresh();
      }
    },

    _onRecNodeMouseover: function (rec) {
      domClass.add(rec, this.isDartTheme ? "layer-row-mouseover-dart" : "layer-row-mouseover");
    },

    _onRecNodeMouseout: function (rec) {
      domClass.remove(rec, this.isDartTheme ? "layer-row-mouseover-dart" : "layer-row-mouseover");
    },

    _addPanelItem: function (layer, lyrInfo, listDisabled) {
      var id = layer.visibleLayers ? lyrInfo.id : layer.id;
      var lyrType = this.layerList[id].type;
      var cssAry;
      if (this.isDartTheme) {
        cssAry = ['rec-dart', 'expand-dart', 'expandDown-dart', 'solidBorder-dart'];
      }else {
        cssAry = ['rec', 'expand', 'expandDown', 'solidBorder'];
      }
      var rec = domConstruct.create("div", {
        'class': cssAry[0] + " " + cssAry[3],
        id: 'rec_' + id
      }, this.pageMain);

      var expandClass;
      if (!listDisabled) {
        this.own(on(rec,
          'mouseover',
          lang.hitch(this, this._onRecNodeMouseover, rec)));
        this.own(on(rec,
          'mouseout',
          lang.hitch(this, this._onRecNodeMouseout, rec)));
        expandClass = cssAry[1] + " " + cssAry[2];
      } else {
        html.setStyle(rec, "cursor", "default");
        expandClass = 'expand-empty';
      }
      domConstruct.create("div", {
        'class': expandClass,
        id: "exp_" + id
      }, rec);

      var recIcon = domConstruct.create("div", {
        'class': "recIcon active",
        id: "recIcon_" + id
      }, rec);

      if (lyrInfo.panelImageData && lyrInfo.panelImageData.toString().indexOf('<img') > -1) {
        var img = document.createElement('div');
        img.innerHTML = lyrInfo.panelImageData;
        var icon = new PictureMarkerSymbol(img.children[0].src, 26, 26);
        lyrInfo.panelImageData = this._createImageDataDiv(icon, 44, 44, undefined, true).innerHTML;
      }
      recIcon.innerHTML = lyrInfo.panelImageData;
      domStyle.set(recIcon.firstChild, "border-radius", "41px");

      var _append = this.isDartTheme ? ' darkThemeColor' : ' lightThemeColor';
      var recLabel;
      var recNum;
      if (this.config.countEnabled) {
        recLabel = domConstruct.create("div", {
          'class': "recLabel" + _append,
          id: "recLabel_" + id,
          innerHTML: "<p>" + lyrInfo.label + "</p>"
        }, rec);
        html.setStyle(recLabel, "top", "20px");
        recNum = domConstruct.create("div", {
          'class': "recNum" + _append,
          id: "recNum_" + id,
          innerHTML: ""
        }, rec);
      } else {
        recLabel = domConstruct.create("div", {
          'class': "recLabelNoCount" + _append,
          id: "recLabel_" + id,
          innerHTML: "<p>" + lyrInfo.label + "</p>"
        }, rec);
      }

      if (lyrType === "ClusterLayer") {
        layer.node = recNum;
        if (!listDisabled) {
          this._addLegend(id, this.layerList[id]);
        }
        layer._updateNode(layer.nodeCount);
      } else if (lyrType === "StreamLayer") {
        this.layerList[id].node = recNum;
        this.countFeatures(this.layerList[id]);
        if (!listDisabled) {
          this._addLegend(id, this.layerList[id]);
        }
      } else {
        this.layerList[id].node = recNum;
        this._addLegend(id, this.layerList[id]);
      }

      on(recIcon, "click", lang.hitch(this, this._toggleLayerVisibility, this.layerList[id]));

      if (!listDisabled) {
        this.layerList[id].toggleLegend = on(rec, "click", lang.hitch(this, this._toggleLegend, this.layerList[id]));
      }
    },

    _addLegend: function (id, layerListLayer) {
      layerListLayer.legendOpen = this.row === null && this.config.expandList;
      var _class = layerListLayer.legendOpen ? "legendOn" : "legendOff";
      layerListLayer.legendNode = domConstruct.create("div", {
        "class": "legendLayer " + _class,
        "id": "legend_" + id
      }, this.pageMain);
      if (layerListLayer.type === 'ClusterLayer') {
        layerListLayer.layerObject.legendNode = layerListLayer.legendNode;
      }
      this.row = 'firstRowExpanded';
    },

    _getListFields: function (lyr) {
      var popupFields = [];
      var _infoTemp = this._getInfoTemplate(lyr);
      if (_infoTemp && _infoTemp.info) {
        var fieldInfos = _infoTemp.info.fieldInfos;
        if (typeof (fieldInfos) !== 'undefined') {
          for (var i = 0; i < fieldInfos.length; i++) {
            if (fieldInfos[i].visible) {
              popupFields.push(fieldInfos[i].fieldName);
            }
          }
        }
      }

      var displayOptions;
      if (lyr.li.symbolData) {
        displayOptions = lyr.li.symbolData.featureDisplayOptions;
        if (displayOptions) {
          if (displayOptions.fields) {
            for (var k = 0; k < displayOptions.fields.length; k++) {
              if (popupFields.indexOf(displayOptions.fields[k].name) === -1) {
                popupFields.push(displayOptions.fields[k].name);
              }
            }
          }
          if (displayOptions.groupField) {
            if (popupFields.indexOf(displayOptions.groupField.name) === -1) {
              popupFields.push(displayOptions.groupField.name);
            }
          }
        }
      }

      if (popupFields.length === 0 || typeof (_infoTemp) === 'undefined') {
        popupFields = ['*'];
      }

      if (popupFields[0] !== '*') {
        if (lyr.layerObject && lyr.layerObject.objectIdField) {
          if (popupFields.indexOf(lyr.layerObject.objectIdField) === -1) {
            popupFields.push(lyr.layerObject.objectIdField);
          }
        }
      }
      return popupFields;
    },

    _loadList: function (lyr, updateCount) {
      if (!this.hidePanel) {
        var queries = [];
        var updateNodes = [];
        var id = lyr.layerObject.id in this.layerList ? lyr.layerObject.id : lyr.li.id;
        if (updateCount) {
          this._addSearching(id);
        }

        var popupFields = this._getListFields(lyr);
        if (lyr.type === "ClusterLayer") {
          var features = [];
          if (lyr.layerObject.clusterGraphics || lyr.layerObject._features) {
            if (this.showAllFeatures) {
              features = lyr.layerObject._features;
            } else {
              var clusterGraphics = lyr.layerObject.clusterGraphics;
              for (var z = 0; z < clusterGraphics.length; z++) {
                var clusterGraphic = clusterGraphics[z];
                if (clusterGraphic.graphics && clusterGraphic.graphics.length > 0) {
                  for (var f = 0; f < clusterGraphic.graphics.length; f++) {
                    //Changed for a Sept fix...but it made upgrade not work
                    // need to verify the new switch will work for the other issue
                    //var g = new Graphic(clusterGraphic.graphics[f].toJson());
                    var g = clusterGraphic.graphics[f];
                    //g.setSymbol(lyr.layerObject._getSym(g));
                    features.push(g);
                  }
                }
              }
            }
            setTimeout(lang.hitch(this, function () {
              this._updateList(features, lyr.legendNode, lyr.layerObject.node, popupFields, updateCount, lyr);
            }), 100);
          } else {
            this._removeSearching(id, lyr.legendNode ? !domClass.contains(lyr.legendNode, 'legendOff') : true);
          }
        }

        var countLayerTypes = ["StreamLayer", "GeoRSS", "KML", "Feature Layer"];
        if (lyr.type !== 'ClusterLayer') {
          if (lyr.pl && lyr.pl.featureSet) {
            this.getFeatures(lyr, popupFields, updateCount);
            return;
          }
          else if (countLayerTypes.indexOf(lyr.type) > -1 || lyr.pl.type === "CSV") {
            this.getFeatures(lyr, popupFields, updateCount);
            return;
          }
        }

        if (lyr.li) {
          if (lyr.li.url && lyr.type !== "ClusterLayer" && typeof (lyr.queryFeatures) === 'undefined') {
            var url = lyr.li.url;
            if (url.indexOf("MapServer") > -1 || url.indexOf("FeatureServer") > -1) {
              if (this.promises) {
                this.promises.cancel('redundant', false);
                this.promises = undefined;
              }
              var q = new Query();
              q.where = lyr.filter ? lyr.filter : "1=1";
              q.geometry = this.map.extent;
              q.returnGeometry = !lyr.listDisabled ? true : false;
              q.outFields = popupFields;
              var qt = new QueryTask(url);
              queries.push(qt.execute(q));
              updateNodes.push({
                node: lyr.node,
                legendNode: lyr.legendNode,
                fields: popupFields,
                updateCount: updateCount,
                li: lyr.li
              });
            }
          }
        }
        if (queries.length > 0) {
          var promises = all(queries);
          this.promises = promises.then(lang.hitch(this, function (results) {
            this.promises = undefined;
            if (results) {
              for (var i = 0; i < results.length; i++) {
                if (results[i]) {
                  var un = updateNodes[i];
                  this._updateList(results[i].features, un.legendNode, un.node, un.fields, un.updateCount, un.li);
                }
              }
            }
          }));
        }
      }
    },

    _addSearching: function (id) {
      var disabled = this.layerList[id].listDisabled;
      var eD = disabled ? 'expand-empty' : this.isDartTheme ? 'expandDown-dart' : 'expandDown';
      var eU = disabled ? 'expand-empty' : this.isDartTheme ? 'expandUp-dart' : 'expandUp';
      var eS = disabled ? "expandSearching-empty" : "expandSearching";
      if (domClass.contains("exp_" + id, eD)) {
        domClass.remove("exp_" + id, eD);
        domClass.add("exp_" + id, eS);
      }
      if (domClass.contains("exp_" + id, eU)) {
        domClass.remove("exp_" + id, eU);
        domClass.add("exp_" + id, eS);
      }
    },

    _removeSearching: function (id, legendOpen) {
      var disabled = this.layerList[id].listDisabled;
      var eD = disabled ? 'expand-empty' : this.isDartTheme ? 'expandDown-dart' : 'expandDown';
      var eU = disabled ? 'expand-empty' : this.isDartTheme ? 'expandUp-dart' : 'expandUp';
      var eS = disabled ? "expandSearching-empty" : "expandSearching";
      if (domClass.contains("exp_" + id, eS)) {
        domClass.remove("exp_" + id, eS);
        domClass.add("exp_" + id, legendOpen ? eU : eD);
      }
    },

    _getClusterLayer: function (lyrInfo, layer, jimuLayerInfo, lyrType) {
      var lyr = layer.layerObject ? layer.layerObject : layer;
      var infoTemplate = lyrInfo.infoTemplate;
      var originOperLayer = lyr && lyr.originOperLayer ? lyr.originOperLayer : layer.parentLayerInfo ?
        layer.parentLayerInfo : jimuLayerInfo ? jimuLayerInfo.originOperLayer : undefined;
      var clusterLayer = null;
      var n;
      var potentialNewID = lyrInfo.id + this.UNIQUE_APPEND_VAL_CL;
      var configChange = true;
      if (this.map.graphicsLayerIds.indexOf(potentialNewID) > -1 || this.map._layers.indexOf(potentialNewID) > -1) {
        clusterLayer = this.map.getLayer(potentialNewID);

        var reloadData = false;
        var refreshData = false;

        //update the symbol if it has changed
        if (JSON.stringify(clusterLayer.symbolData) !== JSON.stringify(lyrInfo.symbolData)) {
          clusterLayer.symbolData = lyrInfo.symbolData;
          clusterLayer.countColor = lyrInfo.symbolData._highLightColor;
          refreshData = true;
        }

        //update the icon if it has changed
        n = domConstruct.toDom(lyrInfo.panelImageData);
        if (JSON.stringify(clusterLayer.icon) !== JSON.stringify(n.src)) {
          clusterLayer.icon = n.src;
          refreshData = true;
        }
        domConstruct.destroy(n.id);

        clusterLayer.displayFeatureCount = lyrInfo.symbolData.displayFeatureCount;

        if (clusterLayer.refresh !== lyrInfo.refresh) {
          clusterLayer.refresh = lyrInfo.refresh;
          reloadData = true;
        }

        if (refreshData) {
          clusterLayer._setupSymbols();
        }

        clusterLayer.countEnabled = this.config.countEnabled;
        clusterLayer.hidePanel = this.hidePanel;

        if (clusterLayer.showAllFeatures !== this.showAllFeatures) {
          reloadData = true;
          clusterLayer.showAllFeatures = this.showAllFeatures;
        }
        if (clusterLayer.listDisabled !== this.listDisabled) {
          reloadData = true;
          clusterLayer.listDisabled = this.listDisabled;
        }

        if (reloadData) {
          if (clusterLayer.url) {
            clusterLayer.refreshFeatures(clusterLayer.url);
          }
        } else if (refreshData) {
          clusterLayer.clusterFeatures();
        }
      } else {
        configChange = false;
        clusterLayer = new ClusterLayer({
          name: lyrInfo.label + this.UNIQUE_APPEND_VAL_CL,
          id: potentialNewID,
          map: this.map,
          node: dom.byId("recNum_" + potentialNewID),
          legendNode: dom.byId("legend_" + potentialNewID),
          infoTemplate: typeof (lyr.infoTemplate) !== 'undefined' ? lyr.infoTemplate : infoTemplate,
          refreshInterval: this.config.refreshInterval,
          refreshEnabled: this.config.refreshEnabled,
          parentLayer: lyr,
          lyrInfo: lyrInfo,
          lyrType: lyrType,
          _styleColor: this._styleColor,
          originOperLayer: originOperLayer,
          countEnabled: this.config.countEnabled,
          hidePanel: this.hidePanel,
          filter: jimuLayerInfo ? jimuLayerInfo.getFilter() : "1=1",
          showAllFeatures: this.showAllFeatures,
          listDisabled: this.listDisabled
        });
      }
      clusterLayer.setVisibility(configChange ? clusterLayer.visible :
        jimuLayerInfo.isShowInMap ? jimuLayerInfo.isShowInMap() : true);
      return clusterLayer;
    },

    _createImageDataDiv: function (sym, w, h, parent, isCustom) {
      var a;
      var symbol = sym;
      if (symbol) {
        //TODO are these switched??
        var height = w;
        var width = h;
        if (symbol.height && symbol.width) {
          var ar;
          if (symbol.height > symbol.width) {
            ar = symbol.width / symbol.height;
            width = w * ar;
          } else if (symbol.width === symbol.height || symbol.width > symbol.height) {
            width = w;
            ar = symbol.width / symbol.height;
            height = (ar > 0) ? h * ar : h;
          }
        }
        if (typeof (symbol.setWidth) !== 'undefined') {
          if (typeof (symbol.setHeight) !== 'undefined') {
            symbol.setWidth(isCustom ? width - (width * 0.25) : width);
            symbol.setHeight(isCustom ? height - (height * 0.25) : height);
          } else {
            symbol.setWidth(2);
          }
        } else if (typeof (symbol.size) !== 'undefined') {
          if (symbol.size > 20) {
            symbol.setSize(20);
          }
        }
        a = domConstruct.create("div", { 'class': "imageDataGFX" }, parent);
        var mySurface = gfx.createSurface(a, w, h);
        var descriptors = jsonUtils.getShapeDescriptors(symbol);
        var shape = mySurface.createShape(descriptors.defaultShape)
                      .setFill(descriptors.fill)
                      .setStroke(descriptors.stroke);
        shape.applyTransform({ dx: w / 2, dy: h / 2 });
      }
      return a;
    },

    _updateUI: function (styleName) {
      this.styleName = styleName;
    },

    _getLayerListLayerID: function (obj) {
      var id = obj.id ? obj.id : obj.layerObject.id;
      if (!this.layerList[id]) {
        if (obj.pl) {
          id = obj.pl.id;
        }
      }
      return id;
    },

    _toggleLayerVisibility: function (obj, e) {
      e.stopPropagation();
      this.map.infoWindow.hide();
      var id = this._getLayerListLayerID(obj);
      var lyr = this.layerList[id];
      if (lyr) {
        var hasSubLayerId = false;
        if (lyr.li) {
          if (lyr.li.hasOwnProperty("subLayerId")) {
            hasSubLayerId = typeof (lyr.li.subLayerId) !== 'undefined' && lyr.li.subLayerId.toString() !== "-1";
          }
        }
        var visLayers;
        var l;
        if (domClass.contains("recIcon_" + id, "active")) {
          if (hasSubLayerId && lyr.type !== 'ClusterLayer') {
            visLayers = lyr.layerObject.visibleLayers;
            for (var i = visLayers.length; i--;){
              if (visLayers[i] === -1) {
                visLayers.splice(i, 1);
              }
            }
            var lyrIndex = visLayers.indexOf(lyr.li.subLayerId);
            if (lyrIndex > -1) {
              visLayers.splice(lyrIndex, 1);
            }
            lyr.layerObject.setVisibleLayers(visLayers);
            lyr.layerObject.setVisibility(true);
          } else if (lyr) {
            lyr.layerObject.setVisibility(false);
            if (typeof (lyr.pl) !== 'undefined') {
              lyr.pl.visibility = false;
              if (this.map.graphicsLayerIds.indexOf(id) > -1) {
                l = this.map.getLayer(id);
                l.setVisibility(false);
              }
            }
          }
        } else {
          if (hasSubLayerId && lyr.type !== 'ClusterLayer') {
            visLayers = lyr.layerObject.visibleLayers;
            visLayers.push(lyr.li.subLayerId);
            for (var ii = visLayers.length; ii--;) {
              if (visLayers[ii] === -1) {
                visLayers.splice(ii, 1);
              }
            }
            lyr.layerObject.setVisibleLayers(visLayers);
            lyr.layerObject.setVisibility(true);
          } else if (lyr) {
            lyr.layerObject.setVisibility(true);
            if (lyr.type === 'ClusterLayer') {
              lyr.layerObject.handleMapExtentChange({ levelChange: true });
              lyr.layerObject.flashFeatures();
            }
            if (typeof (lyr.pl) !== 'undefined') {
              lyr.pl.visibility = true;
              if (this.map.graphicsLayerIds.indexOf(id) > -1) {
                l = this.map.getLayer(id);
                l.setVisibility(true);
              }
            }
          }
        }
      }
      return false;
    },

    _toggleLayerUI: function (obj, vis) {
      var _append = this.isDartTheme ? ' darkThemeColor' : ' lightThemeColor';
      var id = this._getLayerListLayerID(obj);
      var lyr = this.layerList[id];
      var visScaleRange = this._inVisibleRange(this.layerList[id], id);
      var eD = this.isDartTheme ? 'expandDown-dart' : 'expandDown';
      var eU = this.isDartTheme ? 'expandUp-dart' : 'expandUp';
      if (lyr) {
        var c = dom.byId("recLabel_" + id);
        if (!vis) {
          this.layerList[id].visible = false;
          this.layerList[id].parentLayerVisible = false;
          if (this.layerList[id].type === 'ClusterLayer') {
            this.layerList[id].layerObject.parentLayerVisible = false;
          }
          if (!this.hidePanel) {
            domClass.remove("recIcon_" + id, "active");
            if (this.config.countEnabled) {
              if (domClass.contains("recNum_" + id, "recNum")) {
                domClass.remove("recNum_" + id, "recNum");
                domClass.add("recNum_" + id, "recNumInActive" + _append);
              }
            }
            if (c && c.firstChild) {
              domClass.add(c.firstChild, "inActive");
            }
            if (!lyr.listDisabled) {
              if (!domClass.contains("exp_" + id, "expandInActive")) {
                domClass.add("exp_" + id, "expandInActive");
              }
              if (lyr.legendOpen) {
                if (domClass.contains("legend_" + id, "legendOn")) {
                  domClass.remove("legend_" + id, "legendOn");
                  domClass.add("legend_" + id, "legendOff");

                  if (domClass.contains("exp_" + id, eU)) {
                    domClass.remove("exp_" + id, eU);
                    domClass.add("exp_" + id, eD);
                  }
                }
              }
              if (lyr.toggleLegend) {
                lyr.toggleLegend.remove();
              }
            }
            if (domClass.contains("rec_" + id, "rec")) {
              domClass.add("rec_" + id, "recDefault");
            }
          }
        } else {
          if (lyr) {
            this.layerList[id].visible = true;
            this.layerList[id].parentLayerVisible = true;
          }
          this.layerList[id].visible = true;
          this.layerList[id].parentLayerVisible = true;
          if (lyr.type === 'ClusterLayer') {
            this.layerList[id].layerObject.parentLayerVisible = true;
          }

          if (!this.hidePanel) {
            if (dom.byId("recIcon_" + id)) {
              domClass.add("recIcon_" + id, "active");
            }
            if (this.config.countEnabled) {
              if (domClass.contains("recNum_" + id, "recNumInActive")) {
                domClass.remove("recNum_" + id, "recNumInActive");
                domClass.add("recNum_" + id, "recNum" + _append);
              }
            }
            if (c && c.firstChild && visScaleRange) {
              domClass.remove(c.firstChild, "inActive");
            }
            if (!lyr.listDisabled) {
              if (lyr.toggleLegend) {
                lyr.toggleLegend.remove();
              }
              var rec = dom.byId('rec_' + id);
              if (rec) {
                lyr.toggleLegend = on(rec, "click", lang.hitch(this, this._toggleLegend, lyr));
              }

              if (lyr.legendOpen) {
                if (domClass.contains("legend_" + id, "legendOff")) {
                  domClass.remove("legend_" + id, "legendOff");
                  domClass.add("legend_" + id, "legendOn");
                  if (domClass.contains("exp_" + id, eD)) {
                    domClass.remove("exp_" + id, eD);
                    domClass.add("exp_" + id, eU);
                  }
                }
              } else {
                if (domClass.contains("exp_" + id, eU)) {
                  domClass.remove("exp_" + id, eU);
                }
                if (visScaleRange) {
                  domClass.add("exp_" + id, eD);
                }
              }

              if (!lyr.isLoaded && ((lyr.li && lyr.li.layerListExtentChanged) || !lyr.isLoaded) &&
                lyr.legendOpen && !this.hidePanel && visScaleRange) {
                this._loadList(lyr, true);
              } else {
                if (lyr.type === 'ClusterLayer') {
                  lyr.layerObject.clusterFeatures();
                }
                if (visScaleRange) {
                  this.countFeatures(lyr);
                }
              }
            } else if (this.config.countEnabled && (lyr.li && lyr.li.layerListExtentChanged)) {
              if (lyr.type === 'ClusterLayer') {
                lyr.layerObject.clusterFeatures();
              }
              this.countFeatures(lyr);
            }

            if (domClass.contains("rec_" + id, "recDefault")) {
              domClass.remove("rec_" + id, "recDefault");
            }
          } else {
            if (lyr.type === 'ClusterLayer') {
              lyr.layerObject.clusterFeatures();
            }
          }

        }
      }
      return false;
    },

    _toggleLegend: function (obj, evt) {
      if (evt.currentTarget.className !== 'thumb2' && evt.currentTarget.className !== 'recIcon') {
        var id = obj.layerObject.id in this.layerList ? obj.layerObject.id : obj.li.id;
        if (domClass.contains("legend_" + id, "legendOff")) {
          this._addSearching(id);
          this.layerList[id].legendOpen = true;
          if (typeof (this.layerList[id].li.layerListExtentChanged) === 'undefined' ||
            this.layerList[id].requiresReload) {
            this.layerList[id].li.layerListExtentChanged = true;
            this.layerList[id].requiresReload = false;
          }
          if (this.layerList[id].li.layerListExtentChanged) {
            setTimeout(lang.hitch(this, function () {
              this._loadList(obj, false);
            }), 500);
          } else {
            this._removeSearching(id, true);
          }
          domClass.remove("legend_" + id, "legendOff");
          domClass.add("legend_" + id, "legendOn");
        } else {
          if (domClass.contains("legend_" + id, "legendOn")) {
            this.layerList[id].legendOpen = false;
            var eD = this.isDartTheme ? 'expandDown-dart' : 'expandDown';
            var eU = this.isDartTheme ? 'expandUp-dart' : 'expandUp';
            if (domClass.contains("exp_" + id, eU)) {
              domClass.remove("exp_" + id, eU);
              domClass.add("exp_" + id, eD);
            }
            domClass.remove("legend_" + id, "legendOn");
            domClass.add("legend_" + id, "legendOff");
            if (window.innerWidth < 470) {
              this._setMobileMaxHeight();
            }
          }
        }
      }
      evt.stopPropagation();
    },

    _toggleGroup: function (obj, e) {
      var id = e.currentTarget.id.slice(0, -2);
      var fI = this.isDartTheme ? 'featureItem-dart' : 'featureItem';

      var toggle = true;
      if (e.target.parentNode) {
        if (e.target.parentNode.id !== "") {
          if (domClass.contains(e.target.parentNode.id, fI)) {
            toggle = false;
          }
        }
        if (e.target.id !== "") {
          if (domClass.contains(e.target.id, fI)) {
            toggle = false;
          }
        }
      }

      var gII = this.isDartTheme ? "groupItemImage-dart" : "groupItemImage";
      var gIIUp = this.isDartTheme ? "groupItemImageUp-dart" : "groupItemImageUp";
      var gIIDown = this.isDartTheme ? "groupItemImageDown-dart" : "groupItemImageDown";
      if (toggle) {
        var lId = obj.layerObject.id in this.layerList ? obj.layerObject.id : obj.li.id;
        var node = document.getElementById(e.currentTarget.id);
        var _idx = node.childNodes[0].childNodes.length - 1;
        if (domClass.contains(id, "groupOff")) {
          if (this.layerList[lId].openGroups && this.layerList[lId].openGroups.length > 0) {
            if (this.layerList[lId].openGroups.indexOf(id) === -1) {
              this.layerList[lId].openGroups.push(id);
            }
          } else {
            this.layerList[lId].openGroups = [id];
          }
          domClass.remove(id, "groupOff");
          domClass.add(id, "groupOn");
          this.layerList[lId].groupOpen = true;
          if (node.childNodes[0].childNodes[_idx].childNodes[0].className.indexOf(gII) > -1) {
            html.removeClass(node.childNodes[0].childNodes[_idx].childNodes[0], gIIDown);
            html.addClass(node.childNodes[0].childNodes[_idx].childNodes[0], gIIUp);
          }
        } else {
          if (domClass.contains(id, "groupOn")) {
            domClass.remove(id, "groupOn");
            domClass.add(id, "groupOff");

            if (this.layerList[lId].openGroups && this.layerList[lId].openGroups.length > 0) {
              var idx = this.layerList[lId].openGroups.indexOf(id);
              if (idx > -1) {
                this.layerList[lId].openGroups.splice(idx, 1);
              }
              if(this.layerList[lId].openGroups.length === 0){
                this.layerList[lId].groupOpen = false;
              }
            } else {
              this.layerList[lId].groupOpen = false;
            }
            if (node.childNodes[0].childNodes[_idx].childNodes[0].className.indexOf(gII) > -1) {
              html.removeClass(node.childNodes[0].childNodes[_idx].childNodes[0], gIIUp);
              html.addClass(e.currentTarget.childNodes[0].childNodes[_idx].childNodes[0], gIIDown);
            }
          }
        }
      }
    },

    /*jshint unused:false*/
    onAppConfigChanged: function (appConfig, reason, changedData) {
      switch (reason) {
        case 'themeChange':
          this.inPanelOverrides(changedData);
          this.destroy();
          break;
        case 'layoutChange':
          this.destroy();
          break;
        case 'styleChange':
          if (!this.hidePanel) {
            this._updateUI(changedData);
            this._updateStyleColor(changedData);
          }
          break;
        case 'widgetChange':
          this.widgetChange = true;
          if (changedData && changedData.config && changedData.config.layerInfos) {
            this.removeOldClusterLayers(changedData.config.layerInfos);
          }
          //TODO make sure of what if anything I need to do here if any of the new options are changed
          // does initWidget run after this?
          this.row = null;
          break;
        case 'mapChange':
          this._clearMap();
      }
    },

    _updateStyleColor: function (changedData) {
      setTimeout(lang.hitch(this, function () {
        var p = this.getPanel();
        if (!this.hidePanel) {
          var node;
          switch (this.appConfig.theme.name) {
            default:
              node = this.pageHeader;
              break;
          }
          var bc = window.getComputedStyle(node, null).getPropertyValue('background-color');
          this._styleColor = bc ? Color.fromRgb(bc).toHex() : "#485566";
          for (var k in this.layerList) {
            var l = this.layerList[k];
            if (l.type === "ClusterLayer") {
              l.layerObject.setStyleColor(this._styleColor);
            }
          }
        }
        this._updateUI(changedData);
      }), 50);
    },

    _clearMap: function () {
      if (this.layerList) {
        for (var k in this.layerList) {
          var l = this.layerList[k];
          if (l.type === "ClusterLayer") {
            var _clear = true;
            if (typeof (this.continuousRefreshEnabled) !== 'undefined') {
              _clear = !this.continuousRefreshEnabled;
            }
            if (_clear) {
              l.layerObject._clear();
              this.map.removeLayer(l.layerObject);
            }
          }
        }
        this.layerList = {};
      }
    },

    _updateHeight: function (h) {
      if (window.innerWidth < 470) {
        var m = dom.byId('map');
        domStyle.set(m, "bottom", h + "px");
        domStyle.set(this.domNode, "top", window.innerHeight - h + "px");
      }
    },

    _windowResize: function () {
      this.windowWidth = window.innerWidth;
      if (this.windowWidth > 470) {
        if (this.isSmall) {
          this._close();
          this.widgetManager.triggerWidgetOpen(this.id);
        } else {
          this._resetMapDiv();
          this._setMaxHeight();
        }
      } else {
        if (!this.isSmall) {
          this._close();
          this.widgetManager.triggerWidgetOpen(this.id);
        } else {
          this.maxHeight = window.innerHeight * 0.35;
          this._updateHeight(this.maxHeight);
          this._setMobileMaxHeight();
          this.halfWidth = window.innerWidth / 2;
        }
      }
      this._setMaxWidth();
    },

    _setMaxHeight: function () {
      var mapHeight = this.map.height - this.pageHeader.clientHeight;
      var mh;
      switch (this.appConfig.theme.name) {
        case "BoxTheme":
          mh = mapHeight - 70;
          break;
        case "DartTheme":
          mh = mapHeight - 90;
          break;
        case "LaunchpadTheme":
          mh = mapHeight - 55;
          break;
        default:
          mh = mapHeight - 20;
          break;
      }

      if (this.pageBody && mh) {
        domStyle.set(this.pageBody, 'maxHeight', mh + "px");
      }
    },

    _setMobileMaxHeight: function () {
      var ch = this.pageHeader.clientHeight;
      var mh = this.maxHeight - ch;
      var height = mh;
      if (this.pageHeader.clientHeight > 0 && window.innerWidth <= 470) {
        var testHeight = this.config.layerInfos.length * 70;
        var maxNumRows = Math.floor(mh / 70);
        height = (maxNumRows > 1 && testHeight > 70) ? testHeight + 10 : 80;
        height = (height + ch) < this.maxHeight ? height + ch : testHeight > 70 ? (testHeight - 70) + ch + 10 : 80 + ch;
        if (this.pageMain.clientHeight > height) {
          height = mh;
        }
      }
      if (this.pageBody && height) {
        domStyle.set(this.pageBody, 'maxHeight', height + "px");
      }
      this._updateHeight(this.pageMain.clientHeight > height ? this.maxHeight : height);
    },

    _setMaxWidth: function () {
      this.mw = this.halfWidth;
      var _mw = this.mw < 360 && window.innerWidth > window.innerHeight;

      domStyle.set(this.panelMain, 'maxWidth', _mw ? this.mw + "px": "none");
      domStyle.set(this.panelMain, 'minWidth', _mw ? "100px" : "none");

      domStyle.set(this.panelPage, 'maxWidth', _mw ? this.mw + "px" : "none");
      domStyle.set(this.panelPage, 'minWidth', _mw ? "100px" : "none");

      domStyle.set(this.pageBody, 'maxWidth', _mw ? this.mw + "px" : "none");
      domStyle.set(this.pageBody, 'minWidth', _mw ? "100px" : "none");
    },

    setPosition: function (position, containerNode) {
      var pos;
      var style;
      if (!this.hidePanel) {
        this.inherited(arguments);
        this.position = {
          right: 0,
          bottom: 0,
          top: 0,
          height: "auto",
          'z-index': "auto"
        };

        this.windowWidth = window.innerWidth;

        if (this.windowWidth > 470) {
          this.isSmall = false;
          style = utils.getPositionStyle(this.position);
          style.position = 'static';
          html.place(this.domNode, this.map.id);
          style.width = '';
          html.setStyle(this.domNode, style);

          if (this.appConfig.theme.name === "LaunchpadTheme") {
            domStyle.set(this.pageContent, "top", "25px");
          }
          if (this.appConfig.theme.name === "DartTheme") {
            domStyle.set(this.panelMain, window.isRTL ? "left" : "right", "10px");
          }
          this._setMaxHeight();
        } else {
          this.isSmall = true;
          this.maxHeight = window.innerHeight * 0.35;
          this.position = {
            right: 0,
            bottom: 0,
            height: "none",
            'z-index': "auto",
            relativeTo: "browser",
            top: window.innerHeight - this.maxHeight,
            left: 0
          };

          this.position.relativeTo = "browser";
          style = utils.getPositionStyle(this.position);
          html.place(this.domNode, window.jimuConfig.layoutId);

          var m = dom.byId('map');
          m.style.bottom = this.maxHeight + "px";

          domStyle.set(this.domNode, "top", window.innerHeight - this.maxHeight + "px");
          domStyle.set(this.domNode, "left", "0px");
          domStyle.set(this.domNode, "right", "0px");

          if (this.appConfig.theme.name === "DartTheme") {
            domStyle.set(this.panelMain, window.isRTL ? "left" : "right", "0px");
          }

          this._setMobileMaxHeight();
        }

        this.halfWidth = window.innerWidth / 2;
        this._setMaxWidth();
      }
    },

    _close: function () {
      this.widgetManager.closeWidget(this.id);
    },

    onClose: function () {
      this.inherited(arguments);

      for (var key in this.layerList) {
        var layerListLayer = this.layerList[key];
        if (layerListLayer.li && layerListLayer.li.orgRenderer) {
          if (layerListLayer.layerObject.setRenderer) {
            layerListLayer.layerObject.setRenderer(layerListLayer.li.orgRenderer);
          } else if (layerListLayer.layerObject.setLayerDrawingOptions) {
            layerListLayer.layerObject.setLayerDrawingOptions([]);
          } else {
            console.log("Error re-setting the renderer");
          }
          layerListLayer.layerObject.refresh();
        }
      }

      var disableRefresh = true;
      if (typeof (this.config.continuousRefreshEnabled) !== 'undefined') {
        disableRefresh = !this.config.continuousRefreshEnabled;
      }
      if (disableRefresh) {
        if (this.refreshInterval !== 0) {
          this.refreshIntervalValue = 0;
          clearInterval(this.refreshInterval);
          this.refreshInterval = 0;
        }
      }

      if (!this.hidePanel) {
        if (typeof (this.mapExtentChangedHandler) !== 'undefined') {
          this.mapExtentChangedHandler.remove();
          this.mapExtentChangedHandler = undefined;
        }
        this.removeResizeOrientationHandlers();
        this._resetMapDiv();
      }
    },

    _resetMapDiv: function () {
      var m = dom.byId('map');
      m.style.bottom = "0px";
    },

    _clearChildNodes: function (parentNode) {
      while (parentNode.hasChildNodes()) {
        parentNode.removeChild(parentNode.lastChild);
      }
    },

    _inVisibleRange: function (lyr, id) {
      var visScaleRange = true;
      if (lyr.layerObject && lyr.layerObject.hasOwnProperty('visibleAtMapScale')) {
        visScaleRange = lyr.layerObject.visibleAtMapScale;
      }
      var lyrInfo = this.operLayerInfos.getLayerInfoById(id);
      if (lyrInfo && lyrInfo.isCurrentScaleInTheScaleRange) {
        visScaleRange = lyrInfo.isCurrentScaleInTheScaleRange();
      }
      return visScaleRange;
    },

    _mapExtentChange: function () {
      var countEnabled = this.config.countEnabled;
      var queries = [];
      var updateNodes = [];
      for (var key in this.layerList) {
        var lyr = this.layerList[key];
        var visScaleRange = this._inVisibleRange(lyr, key);
        if (!this.showAllFeatures) {
          this._clearList(lyr);
        }
        if (!lyr.legendOpen || (lyr.groupEnabled && !lyr.groupOpen)) {
          if (lyr.li) {
            lyr.li.layerListExtentChanged = true;
          }
          if (lyr.visible && visScaleRange) {
            if (lyr.li) {
              if (lyr.li.url && lyr.type !== "ClusterLayer" && typeof (lyr.layerObject.queryCount) === 'undefined') {
                var url = lyr.li.url;
                if (url.indexOf("MapServer") > -1 || url.indexOf("FeatureServer") > -1) {
                  if (this.promises) {
                    this.promises.cancel('redundant', false);
                    this.promises = undefined;
                  }
                  var q = new Query();
                  q.where = (lyr.filter && !this.showAllFeatures) ? lyr.filter : "1=1";
                  if (!this.showAllFeatures) {
                    q.geometry = this.map.extent;
                  }
                  q.returnGeometry = false;

                  var qt = new QueryTask(url);
                  queries.push(qt.executeForIds(q));
                  if (countEnabled) {
                    updateNodes.push(lyr.node);
                  } else {
                    updateNodes.push(lyr.legendNode);
                  }
                }
              }
            }
            if (lyr.type === "ClusterLayer" && lyr.layerObject.initalLoad && this.config.countEnabled) {
              lyr.layerObject._updateNode(lyr.layerObject.node.innerHTML);
            }

            if (lyr.type !== 'ClusterLayer') {
              var uNode = this.config.countEnabled ? lyr.node : lyr.legendNode;
              if (typeof (lyr.layerObject) === 'undefined') {
                console.log("layer object not known");
              } else {
                this.countFeatures(lyr);
              }
            }
          } else if (!visScaleRange) {
            this._updateList([], lyr.legendNode, lyr.node, [], true, lyr);
          }
        } else {
          if (lyr.visible && visScaleRange) {
            lyr.updateList = true;
            this._loadList(lyr, lyr.updateList);
          } else {
            this._updateList([], lyr.legendNode, lyr.node, [], true, lyr);
          }
        }
      }
      if (queries.length > 0) {
        var promises = all(queries);
        this.promises = promises.then(function (results) {
          this.promises = undefined;
          if (results) {
            for (var i = 0; i < results.length; i++) {
              var r;
              if (results[i]) {
                if (domClass.contains(updateNodes[i].id, 'searching')) {
                  domClass.remove(updateNodes[i].id, 'searching');
                }
                r = results[i].length;
              } else {
                r = 0;
              }

              var parent;
              if (countEnabled) {
                updateNodes[i].innerHTML = utils.localizeNumber(r);
                parent = updateNodes[i].parentNode;
              }else{
                parent = updateNodes[i].previousSibling;
              }

              var id;
              var en;
              if (parent.id.indexOf('rec_') > -1) {
                id = parent.id.replace('rec_', '');
                en = dom.byId("exp_" + id);
              }
              if (r === 0) {
                if (parent) {
                  html.addClass(parent, "recDefault");
                  html.addClass(parent, "inActive");
                }
                if (en && !lyr.listDisabled) {
                  html.addClass(en, "expandInActive");
                }
              } else {
                if (parent) {
                  html.removeClass(parent, "recDefault");
                  html.removeClass(parent, "inActive");
                }
                if (en && !lyr.listDisabled) {
                  html.removeClass(en, "expandInActive");
                }
              }
            }
          }
        });
      }
    },

    _chunkRequest: function (lyr, url, IDs, max, fields, needsGeom) {
      var def = new Deferred();
      var queries = [];
      var i, j;
      for (i = 0, j = IDs.length; i < j; i += max) {
        var ids = IDs.slice(i, i + max);

        var q = new Query();
        q.outFields = fields;
        q.objectIds = ids;
        q.returnGeometry = needsGeom;

        if (lyr.queryFeatures) {
          queries.push(lyr.queryFeatures(q));
        } else if (url) {
          var qt = new QueryTask(url);
          queries.push(qt.execute(q));
        }
      }
      var queryList = new DeferredList(queries);
      queryList.then(lang.hitch(this, function (queryResults) {
        if (queryResults) {
          var allFeatures = [];
          for (var i = 0; i < queryResults.length; i++) {
            if (queryResults[i][1].features) {
              allFeatures.push.apply(allFeatures, queryResults[i][1].features);
            }
          }
          def.resolve(allFeatures);
        }
      }));
      return def;
    },


    getFeatures: function (lyrInfo, fields, updateCount) {
      var lyr = lyrInfo.layerObject;
      var legendNode = lyrInfo.legendNode;
      var node = lyrInfo.node;
      var _needsGeom = !lyrInfo.listDisabled && lyrInfo.legendOpen ? true : false;
      var visScaleRange = this._inVisibleRange(lyr, lyrInfo.id || lyrInfo.li.id);
      var maxRecordCount = (lyr && lyr.maxRecordCount) ? lyr.maxRecordCount : undefined;
      var url;
      var queries = [];
      var q = new Query();
      q.geometry = !this.showAllFeatures ? this.map.extent : null;
      q.outFields = fields;
      var collectionTypes = ['collection', 'kml', 'geo_rss'];
      var isCollection = lyrInfo.selfType ? collectionTypes.indexOf(lyrInfo.selfType) > -1 : false;
      if (!isCollection) {
        q.where = lyrInfo.filter ? lyrInfo.filter : "1=1";
      } else if (this.showAllFeatures && lyr && lyr.fullExtent) {
        q.geometry = lyr.fullExtent;
      }
      q.returnGeometry = _needsGeom;
      if (lyrInfo.visible && visScaleRange) {
        if (lyr.queryFeatures) {
          //get the first set of features
          if (!lyrInfo.listDisabled) {
            queries.push(lyr.queryFeatures(q));
          }
          //query the ids incase we need more than maxRecordCount
          queries.push(lyr.queryIds(q));
        } else {
          url = lyrInfo.li.url;
          if (url.indexOf("MapServer") > -1 || url.indexOf("FeatureServer") > -1) {
            var qt = new QueryTask(url);
            //get the first set of features
            if (!lyrInfo.listDisabled) {
              queries.push(qt.execute(q));
            }
            //query the ids incase we need more than maxRecordCount
            queries.push(qt.executeForIds(q));
          }
        }
      } else {
        //if it's not visible and not within the visible scale range
        this._updateList([], lyrInfo.legendNode, lyrInfo.node, [], true, lyrInfo);
      }
      if (queries.length > 0) {
        var featurePromises = all(queries);
        featurePromises.then(lang.hitch(this, function (results) {
          var s_id = lyrInfo.layerObject.id in this.layerList ? lyrInfo.layerObject.id : lyrInfo.li.id;
          var updateNode;
          if (node) {
            updateNode = this.config.countEnabled ? node.parentNode : node.previousSibling;
          }
          if (results && results.length > 1) {
            var _queries = [];
            var queryIDs = results[1];
            var count = 0;
            //if IDs exceed max count we need to chunk
            if (queryIDs && maxRecordCount && queryIDs.length > maxRecordCount) {
              this._chunkRequest(lyr, url, queryIDs, maxRecordCount, fields, _needsGeom).then(lang.hitch(this,
                function (fullFeatures) {
                this._updateList(fullFeatures, legendNode, node, fields, updateCount, lyrInfo);
              }));
            } else {
              this._updateList(results[0].features, legendNode, node, fields, updateCount, lyrInfo);
            }
          } else if (results && results.length === 1) {
            if (this.config.countEnabled) {
              node.innerHTML = utils.localizeNumber(results[0].length);
            }
            this._removeSearching(s_id, false);
          } else {
            if (this.config.countEnabled) {
              node.innerHTML = utils.localizeNumber(0);
            }
            this.updateExpand(updateNode, true);
            this._removeSearching(s_id, lyrInfo.legendOpen);
          }
        }));
      }
    },

    _clearList: function (lyrInfo) {
      if (!lyrInfo.isLoaded && lyrInfo.legendNode) {
        lyrInfo.isLoaded = false;
        lyrInfo.legendNode.innerHTML = '';
      }
    },

    _updateList: function (features, legendNode, node, fields, updateCount, lyrInfo, countOnly) {
      if (lyrInfo.type === 'ClusterLayer') {
        if (lyrInfo.layerObject.node) {
          if (domClass.contains(lyrInfo.layerObject.node.id, 'searching')) {
            domClass.remove(lyrInfo.layerObject.node.id, 'searching');
          }
        }
      }
      var infoTemplate = lyrInfo.infoTemplate;
      var displayOptions = lyrInfo.li.symbolData.featureDisplayOptions;

      if (node || legendNode) {
        if (legendNode && (lyrInfo.hasOwnProperty('isLoaded') ? !lyrInfo.isLoaded : true)) {
          legendNode.innerHTML = '';
        }
        if (updateCount && node && this.config.countEnabled) {
          node.innerHTML = utils.localizeNumber(features.length);
        }
        var updateNode = this.config.countEnabled ? node.parentNode : legendNode.previousSibling;
        if ((lyrInfo.type === 'ClusterLayer' && lyrInfo.visible) || lyrInfo.type !== 'ClusterLayer') {
          this.updateExpand(updateNode, features.length === 0);
        }
      }
      if (countOnly) {
        return;
      }

      if (!lyrInfo.listDisabled && !lyrInfo.isLoaded) {
        if (features.length > 0) {
          var renderer;
          if (lyrInfo.type === "ClusterLayer") {
            renderer = lyrInfo.layerObject.renderer;
          } else if (features[0]._graphicsLayer) {
            renderer = features[0]._graphicsLayer.renderer;
          } else if (lyrInfo.layerObject.renderer) {
            renderer = lyrInfo.layerObject.renderer;
          } else if (lyrInfo.li.renderer) {
            renderer = jsonUtil.fromJson(lyrInfo.li.renderer) || lyrInfo.li.renderer;
          }

          var groupNodes = [];
          var finalGroupNodes = [];
          var finalDomNodes = [];
          for (var i = 0; i < features.length; i++) {
            var groupAdded = false;
            var feature = features[i];
            if (typeof (feature.infoTemplate) === 'undefined' && infoTemplate) {
              feature.infoTemplate = infoTemplate;
            }
            var symbol;
            if (renderer && renderer.getSymbol) {
              symbol = renderer.getSymbol(feature);
            } else if (feature.symbol) {
              symbol = jsonUtils.fromJson(feature.symbol);
            }

            var id;
            var oidName;
            if (feature._layer && feature._layer.objectIdField) {
              id = feature.attributes[feature._layer.objectIdField];
              oidName = feature._layer.objectIdField;
            } else if (lyrInfo.li && lyrInfo.li.oidFieldName) {
              id = feature.attributes[lyrInfo.li.oidFieldName.name];
              oidName = lyrInfo.li.oidFieldName.name;
            } else if (lyrInfo.layerObject && lyrInfo.layerObject.objectIdField) {
              id = feature.attributes[lyrInfo.layerObject.objectIdField];
              oidName = lyrInfo.layerObject.objectIdField;
            } else {
              id = legendNode.id + i;
            }
            var flds;
            var isNames = false;
            if (fields[0] === '*') {
              flds = feature.attributes;
            } else {
              flds = fields;
              isNames = true;
            }
            var displayStringObj = this.getDisplayString(feature, lyrInfo, flds, displayOptions, oidName, isNames);
            var displayString = displayStringObj.displayString;
            var aliasNames = displayStringObj.aliasNames;
            var firstValue = displayStringObj.firstValue;
            var groupField;
            var groupNode;
            var groupContainer;
            var displayValue;
            var groupType;
            if (displayOptions.groupEnabled) {
              var featureValue;
              var _value;
              var appendVal = undefined; // jshint ignore:line
              if (typeof (displayOptions.groupByField) === 'undefined' || displayOptions.groupByField) {
                groupField = displayOptions.groupField;
                featureValue = feature.attributes[groupField.name];
                groupType = 'byField';
                appendVal = featureValue;
              } else {
                groupField = displayOptions.groupByRendererOptions.fields[0];
                featureValue = feature.attributes[groupField.name];
                var groubByFields = displayOptions.groupByRendererOptions.fields;
                var groupByValues = displayOptions.groupByRendererOptions.values;
                groupType = 'byRenderer';

                if (featureValue !== null && featureValue !== "") {
                  expression_loop:
                  for (var ii = 0; ii < groupByValues.length; ii++) {
                    var _val = groupByValues[ii];
                    var exp = _val.value;
                    var expParts = exp.split("&&");
                    if (expParts && expParts.length > 1) {
                      exp = featureValue + expParts[0] + "&& " + featureValue + expParts[1];
                    } else {
                      exp = isNaN(featureValue) ? "'" + featureValue + "'" + _val.value : featureValue + _val.value;
                    }
                    if (eval(exp)) { // jshint ignore:line
                      _value = _val;
                      break expression_loop;
                    }
                  }
                  if (typeof (_value) !== 'undefined' && _value !== null) {
                    appendVal = _value.label.replace(/ /g, '');
                  }
                }
              }
              var gId = 'group_' + lyrInfo.li.id + "_" + groupField.name + "_" + appendVal;
              var addGroup = true;
              var n;
              if (groupNodes.length > 0) {
                node_loop:
                for (var iii = 0; iii < groupNodes.length; iii++) {
                  var gNode = groupNodes[iii];
                  if (gId === gNode.id) {
                    if (groupType === 'byField' && featureValue === gNode.value || groupType === 'byRenderer') {
                      addGroup = false;
                      n = gNode.node;
                      groupContainer = gNode.parent;
                      break node_loop;
                    }
                  }
                }
              }
              if (addGroup) {
                groupAdded = true;
                groupContainer = domConstruct.create('div', {
                  'class': this.isDartTheme ? 'groupItem-dart' : 'groupItem',
                  id: gId + "_c"
                });
                var groupTitle = domConstruct.create('div', {
                  'class': this.isDartTheme ? 'groupItemTitle-dart' : 'groupItemTitle',
                  id: gId + "_t"
                }, groupContainer);
                var label = "";
                var title = groupType === 'byRenderer' ? "" : groupField.name + ": ";
                if (typeof (aliasNames) !== 'undefined') {
                  if (aliasNames.hasOwnProperty(groupField.name) && aliasNames[groupField.name] !== '') {
                    if (groupType === 'byField') {
                      title = aliasNames[groupField.name] + ": ";
                    } else {
                      title = "";
                    }
                  }
                }
                if (groupType === 'byField') {
                  if (typeof (groupField.label) !== 'undefined' && groupField.label !== "") {
                    label = groupField.label + ": ";
                    title = label;
                  }
                  if (label === ": ") {
                    label = "";
                    title = "";
                  }
                } else {
                  if (typeof (_value) !== 'undefined') {
                    if (typeof (_value.label) !== 'undefined' && _value.label !== "") {
                      label = title + _value.label;
                      title = label;
                    }
                  } else {
                    label = title + featureValue;
                    title = label;
                  }
                  if (label === ": ") {
                    label = "";
                    title = "";
                  }
                }
                displayValue = featureValue;
                if (this._checkDateField(lyrInfo, groupField.name)) {
                  displayValue = this.formatDateValue(featureValue, groupField.name, lyrInfo);
                }
                var domainField = this._checkDomainField(lyrInfo, groupField.name);
                if (domainField) {
                  displayValue = this.formatDomainValue(featureValue, domainField);
                }

                if (groupType === 'byRenderer' && symbol) {
                  this._createImageDataDiv(lang.clone(symbol), 30, 30, groupTitle, isCustom);
                }

                domConstruct.create('div', {
                  'class': groupType === 'byField' ? this.isDartTheme ? 'groupField-dart' : 'groupField' :
                    this.isDartTheme ? 'groupFieldImage' : 'groupFieldImage',
                  innerHTML: groupType === 'byField' ? label + displayValue : label,
                  title: groupType === 'byField' ? title + displayValue : title
                }, groupTitle);

                var inGrpList = false;
                if (lyrInfo.openGroups && lyrInfo.openGroups.length > 0) {
                  inGrpList = lyrInfo.openGroups.indexOf(gId) > -1;
                }
                var _append = this.isDartTheme ? ' darkThemeColor' : ' lightThemeColor';
                var groupCountNode = domConstruct.create('div', {
                  'class': this.isDartTheme ? 'groupCountLabel-dart' : 'groupCountLabel' + _append
                }, groupTitle);

                var imageContainer = domConstruct.create('div', {
                  'class': this.isDartTheme ? 'expandImageContainer-dart' : 'expandImageContainer'
                }, groupTitle);

                var gIIUp = this.isDartTheme ? "groupItemImageUp-dart" : "groupItemImageUp";
                var gIIDown = this.isDartTheme ? "groupItemImageDown-dart" : "groupItemImageDown";
                var cNames = this.isDartTheme ? 'groupItemImage-dart' : 'groupItemImage';
                cNames += inGrpList ? ' ' + gIIUp : ' ' + gIIDown;
                domConstruct.create('div', {
                  'class': cNames
                }, imageContainer);

                cNames = this.isDartTheme ? 'groupItem-dart' : 'groupItem';
                cNames += (lyrInfo.groupOpen && inGrpList) ? ' groupOn' : ' groupOff';
                groupNode = domConstruct.create('div', {
                  'class': cNames,
                  id: gId
                }, groupContainer);

                groupNodes.push({
                  id: 'group_' + lyrInfo.li.id + "_" + groupField.name + "_" + appendVal,
                  node: groupNode,
                  parent: groupContainer,
                  value: featureValue
                });

                finalGroupNodes.push({
                  value: featureValue,
                  node: groupContainer,
                  countNode: groupCountNode,
                  count: 1
                });

                on(groupContainer, "click", lang.hitch(this, this._toggleGroup, lyrInfo));
              } else {
                var result = finalGroupNodes.filter(function (o) {
                  if (o.node.id === (n.id + "_c")) {
                    return o;
                  }
                });

                result[0].count += 1;
                groupNode = n;
              }
            }
            var featureItem = domConstruct.create('div', {
              'class': this.isDartTheme ? 'featureItem-dart' : 'featureItem',
              id: 'feature_' + lyrInfo.li.id + "_" + id
            });

            var isCustom = false;
            if (lyrInfo.li && lyrInfo.li.symbolData) {
              isCustom = lyrInfo.li.symbolData.symbolType === "CustomSymbol";
            }
            if (symbol) {
              if (displayOptions.groupEnabled && groupType === 'byRenderer') {
                //this._createImageDataDiv(lang.clone(symbol), 30, 30, groupTitle, isCustom);
              } else {
                this._createImageDataDiv(lang.clone(symbol), 30, 30, featureItem, isCustom);
              }
            }

            on(featureItem, "click", lang.hitch(this, this._panToFeature, feature));

            if (displayString.indexOf(" - ") > -1) {
              displayString = displayString.slice(0, -3);
            }
            var _margin = displayOptions.groupEnabled && groupType === 'byRenderer' ? "15px" : "35px";
            var _txtAlign = window.isRTL ? "right" : "left";
            domConstruct.create('div', {
              style: "padding: 7px 5px 5px " + _margin + "; text-align: " + _txtAlign + ";",
              innerHTML: displayString,
              title: displayString
            }, featureItem);

            finalDomNodes.push({
              node: featureItem,
              updateNode: groupNode ? groupNode : legendNode,
              firstValue: firstValue
            });
          }

          if (finalGroupNodes.length > 0) {
            //sort and place at legendNode
            var nodes = finalGroupNodes.sort(function (a, b) {
              if (typeof (a.value) === 'undefined') {
                return b.value;
              } else if (typeof (b.value) === 'undefined') {
                return a.value;
              }
              if (isNaN(a.value)) {
                return a.value.localeCompare(b.value);
              } else {
                return parseFloat(a.value) - parseFloat(b.value);
              }
            });
            var cE = this.config.countEnabled;
            array.forEach(nodes, function (n) {
              if (cE) {
                n.countNode.innerHTML = utils.localizeNumber(n.count);
              }
              legendNode.appendChild(n.node);
            });
          }

          if (finalDomNodes.length > 0) {
            var sortedNodes = finalDomNodes.sort(function (a, b) {
              var _a = a.firstValue;
              var _b = b.firstValue;
              if (typeof (_a) === 'undefined' || _a === null || _a === "") {
                return 1;
              } else if (typeof (_b) === 'undefined' || _b === null || _b === "") {
                return -1;
              } else if (_a === _b) {
                return 0;
              }
              return _a.toString().localeCompare(_b.toString());
            });
            array.forEach(sortedNodes, function (fdn) {
              domConstruct.place(fdn.node, fdn.updateNode);
            });
          }
        }
      }
      lyrInfo.li.layerListExtentChanged = false;

      var s_id = lyrInfo.layerObject.id in this.layerList ? lyrInfo.layerObject.id : lyrInfo.li.id;
      if (this.showAllFeatures) {
        lyrInfo.isLoaded = true;
      }

      if (window.innerWidth < 470) {
        this._setMobileMaxHeight();
      }

      this._removeSearching(s_id, lyrInfo.legendOpen);
    },

    updateDomainValues: function (feature, isNames, fields, lyrInfo) {
      var includeField;
      var dateField;
      var domainField;
      var displayString = "";
      var append;
      var featureValue;
      var fieldName;
      for (var a in fields) {
        fieldName = isNames ? fields[a] : a;
        domainField = this._checkDomainField(lyrInfo, fieldName);
        featureValue = feature.attributes[fieldName];
        if (domainField) {
          feature.attributes[fieldName] = this.formatDomainValue(featureValue, domainField);
        }
      }
      return feature;
    },

    updateExpand: function (node, hide) {
      if (typeof (node) !== 'undefined') {
        var id;
        var en;
        if (node.id.indexOf('rec_') > -1) {
          id = node.id.replace('rec_', '');
          en = dom.byId("exp_" + id);
        }

        if (hide) {
          if (node) {
            html.addClass(node, "recDefault");
            html.addClass(node, "inActive");
          }
          if (en) {
            if (!domClass.contains(en, 'expand-empty')) {
              html.addClass(en, "expandInActive");
            }
          }
        } else {
          if (node) {
            html.removeClass(node, "recDefault");
            html.removeClass(node, "inActive");
          }
          if (en) {
            if (!domClass.contains(en, 'expand-empty')) {
              html.removeClass(en, "expandInActive");
            }
          }
        }
      }
    },

    getDisplayString: function (feature, lyrInfo, fields, displayOptions, oidName, isNames) {
      var displayString = "";
      var aliasNames = {};
      var firstValue = "";
      if (displayOptions.fields.length > 0) {
        array.forEach(displayOptions.fields, lang.hitch(this, function (displayField) {
          for (var a in fields) {
            var fieldName = isNames ? fields[a] : a;
            if (fieldName === displayField.name) {
              var aliasName = this._checkAliasName(lyrInfo, fieldName);
              var append = "";
              var label = "";
              if (typeof(displayField.label) !== 'undefined') {
                label = displayField.label;
                append = displayField.label.trim() === "" ? "" : ": ";
              }
              var featureValue = feature.attributes[fieldName];
              if (this._checkDateField(lyrInfo, fieldName)) {
                featureValue = this.formatDateValue(featureValue, fieldName, lyrInfo);
              }
              var domainField = this._checkDomainField(lyrInfo, fieldName);
              if (domainField) {
                featureValue = this.formatDomainValue(featureValue, domainField);
              }
              aliasNames[fieldName] = aliasName;
              if (aliasName) {
                fieldName = aliasName;
              }
              if (firstValue === "") {
                firstValue = featureValue;
              }
              displayString += label + append + featureValue + " - ";
              break;
            }
          }
        }));
      }
      return {
        displayString: displayString,
        aliasNames: aliasNames,
        firstValue: firstValue
      };
    },

    _getInfoTemplate: function (lyrInfo) {
      var infoTemplate = lyrInfo.infoTemplate;
      if (!infoTemplate) {
        if (lyrInfo.layerObject && lyrInfo.layerObject.infoTemplate) {
          infoTemplate = lyrInfo.layerObject.infoTemplate;
        } else if (lyrInfo.li && lyrInfo.li.infoTemplate) {
          infoTemplate = lyrInfo.li.infoTemplate;
        }
      }
      if (!infoTemplate) {
        if (typeof (lyrInfo.li.subLayerId) !== 'undefined') {
          var infoTemplates = lyrInfo.layerObject.infoTemplates;
          if (infoTemplates && infoTemplates.hasOwnProperty(lyrInfo.li.subLayerId)) {
            infoTemplate = infoTemplates[lyrInfo.li.subLayerId].infoTemplate;
          }
        }
      }
      return infoTemplate;
    },

    formatDomainValue: function (v, domain) {
      if (domain && domain.codedValues) {
        var cvs = domain.codedValues;
        for (var i = 0; i < cvs.length; i++) {
          var cv = cvs[i];
          if (cv.code === v) {
            return cv.name;
          }
        }
      }
      return undefined;
    },

    formatDateValue: function (v, fieldName, lyrInfo) {
      if (v) {
        var options;
        var infoTemplate = this._getInfoTemplate(lyrInfo);
        if (infoTemplate) {
          var fieldsMap = infoTemplate._fieldsMap;
          if (fieldsMap) {
            for (var k in fieldsMap) {
              if (fieldsMap[k].fieldName === fieldName) {
                options = fieldsMap[k].format;
                break;
              }
            }
          }
        }
        if (typeof (options) === 'undefined') {
          //December 21,1997
          options = {
            dateFormat: 'shortDate'
          };
        }
        return utils.fieldFormatter.getFormattedDate(new Date(v), options);
      } else {
        return "";
      }
    },

    _checkAliasName: function (lyrInfo, fieldName) {
      var fields = lyrInfo.li.fields;
      if (fields) {
        for (var i = 0; i < fields.length; i++) {
          var field = fields[i];
          if (field.name === fieldName) {
            return typeof (field.alias) !== 'undefined' ? field.alias : false;
          }
        }
        return false;
      }
    },

    _checkDomainField: function (lyrInfo, fieldName) {
      var fields = lyrInfo.li.fields;
      if (fields) {
        for (var i = 0; i < fields.length; i++) {
          var field = fields[i];
          if (field.name === fieldName) {
            return typeof (field.domain) !== 'undefined' ? field.domain : false;
          }
        }
        return false;
      }
    },

    _checkDateField: function(lyrInfo, fieldName){
      var fields = lyrInfo.li.fields;
      if (fields) {
        for (var i = 0; i < fields.length; i++) {
          var field = fields[i];
          if (field.name === fieldName) {
            if (field.type === 'esriFieldTypeDate') {
              return true;
            } else {
              return false;
            }
          }
        }
        return false;
      }
    },

    _checkDisplayField: function(displayFields, featureField){
      var includeField = true;
      if (displayFields) {
        for (var j = 0; j < displayFields.length; j++) {
          if (displayFields[j].name === featureField) {
            return displayFields[j];
          } else {
            includeField = false;
          }
        }
      }
      return includeField;
    },

    flashGraphics: function (graphics) {
      for (var i = 0; i < graphics.length; i++) {
        var g = graphics[i];
        this._flashFeature(g);
      }
    },

    _flashFeature: function (feature) {
      var symbol;
      if (feature.geometry) {
        var color = Color.fromHex(this._styleColor);
        var color2 = lang.clone(color);
        color2.a = 0.4;
        switch (feature.geometry.type) {
          case 'point':
            symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 15,
              new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
              color, 1),
              color2);
            break;
          case 'polyline':
            symbol = new SimpleLineSymbol(
              SimpleLineSymbol.STYLE_SOLID,
              color,
              3
            );
            break;
          case 'polygon':
            symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_DIAGONAL_CROSS,
              new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
              color, 2), color2
            );
            break;
        }
      }

      var g = new Graphic(feature.geometry, symbol);
      this.map.graphics.add(g);
      var dShape = g.getDojoShape();
      if (dShape) {
        fx.animateStroke({
          shape: dShape,
          duration: 900,
          color: {
            start: dShape.strokeStyle.color,
            end: dShape.strokeStyle.color
          },
          width: {
            start: 25,
            end: 0
          }
        }).play();
        setTimeout(this._clearFeature, 1075, g);
      }
    },

    _clearFeature: function (f) {
      var gl = f.getLayer();
      gl.remove(f);
    },

    _panToFeature: function (feature) {
      if (feature.geometry) {
        var geom = feature.geometry;
        if (geom.type === 'polyline') {
          var path = geom.paths[Math.ceil(geom.paths.length / 2) - 1];
          var g = path[Math.ceil((path.length - 1) / 2)];
          geom = new Point(g[0], g[1], geom.spatialReference);
        }
        if (geom.type !== 'point') {
          geom = geom.getExtent().getCenter();
        }
        this._pan(feature, geom).then(lang.hitch(this, function () {
          this._flashFeature(feature);
          if ((feature._layer && feature._layer.infoTemplate) || feature.infoTemplate) {
            this.map.infoWindow.setFeatures([feature]);
            this.map.infoWindow.select(0);
            this.map.infoWindow.show(geom);
          }
        }));
      }
    },

    _pan: function (feature, centerPoint) {
      var def = new Deferred();
      if (this.showAllFeatures && !this.map.extent.contains(feature.geometry)) {
        this.map.centerAt(centerPoint).then(function (ext) {
          def.resolve(ext);
        });
      } else {
        def.resolve(undefined);
      }
      return def;
    },

    countFeatures: function (layerListLayer) {
      if (!this.hidePanel) {
        var lyr = layerListLayer.layerObject;
        var node = this.config.countEnabled ? layerListLayer.node : layerListLayer.legendNode;
        var q = new Query();
        q.geometry = !this.showAllFeatures ? this.map.extent : null;
        var collectionTypes = ['collection', 'kml', 'geo_rss'];
        var isCollection = layerListLayer.selfType ? collectionTypes.indexOf(layerListLayer.selfType) > -1 : false;
        //layer types from feature collection don't support where
        if (!isCollection) {
          q.where = layerListLayer.filter ? layerListLayer.filter : "1=1";
        } else if (this.showAllFeatures && lyr && lyr.fullExtent) {
          //still need a way to support showing of all features
          q.geometry = lyr.fullExtent;
        }
        if (lyr.queryCount && lyr.visible) {
          lyr.queryCount(q, lang.hitch(this, function (r) {
            if (node) {
              var updateNode;
              if (this.config.countEnabled) {
                node.innerHTML = utils.localizeNumber(r);
                updateNode = node.parentNode;
              } else {
                updateNode = node.previousSibling;
              }
              this.updateExpand(updateNode, r === 0);
            }
          }));
        } else if (layerListLayer.li && layerListLayer.li.url) {
          var url = layerListLayer.li.url;
          if (url.indexOf("MapServer") > -1 || url.indexOf("FeatureServer") > -1) {
            var qt = new QueryTask(url);
            qt.executeForIds(q).then(lang.hitch(this, function (ids) {
              if (node) {
                var updateNode;
                var length = ids ? ids.length : 0;
                if (this.config.countEnabled) {
                  node.innerHTML = utils.localizeNumber(length);
                  updateNode = node.parentNode;
                } else {
                  updateNode = node.previousSibling;
                }
                this.updateExpand(updateNode, length === 0);
              }
            }));
          }
        }
      }
    }
  });
});