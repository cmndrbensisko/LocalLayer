///////////////////////////////////////////////////////////////////////////
// Copyright 2014 Esri. All Rights Reserved.
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

define([
    'dojo/query',
    'dojo/dom-construct',
    'dojo/dom-class',
    'dojo/_base/declare',
    'dojo/_base/xhr',
    'dojo/_base/Color',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidgetSetting',
    'jimu/LayerInfos/LayerInfos',
    'dijit/form/Select',
    'dijit/form/ValidationTextBox',
    'dijit/form/CheckBox',
    'jimu/dijit/Popup',
    'jimu/dijit/SimpleTable',
    'jimu/dijit/ImageChooser',
    'jimu/utils',
    'jimu/dijit/Message',
    'esri/request',
    'dijit/popup',
    'dojo/_base/lang',
    'dojo/DeferredList',
    'dojo/on',
    'dojo/dom-style',
    'dojo/_base/html',
    'dojo/_base/array',
    './MySymbolPicker',
    'dojox/form/FileUploader'
],
  function (
    query,
    domConstruct,
    domClass,
    declare,
    xhr,
    dojoColor,
    _WidgetsInTemplateMixin,
    BaseWidgetSetting,
    LayerInfos,
    Select,
    ValidationTextBox,
    CheckBox,
    Popup,
    Table,
    ImageChooser,
    utils,
    Message,
    esriRequest,
    dijitPopup,
    lang,
    DeferredList,
    on,
    domStyle,
    html,
    array,
    SymbolPicker
    ) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: 'jimu-widget-InfoSummary-setting',
      _layerInfos: null,
      mpi: null,
      layer_options: [],
      refreshLayers: [],
      displayPanelIcon: false,
      used_layers: [],

      postCreate: function () {
        this.inherited(arguments);

        var opLayers = this.map.itemInfo.itemData.operationalLayers;
        if (opLayers.length === 0) {
          domStyle.set(this.btnAddLayer, "display", "none");
          domStyle.set(this.optionsContainer, "display", "none");
          domStyle.set(this.displayOptionsContainer, "display", "none");
          this._disableOk();
          new Message({
            message: this.nls.missingLayerInWebMap
          });
          return;
        }
        this.setupLayerTable();
        this.setupRefreshInterval();
        this._getAllLayers();
        this.own(on(this.btnAddLayer, 'click', lang.hitch(this, this._addLayerRow)));
        this.own(on(this.hidePanelOptions, 'change', lang.hitch(this, function (v) {
          this.hidePanel = v;
          this.panelCountOptions.set('disabled', v);
          this.panelIconOptions.set('disabled', v);
          this.expandListOptions.set('disabled', v);
          this.showAllFeaturesOptions.set('disabled', v);
          var previewContainer;
          if (v) {
            html.addClass(this.panelIconOptionsLabel, 'text-disabled');
            html.addClass(this.panelCountOptionsLabel, 'text-disabled');
            html.addClass(this.expandListOptionsLabel, 'text-disabled');
            html.addClass(this.showAllFeaturesOptionsLabel, 'text-disabled');
            this.displayPanelIcon = false;
            previewContainer = query('.mainPanelPreviewContainerOn', this.mainPanelPreviewContainer.domNode)[0];
            if (previewContainer) {
              html.removeClass(previewContainer, "mainPanelPreviewContainerOn");
              html.addClass(previewContainer, "mainPanelPreviewContainerOff");
            }
            if (domClass.contains(this.hidePanelHelpText, 'help-off')) {
              html.removeClass(this.hidePanelHelpText, 'help-off');
            }
            html.addClass(this.hidePanelHelpText, 'help-on');
          } else {
            html.removeClass(this.panelIconOptionsLabel, 'text-disabled');
            html.removeClass(this.panelCountOptionsLabel, 'text-disabled');
            html.removeClass(this.expandListOptionsLabel, 'text-disabled');
            html.removeClass(this.showAllFeaturesOptionsLabel, 'text-disabled');
            if (this.panelIconOptions.checked) {
              this.displayPanelIcon = true;
              previewContainer = query('.mainPanelPreviewContainerOff', this.mainPanelPreviewContainer.domNode)[0];
              if (previewContainer) {
                html.removeClass(previewContainer, "mainPanelPreviewContainerOff");
                html.addClass(previewContainer, "mainPanelPreviewContainerOn");
              }
            }
            if (domClass.contains(this.hidePanelHelpText, 'help-on')) {
              html.removeClass(this.hidePanelHelpText, 'help-on');
            }
            html.addClass(this.hidePanelHelpText, 'help-off');
          }
        })));
        this.own(on(this.panelCountOptions, 'change', lang.hitch(this, function (v) {
          this.countEnabled = v;
        })));
        this.own(on(this.panelIconOptions, 'change', lang.hitch(this, function () {
          var previewContainer;
          if (this.panelIconOptions.checked) {
            this.displayPanelIcon = true;
            previewContainer = query('.mainPanelPreviewContainerOff', this.mainPanelPreviewContainer.domNode)[0];
            html.removeClass(previewContainer, "mainPanelPreviewContainerOff");
            html.addClass(previewContainer, "mainPanelPreviewContainerOn");
          } else {
            this.displayPanelIcon = false;
            previewContainer = query('.mainPanelPreviewContainerOn', this.mainPanelPreviewContainer.domNode)[0];
            html.removeClass(previewContainer, "mainPanelPreviewContainerOn");
            html.addClass(previewContainer, "mainPanelPreviewContainerOff");
          }
        })));
      },

      startup: function () {
        this.inherited(arguments);
        this.refreshLayers = [];

        this.imageChooser = new ImageChooser({
          format: [ImageChooser.GIF, ImageChooser.JPEG, ImageChooser.PNG],
          label: this.nls.uploadImage,
          cropImage: false,
          showTip: false,
          goldenWidth: 10,
          goldenHeight: 15
        });

        domStyle.set(this.imageChooser.domNode, "font-size", "14px");
        html.place(this.imageChooser.domNode, this.mainPanelPreviewButton, 'replace');

        this.connect(this.imageChooser, "onImageChange", "uploadImage");
        this.isInitalLoad = false;
      },

      setupRefreshInterval: function () {
        this.refreshInterval.invalidMessage = this.nls.invalidInterval;
        this.refreshInterval.missingMessage = this.nls.missingRefreshValue;
      },

      setupLayerTable: function () {
        var fields = [{
          name: "layer",
          title: this.nls.layerName,
          "class": "label",
          type: "empty",
          width: "320px"
        }, {
          name: "label",
          "class": "label",
          title: this.nls.layerLabel,
          type: "empty",
          width: "255px"
        }, {
          name: "image",
          "class": "label",
          title: this.nls.iconColumnText + " " + this.nls.optionsText,
          width: "110px",
          actions: ["edit"],
          type: "actions"
        }, {
          name: "refresh",
          "class": "label",
          title: this.nls.layerRefresh,
          type: "empty",
          width: "80px"
        }, {
          name: "actions",
          "class": "label",
          title: this.nls.actions,
          type: "actions",
          actions: ["up", "down", "delete"],
          width: "93px"
        }];

        this.displayLayerTable = new Table({
          fields: fields,
          selectable: false,
          autoHeight: true
        });

        this.displayLayerTable.placeAt(this.layerTable);
        this.displayLayerTable.startup();
        this.own(on(this.displayLayerTable, 'actions-edit', lang.hitch(this, this._pickSymbol)));
        this.own(on(this.displayLayerTable, 'row-delete', lang.hitch(this, this._rowDeleted)));
      },

      _getAllLayers: function () {
        if (this.map.itemId) {
          LayerInfos.getInstance(this.map, this.map.itemInfo)
            .then(lang.hitch(this, function (operLayerInfos) {
              this.opLayers = operLayerInfos;
              this._updateLayerIDs();
              if (this.config.upgradeFields) {
                this._upgradeFields();
              }
              this._setLayers();
              this.setConfig(this.config);
            }));
        }
      },

      //added for backwards compatability
      //TODO need to move away from _layerInfos and _operLayers at 5.3
      _updateLayerIDs: function () {
        for (var i = 0; i < this.config.layerInfos.length; i++) {
          var configLayer = this.config.layerInfos[i];
          var jimuLayerInfo = this.opLayers.getLayerInfoById(configLayer.id);
          if (!jimuLayerInfo) {
            var updated = false;
            for (var ii = 0; ii < this.opLayers._layerInfos.length; ii++) {
              var _opLayer = this.opLayers._layerInfos[ii];
              var originOpLayer = _opLayer.originOperLayer;
              if ((_opLayer && _opLayer.subId && _opLayer.subId === configLayer.id) ||
                (originOpLayer && originOpLayer.itemId === configLayer.itemId)) {
                if (originOpLayer && originOpLayer.itemId === configLayer.itemId) {
                  if (originOpLayer.featureCollection && originOpLayer.featureCollection.layers &&
                    originOpLayer.featureCollection.layers.hasOwnProperty('length')) {
                    var id = originOpLayer.featureCollection.layers[0].id;
                    jimuLayerInfo = this.opLayers.getLayerInfoById(id);
                    if (jimuLayerInfo) {
                      this.config.layerInfos[i].id = id;
                      this.config.layerInfos[i].layer = id;
                      updated = true;
                    }
                  }
                }
              } else if (originOpLayer && originOpLayer.url && configLayer.url &&
                originOpLayer.url === configLayer.url) {
                jimuLayerInfo = this.opLayers.getLayerInfoById(originOpLayer.id);
                if (jimuLayerInfo) {
                  this.config.layerInfos[i].id = originOpLayer.id;
                  this.config.layerInfos[i].layer = originOpLayer.id;
                  updated = true;
                }
              }
            }
            if (!updated) {
              this.config.layerInfos.splice(i, 1);
            }
          }
        }
      },

      _setLayers: function () {
        var supportedLayerTypes = ["ArcGISFeatureLayer", "ArcGISMapServiceLayer", "CSV",
                                   "KML", "GeoRSS", "ArcGISStreamLayer", "Feature Layer"];
        this.gtQueries = [];
        this.gtQueryUrls = [];
        var options = [];
        //TODO we need to move away from the use of _layerInfos in 5.3
        for (var i = 0; i < this.opLayers._layerInfos.length; i++) {
          var supportsDL = true;
          var OpLyr = this.opLayers._layerInfos[i];
          var originOpLayer;
          if (OpLyr.originOperLayer) {
            originOpLayer = OpLyr.originOperLayer;
            var lyrType = originOpLayer.layerType;
            if (typeof (lyrType) === 'undefined') {
              if (OpLyr.layerObject) {
                lyrType = OpLyr.layerObject.type;
              }
            }
            if (supportedLayerTypes.indexOf(lyrType) === -1) {
              continue;
            }
          }

          var lyrInfo = this.opLayers.getLayerInfoById(OpLyr.id);
          if (!lyrInfo && OpLyr._subLayerInfoIndex) {
            var subKeys = Object.keys(OpLyr._subLayerInfoIndex);
            OpLyr = (subKeys.length && subKeys.length > 0) ? OpLyr._subLayerInfoIndex[subKeys[0]] : OpLyr;
            lyrInfo = this.opLayers.getLayerInfoById(OpLyr.id);
          }
          var infoTemplate = lyrInfo ? lyrInfo.getInfoTemplate() : OpLyr.getInfoTemplate();
          if (OpLyr.newSubLayers.length > 0) {
            var hasNested = this.checkNestedGroups(OpLyr.newSubLayers);
            if (!hasNested) {
              var subLayers = OpLyr.newSubLayers;
              var parentID;
              if (originOpLayer.type === "KML") {
                subLayers = originOpLayer.layerObject.getLayers();
                parentID = originOpLayer.id;
              }
              this._recurseOpLayers(subLayers, options, parentID);
            } else {
              continue;
            }
          } else if (OpLyr.featureCollection) {
            if (OpLyr.layers.length > 1) {
              this._recurseOpLayers(OpLyr.layers, options, undefined);
            }
          } else if (originOpLayer) {
            if (originOpLayer.featureCollection) {
              if (originOpLayer.featureCollection.layers.length > 1) {
                this._recurseOpLayers(originOpLayer.featureCollection.layers, options, undefined);
              } else {
                options.unshift({
                  label: OpLyr.title,
                  value: OpLyr.id,
                  url: undefined,
                  imageData: OpLyr.imageData,
                  id: OpLyr.id,
                  geometryType: originOpLayer.featureCollection.layers[0].layerObject.geometryType,
                  fields: originOpLayer.featureCollection.layers[0].layerObject.fields,
                  type: OpLyr.type,
                  renderer: originOpLayer.featureCollection.layers[0].layerObject.renderer,
                  itemId: originOpLayer.itemId,
                  infoTemplate: infoTemplate,
                  lyrType: "Feature Collection",
                  panelImageData: OpLyr.panelImageData,
                  supportsDynamic: supportsDL,
                  oidFieldName: originOpLayer.featureCollection.layers[0].layerObject.objectIdField
                });
              }
            } else {
              if (typeof (OpLyr.layerObject.geometryType) === 'undefined') {
                this.setGeometryType(OpLyr.layerObject);
              }

              if (OpLyr && OpLyr.resourceInfo) {
                supportsDL = OpLyr.resourceInfo.supportsDynamicLayers;
              }

              options.unshift({
                label: OpLyr.title,
                value: OpLyr.id,
                url: OpLyr.layerObject.url,
                imageData: OpLyr.imageData,
                id: OpLyr.id,
                type: OpLyr.type,
                renderer: OpLyr.layerObject.renderer,
                geometryType: OpLyr.layerObject.geometryType,
                fields: OpLyr.layerObject.fields,
                infoTemplate: infoTemplate,
                lyrType: "Map Service Layer",
                panelImageData: OpLyr.panelImageData,
                supportsDynamic: supportsDL,
                oidFieldName: OpLyr.layerObject.objectIdField
              });
            }
          } else {
            if (typeof (OpLyr.layerObject.geometryType) === 'undefined') {
              this.setGeometryType(OpLyr.layerObject);
            }

            if (OpLyr && OpLyr.resourceInfo) {
              supportsDL = OpLyr.resourceInfo.supportsDynamicLayers;
            }

            options.unshift({
              label: OpLyr.title,
              value: OpLyr.id,
              url: OpLyr.layerObject.url,
              imageData: OpLyr.imageData,
              id: OpLyr.id,
              type: OpLyr.type,
              renderer: OpLyr.layerObject.renderer,
              geometryType: OpLyr.layerObject.geometryType,
              fields: OpLyr.layerObject.fields,
              lyrType: "",
              infoTemplate: infoTemplate,
              panelImageData: OpLyr.panelImageData,
              supportsDynamic: supportsDL,
              oidFieldName: OpLyr.layerObject.objectIdField
            });
          }
        }

        //execute the setGeomType queries
        if (this.gtQueries.length > 0) {
          var queryList = new DeferredList(this.gtQueries);
          //disable add
          html.removeClass(this.btnAddLayer, "btn-add-section enable");
          html.addClass(this.btnAddLayer, "btn-add-section-disabled");
          queryList.then(lang.hitch(this, function (queryResults) {
            if (queryResults) {
              if (queryResults.length > 0) {
                for (var q = 0; q < queryResults.length; q++) {
                  var resultInfo = queryResults[q][1];
                  var url = this.gtQueryUrls[q];
                  var lIdx;
                  for (var i = 0; i < this.layer_options.length; i++) {
                    if (url === this.layer_options[i].url) {
                      lIdx = i;
                      break;
                    }
                  }
                  if (typeof (lIdx) !== 'undefined') {
                    this.layer_options[lIdx].geometryType = resultInfo.geometryType;
                    if (typeof (resultInfo.drawingInfo) !== 'undefined') {
                      this.layer_options[lIdx].renderer = resultInfo.drawingInfo.renderer;
                      this.layer_options[lIdx].drawingInfo = resultInfo.drawingInfo;
                      this.layer_options[lIdx].fields = resultInfo.fields;

                      var f;
                      for (var ii = 0; ii < resultInfo.fields.length; ii++) {
                        f = resultInfo.fields[ii];
                        if (f.type === "esriFieldTypeOID") {
                          break;
                        }
                      }
                      this.layer_options[lIdx].oidFieldName = f;
                    }
                  }
                }
                //enable add
                html.removeClass(this.btnAddLayer, "btn-add-section-disabled");
                html.addClass(this.btnAddLayer, "btn-add-section enable");
              }
            }
          }));
        }
        this.layer_options = lang.clone(options);
      },

      checkNestedGroups: function (group) {
        for (var i = 0; i < group.length; i++) {
          if (group[i].newSubLayers && group[i].newSubLayers.length > 0) {
            return true;
          }
        }
        return false;
      },

      setConfig: function (config) {
        this.config = config;

        if (!this.config.mapID || (this.config.mapID && this.config.mapID === this.map.itemId)) {
          this.oldConfig = !this.config.mapID;

          if (this.config.mainPanelText) {
            this.mainPanelText.set('value', this.config.mainPanelText);
          }
          if (this.config.mainPanelIcon) {
            this.panelMainIcon.innerHTML = this.config.mainPanelIcon;
          }

          if (this.config.refreshInterval) {
            this.refreshInterval.set('value', this.config.refreshInterval);
          }

          if (this.config.loadStaticData) {
            this.chkStatic.set('value', this.config.loadStaticData);
          }

          if (this.config.countEnabled) {
            this.panelCountOptions.set('checked', this.config.countEnabled);
          }

          if (typeof (this.config.hidePanel) !== 'undefined') {
            this.hidePanel = this.config.hidePanel;
          } else {
            this.hidePanel = false;
          }
          this.hidePanelOptions.set('checked', this.hidePanel);
          this.panelCountOptions.set('disabled', this.hidePanel);
          this.panelIconOptions.set('disabled', this.hidePanel);
          this.expandListOptions.set('disabled', this.hidePanel);
          this.showAllFeaturesOptions.set('disabled', this.hidePanel);

          if (this.hidePanel) {
            html.addClass(this.panelIconOptionsLabel, 'text-disabled');
            html.addClass(this.panelCountOptionsLabel, 'text-disabled');
            html.addClass(this.expandListOptionsLabel, 'text-disabled');
            html.addClass(this.showAllFeaturesOptionsLabel, 'text-disabled');
            if (domClass.contains(this.hidePanelHelpText, 'help-off')) {
              html.removeClass(this.hidePanelHelpText, 'help-off');
            }
            html.addClass(this.hidePanelHelpText, 'help-on');
          } else {
            html.removeClass(this.panelIconOptionsLabel, 'text-disabled');
            html.removeClass(this.panelCountOptionsLabel, 'text-disabled');
            html.removeClass(this.expandListOptionsLabel, 'text-disabled');
            html.removeClass(this.showAllFeaturesOptionsLabel, 'text-disabled');
            if (domClass.contains(this.hidePanelHelpText, 'help-on')) {
              html.removeClass(this.hidePanelHelpText, 'help-on');
            }
            html.addClass(this.hidePanelHelpText, 'help-off');
          }

          if (this.config.displayPanelIcon) {
            this.panelIconOptions.set('checked', this.config.displayPanelIcon);
          }
          if (this.config.expandList) {
            this.expandListOptions.set('checked', this.config.expandList);
          }

          var showAllFeatures = typeof (this.config.showAllFeatures) === 'undefined' ?
            false : this.config.showAllFeatures;
          this.showAllFeaturesOptions.set('checked', showAllFeatures);

          this.displayLayerTable.clear();
          this.isInitalLoad = true;
          for (var i = 0; i < this.config.layerInfos.length; i++) {
            var lyrInfo = this.config.layerInfos[i];
            this._populateLayerRow(lyrInfo, i);
          }
          this._updateLayerLists();
          var rows = this.displayLayerTable.getRows();
          for (var r = 0; r < rows.length; r++) {
            this._updateLayerListRows(true, rows[r]);
            this._updateRefresh(rows[r]);
          }
          if (this.displayLayerTable.getRows().length < this.layer_options.length) {
            html.removeClass(this.btnAddLayer, "btn-add-section-disabled");
            html.addClass(this.btnAddLayer, "btn-add-section enable");
          } else {
            html.addClass(this.btnAddLayer, "btn-add-section-disabled");
            html.removeClass(this.btnAddLayer, "btn-add-section enable");
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
              var lyrInfo = this.opLayers.getLayerInfoById(li.id);
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
                      oidFieldName = f.type === "esriFieldTypeOID" ? f.name : undefined;
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

      _updateStyleColor: function (changedData) {
        var tName = this.appConfig.theme.name;
        var sName = changedData;
        var appId = this.appConfig.appId;
        if (appId === "") {
          appId = window.location.href.split('id=')[1];
        }
        var url = "./apps/" + appId + "/themes/" + tName + "/manifest.json";
        xhr.get({
          url: url,
          sync: true,
          handleAs: "json",
          load: lang.hitch(this, function (data) {
            var styles = data.styles;
            for (var i = 0; i < styles.length; i++) {
              var st = styles[i];
              if (st.name === sName) {
                this._styleColor = st.styleColor;
                this._styleColorName = st.name;
                break;
              }
            }
          })
        });
      },

      updateThemeClusterSymbol: function (lyrInfo, i) {
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
            color: [rr, gg, bb, 128],
            outline: {
              color: [0, 0, 0, 255],
              width: 0,
              type: "esriSLS",
              style: "esriSLSSolid"
            },
            type: "esriSFS",
            style: "esriSFSSolid"
          };

          lyrInfo.symbolData = sd;
        }
        return lyrInfo;
      },

      _rowDeleted: function(){
        this._updateLayerLists();
        this._updateLayerListRows(true);

        if (this.displayLayerTable.getRows().length < this.layer_options.length) {
          html.removeClass(this.btnAddLayer, "btn-add-section-disabled");
          html.addClass(this.btnAddLayer, "btn-add-section enable");
        }
      },

      _addLayerRow: function () {
        this.isInitalLoad = false;
        if (this.displayLayerTable.getRows().length >= this.layer_options.length) {
          return;
        }
        var result = this.displayLayerTable.addRow({});
        if (result.success && result.tr) {
          var tr = result.tr;
          html.addClass(tr.cells[2], "displayOptions");
          this._addLayersOption(tr);
          this._addLabelOption(tr);
          this._addRefreshOption(tr);
          this._addDefaultSymbol(tr);
        }
        this._updateLayerLists();
        this._updateLayerListRows(false);
        if (this.displayLayerTable.getRows().length >= this.layer_options.length) {
          html.removeClass(this.btnAddLayer, "btn-add-section enable");
          html.addClass(this.btnAddLayer, "btn-add-section-disabled");
          return;
        }
      },

      _populateLayerRow: function (lyrInfo, i) {
        var result = this.displayLayerTable.addRow({});
        if (result.success && result.tr) {
          var tr = result.tr;
          html.addClass(tr.cells[2], "displayOptions");
          this._addLayersOption(tr);
          this._addLabelOption(tr);
          this._addRefreshOption(tr);
          tr.selectLayers.set("value", lyrInfo.id, !this.isInitalLoad);
          tr.labelText.set("value", lyrInfo.label);
          tr.refreshBox.set("checked", lyrInfo.refresh);
          tr.imageData = lyrInfo.panelImageData;

          domConstruct.create("div", {
            'class': "imageDataGFX margin2",
            innerHTML: [lyrInfo.imageData],
            title: this.nls.iconColumnText
          }, tr.cells[2]);

          if (lyrInfo.symbolData.clusterType === 'ThemeCluster') {
            lyrInfo = this.updateThemeClusterSymbol(lyrInfo, i);
          }

          var cLo = this._getLayerOptionByValue(lyrInfo.id);
          cLo.filter = lyrInfo.filter;
          cLo.imageData = lyrInfo.imageData;
          cLo.symbolData = lyrInfo.symbolData;
          tr.symbolData = lyrInfo.symbolData;
          this._updateLayerLists();
          this.validateFields(tr.symbolData, tr);
        }
      },

      _addLayersOption: function (tr) {
        var lyrOptions;
        if (this.used_layers.length > 0) {
          var temp_options = [];
          for (var i = 0; i < this.layer_options.length; i++) {
            var lo = this.layer_options[i];
            if (this.used_layers.indexOf(lo.value) === -1) {
              temp_options.push(lo);
            }
          }
          lyrOptions = lang.clone(temp_options);
        } else {
          lyrOptions = lang.clone(this.layer_options);
        }
        var td = query('.simple-table-cell', tr)[0];
        if (td) {
          html.setStyle(td, "verticalAlign", "middle");
          html.setStyle(td, "line-height", "inherit");
          var tabLayers = new Select({
            style: {
              width: "100%",
              height: "28px"
            },
            "class": "longSelect",
            options: lyrOptions
          });
          tabLayers.placeAt(td);
          tabLayers.startup();
          tr.selectLayers = tabLayers;
          this.own(on(tabLayers, 'change', lang.hitch(this, function () {
            this._updateRefresh(tr);
            this._updateLayerLists();
            this._updateLayerListRows(true, tr);
            this._addDefaultSymbol(tr);
            tr.labelText.set('value', "");
          })));
        }
      },

      _updateLayerListRows: function (rowDeleted, tr) {
        var s;
        if (typeof (tr) !== 'undefined') {
          s = lang.clone(tr.selectLayers.value);
        }
        var addOptions = [];
        if (rowDeleted) {
          var lyrOptions = lang.clone(this.layer_options);
          for (var j = 0; j < lyrOptions.length; j++) {
            var lo = lyrOptions[j];
            if (this.used_layers.indexOf(lo.value) === -1) {
              addOptions.push(lo);
            }
          }
        }

        var rows = this.displayLayerTable.getRows();
        for (var i = 0; i < rows.length; i++) {
          var row = rows[i];
          var value = row.selectLayers.value;
          for (var ii = 0; ii < this.used_layers.length; ii++) {
            var usedValue = this.used_layers[ii];
            if (usedValue !== value) {
              row.selectLayers.removeOption(usedValue);
            }
          }
          if (addOptions.length > 0) {
            option_loop:
            for (var k = 0; k < addOptions.length; k++) {
              var curOption = addOptions[k];
              var add = true;
              cur_option_loop:
              for (var m = 0; m < row.selectLayers.options.length; m++) {
                var option = row.selectLayers.options[m];
                if (curOption.value === option.value) {
                  add = false;
                  break cur_option_loop;
                }
              }
              if (add) {
                row.selectLayers.addOption(addOptions[k]);
              }
            }
          }
        }
        if (typeof (tr) !== 'undefined') {
          tr.selectLayers.set("value", s, !this.isInitalLoad);
        }
      },

      _updateLayerLists: function () {
        this.used_layers = [];
        var rows = this.displayLayerTable.getRows();
        for (var i = 0; i < rows.length; i++) {
          var row = rows[i];
          var value = row.selectLayers.value;
          this.used_layers.push(value);
        }
      },

      _addLabelOption: function (tr) {
        var td = query('.simple-table-cell', tr)[1];
        html.setStyle(td, "verticalAlign", "middle");
        html.setStyle(td, "line-height", "inherit");
        var labelTextBox = new ValidationTextBox({
          style: {
            width: "100%",
            height: "28px"
          }
        });
        labelTextBox.placeAt(td);
        labelTextBox.startup();
        tr.labelText = labelTextBox;
      },

      _addRefreshOption: function (tr) {
        var td = query('.simple-table-cell', tr)[3];
        html.setStyle(td, "verticalAlign", "middle");
        html.setStyle(td, "line-height", "inherit");
        this.currentTR = tr;
        var refreshCheckBox = new CheckBox({
          "class": "checkBox",
          onChange: lang.hitch(this, function (v) {
            var value = this.currentTR.selectLayers.value;
            var rO;
            if (v) {
              this.refreshLayers.push(value);
              rO = query('.refreshOff', this.refreshOptions.domNode)[0];
              if (rO) {
                html.removeClass(rO, 'refreshOff');
                html.addClass(rO, 'refreshOn');
              }
              if (!this.refreshInterval.isValid()) {
                this._disableOk();
              }
            } else {
              var i = this.refreshLayers.indexOf(value);
              if (i > -1) {
                this.refreshLayers.splice(i, 1);
                if (this.refreshLayers.length === 0) {
                  rO = query('.refreshOn', this.refreshOptions.domNode)[0];
                  if (rO) {
                    html.removeClass(rO, 'refreshOn');
                    html.addClass(rO, 'refreshOff');
                  }
                  this._enableOk();
                }
              }
            }
          })
        });

        this._updateRefresh(tr, refreshCheckBox);

        refreshCheckBox.placeAt(td);
        refreshCheckBox.startup();
        tr.refreshBox = refreshCheckBox;
      },

      _updateRefresh: function (tr, refreshCheckBox) {
        var lInfo = this._getLayerOptionByValue(tr.selectLayers.value);

        if (!refreshCheckBox) {
          refreshCheckBox = tr.refreshBox;
        }

        if (lInfo.lyrType === 'Feature Collection' && typeof (lInfo.itemId) !== 'undefined') {
          refreshCheckBox.set('disabled', false);
          refreshCheckBox.set('title', this.nls.enableRefresh);
        } else {
          refreshCheckBox.set('disabled', true);
          refreshCheckBox.set('title', this.nls.disableRefresh);
        }
      },

      _updateOK: function () {
        if (this.refreshInterval.isValid()) {
          this._enableOk();
        } else {
          this._disableOk();
        }
      },

      _disableOk: function () {
        var s = query(".button-container")[0];
        var s2 = s.children[2];
        var s3 = s.children[3];
        domStyle.set(s2, "display", "none");
        domStyle.set(s3, "display", "inline-block");
      },

      _enableOk: function () {
        var s = query(".button-container")[0];
        var s2 = s.children[2];
        var s3 = s.children[3];
        domStyle.set(s2, "display", "inline-block");
        domStyle.set(s3, "display", "none");
      },

      _addDefaultSymbol: function (tr) {
        var td = query('.simple-table-cell', tr)[0];
        this.curRow = tr;
        if (td) {
          html.setStyle(td, "line-height", "inherit");
          html.setStyle(td, "margin-left", "0px");
          var lo = this._getLayerOptionByValue(tr.selectLayers.value);
          var selectLayersValue = tr.selectLayers.value;

          var hasSymbolData = false;
          var sd;
          if (typeof (this.curRow.symbolData) !== 'undefined') {
            sd = this.curRow.symbolData;
            hasSymbolData = sd.userDefinedSymbol && (sd.layerId === selectLayersValue);
          }
          var a;
          var s;
          if (!hasSymbolData || typeof (lo.symbolData) === 'undefined') {
            var options = {
              nls: this.nls,
              callerRow: tr,
              layerInfo: lo,
              value: selectLayersValue,
              symbolInfo: hasSymbolData ? this.curRow.symbolData : lo.symbolData,
              map: this.map,
              ac: this.appConfig,
              hidePanel: this.hidePanel
            };
            var sourceDijit = new SymbolPicker(options);
            sourceDijit._setSymbol();
            s = query(".imageDataGFX", this.curRow.cells[2])[0];
            if (s) {
              this.curRow.cells[2].removeChild(s);
            }
            this.curRow.symbolData = sourceDijit.symbolInfo;
            this.validateFields(this.curRow.symbolData, this.curRow);
            a = domConstruct.create("div", { 'class': "imageDataGFX margin2" }, this.curRow.cells[2]);
            if (this.curRow.symbolData.svg !== null &&
              typeof (this.curRow.symbolData.svg) !== 'undefined') {
              a.appendChild(this.curRow.symbolData.svg);
            }
            this.curRow.imageData = this.curRow.symbolData.panelHTML;
            this.curRow = null;
            sourceDijit.destroy();
            sourceDijit = null;
          } else {
            s = query(".imageDataGFX", this.curRow.cells[2])[0];
            if (s) {
              this.curRow.cells[2].removeChild(s);
            }
            this.curRow.symbolData = lo.symbolData;
            this.validateFields(this.curRow.symbolData, this.curRow);
            a = domConstruct.create("div", { 'class': "imageDataGFX margin2" }, this.curRow.cells[2]);
            a.appendChild(this.curRow.symbolData.svg);
            this.curRow.imageData = this.curRow.symbolData.panelHTML;
          }
        }
      },

      _getLayerOptionByValue: function (value) {
        for (var i = 0; i < this.layer_options.length; i++) {
          var lo = this.layer_options[i];
          if (lo.id === value) {
            return lo;
          }
        }
      },

      _recurseOpLayers: function (pNode, pOptions, parentID) {
        var nodeGrp = pNode;
        array.forEach(nodeGrp, lang.hitch(this, function (Node) {
          var lyrInfo = this.opLayers.getLayerInfoById(Node.id);
          var infoTemplate = lyrInfo ? lyrInfo.getInfoTemplate() : Node.getInfoTemplate();
          if (Node.getImages) {
            return;
          }
          if (Node.newSubLayers && Node.newSubLayers.length > 0) {
            this._recurseOpLayers(Node.newSubLayers, pOptions, undefined);
          } else if (Node.featureCollection) {
            if (Node.layers.length > 1) {
              this._recurseOpLayers(Node.layers, pOptions, undefined);
            }
          } else {
            if (typeof (Node.layerObject) !== 'undefined') {
              if (typeof (Node.layerObject.geometryType) === 'undefined') {
                this.setGeometryType(Node.layerObject);
              }
            }
            var OpLyr2;
            if (Node.hasOwnProperty("parentLayerInfo")) {
              if (Node.parentLayerInfo.hasOwnProperty("originOperLayer")) {
                OpLyr2 = Node.parentLayerInfo.originOperLayer;
              }
            }

            var u;
            var subLayerId;
            if (Node.layerObject) {
              if (Node.layerObject.url) {
                u = Node.layerObject.url;
                subLayerId = parseInt(u.substr(u.lastIndexOf('/') + 1), 10);
              }
            }

            var supportsDL = true;
            if(OpLyr2 && OpLyr2.resourceInfo){
              supportsDL = OpLyr2.resourceInfo.supportsDynamicLayers;
            }
            pOptions.push({
              label: Node.title ? Node.title : Node.id,
              value: Node.id,
              url: u,
              imageData: Node.imageData,
              id: Node.id,
              parentLayerID: OpLyr2 ? OpLyr2.id : parentID,
              type: Node.type,
              itemId: OpLyr2 ? OpLyr2.itemId : undefined,
              renderer: Node.layerObject ? Node.layerObject.renderer : Node.renderer,
              geometryType: Node.layerObject ? Node.layerObject.geometryType : Node.geometryType,
              fields: Node.layerObject ? Node.layerObject.fields : Node.fields,
              subLayerId: subLayerId,
              infoTemplate: infoTemplate,
              lyrType: OpLyr2 ? OpLyr2.type || OpLyr2.layerType : undefined,
              supportsDynamic: supportsDL,
              oidFieldName: Node.layerObject ? Node.layerObject.objectIdField : undefined
            });
          }
        }));
      },

      validateFields: function (symbolData, tr) {
        var isValid;
        if (symbolData && symbolData.featureDisplayOptions && symbolData.featureDisplayOptions.fields) {
          isValid = symbolData.featureDisplayOptions.fields.length > 0;
        } else {
          isValid = false;
        }
        var td = query('.simple-table-cell', tr)[4];
        if (td && !isValid) {
          if (!tr.errorDiv) {
            tr.errorDiv = domConstruct.create("div", {
              'class': "field-error"
            }, td);
            tr.errorSpan = domConstruct.create("span", {
              'class': "jimu-icon jimu-icon-error",
              title: this.nls.fieldsWarning
            }, tr.errorDiv);
          } else {
            domStyle.set(tr.errorSpan, 'display', 'inline-block');
          }
        } else if (isValid && tr.errorSpan) {
          domStyle.set(tr.errorSpan, 'display', 'none');
        }
      },

      _pickSymbol: function (tr) {
        var selectLayersValue = tr.selectLayers.value;
        var lo = this._getLayerOptionByValue(selectLayersValue);
        this.curRow = tr;

        var options = {
          nls: this.nls,
          callerRow: tr,
          layerInfo: lo,
          value: selectLayersValue,
          symbolInfo: typeof (this.curRow.symbolData) !== 'undefined' ? this.curRow.symbolData : lo.symbolData,
          map: this.map,
          ac: this.appConfig,
          hidePanel: this.hidePanel
        };
        var sourceDijit = new SymbolPicker(options);

        var popup = new Popup({
          width: 420,
          autoHeight: true,
          content: sourceDijit,
          titleLabel: this.nls.sympolPopupTitle
        });

        this.own(on(sourceDijit, 'ok', lang.hitch(this, function (data) {
          var s = query(".imageDataGFX", this.curRow.cells[2])[0];
          if (s) {
            this.curRow.cells[2].removeChild(s);
          }
          this.curRow.symbolData = data;
          this.validateFields(this.curRow.symbolData, this.curRow);
          var a = domConstruct.create("div", { 'class': "imageDataGFX margin2" }, this.curRow.cells[2]);
          a.appendChild(data.svg);
          this.curRow.imageData = data.panelHTML;
          this.curRow = null;
          sourceDijit.destroy();
          sourceDijit = null;
          popup.close();
        })));

        this.own(on(sourceDijit, 'cancel', lang.hitch(this, function () {
          this.curRow = null;
          sourceDijit.destroy();
          sourceDijit = null;
          popup.close();
        })));
      },

      setGeometryType: function (OpLayer) {
        if (typeof (OpLayer.url) !== 'undefined') {
          if (OpLayer.url.indexOf("MapServer") > -1) {
            this.gtQueries.push(esriRequest({ "url": OpLayer.url + "?f=json" }));
            this.gtQueryUrls.push(OpLayer.url);
          }
        }
      },

      uploadImage: function (i) {
        this.panelMainIcon.innerHTML = "";
        this.mpi = i;
        domConstruct.create("div", {
          "class" : "innerMainPanelIcon",
          style: 'background-image: url(' + i + ');',
          title: this.nls.mainPanelIcon
        }, this.panelMainIcon);
      },

      getConfig: function () {
        dijitPopup.close();

        var rows = this.displayLayerTable.getRows();
        var table = [];
        var lInfo;
        array.forEach(rows, lang.hitch(this, function (tr) {
          var selectLayersValue = tr.selectLayers.value;

          var labelTextValue = utils.stripHTML(tr.labelText.value);
          var refreshBox = tr.refreshBox;
          var lo = this._getLayerOptionByValue(selectLayersValue);
          var symbolData = tr.symbolData ? tr.symbolData : lo.symbolData;

          lInfo = {
            layer: selectLayersValue,
            label: labelTextValue !== "" ? labelTextValue : lo.label,
            refresh: refreshBox.checked,
            url: lo.url,
            type: lo.type,
            id: lo.id,
            symbolData: symbolData,
            geometryType: lo.geometryType,
            itemId: lo.itemId,
            parentLayerID: lo.parentLayerID,
            renderer: lo.renderer,
            drawingInfo: lo.drawingInfo,
            fields: lo.fields,
            oidFieldName: lo.oidFieldName,
            subLayerId: lo.subLayerId,
            infoTemplate: lo.infoTemplate
          };

          if (tr.imageData) {
            lInfo.panelImageData = tr.imageData;
          }

          var td = query('.imageDataGFX', tr)[0];
          lInfo.imageData = typeof (td) !== 'undefined' ? td.innerHTML : "<div></div>";
          table.push(lInfo);
        }));

        this.config.mapID = this.map.itemId;

        this.config.layerInfos = table;
        this.config.mainPanelText = utils.stripHTML(this.mainPanelText.value);
        this.config.mainPanelIcon = this.panelMainIcon.innerHTML;
        this.config.refreshInterval = utils.stripHTML(this.refreshInterval.value);
        this.config.refreshEnabled = this.refreshLayers.length > 0 ? true : false;
        this.config.countEnabled = this.countEnabled;
        this.config.displayPanelIcon = this.displayPanelIcon;
        this.config.hidePanel = this.hidePanel;
        this.config.continuousRefreshEnabled = this.hidePanel;
        this.config.expandList = this.expandListOptions.checked;
        this.config.showAllFeatures = this.showAllFeaturesOptions.checked;
        this.config.upgradeFields = false;

        return this.config;
      },

      destroy: function () {
        dijitPopup.close();
        this.inherited(arguments);
      }
    });
  });
