///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
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
    'dojo/_base/declare',
    'jimu/BaseWidgetSetting',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/on',
    'dojo/_base/lang'
  ],
  function(
    declare,
    BaseWidgetSetting,
    _WidgetsInTemplateMixin,
    on,
    lang) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {

      baseClass: 'jimu-widget-legend-setting',

      startup: function() {
        this.inherited(arguments);
        this.setConfig(this.config);
        on(this.useProxy, "click", lang.hitch(this, '_onClick'))
      },

      setConfig: function(config) {
        this.config = config;
        dojo.query(this.layerJson).text(JSON.stringify(config.LocalLayerWidget.layerJson));
      },

      getConfig: function() {
        this.config.LocalLayerWidget.layerJson = JSON.parse(this.layerJson.value);
        this.config.LocalLayerWidget.useProxy = this.useProxy.checked;
        this.config.LocalLayerWidget.proxyPrefix = this.proxyPrefix.value;
        this.config.LocalLayerWidget.proxyAddress = this.proxyAddress.value;
        return this.config;
      },

      _onClick: function() {
        if (this.useProxy.checked){
          this.proxyPrefix.readOnly = false;
          this.proxyAddress.readOnly = false;
        }else{
          this.proxyPrefix.value = ""
          this.proxyAddress.value = ""
          this.proxyPrefix.readOnly = true;
          this.proxyAddress.readOnly = true;
        }
      }
    });
  });