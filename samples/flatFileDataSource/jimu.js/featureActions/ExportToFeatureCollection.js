///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2016 Esri. All Rights Reserved.
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
  '../BaseFeatureAction',
  '../exportUtils'
], function(declare, BaseFeatureAction, exportUtils){
  var clazz = declare(BaseFeatureAction, {
    name: 'ExportToFeatureCollection',
    iconClass: 'icon-export',

    isFeatureSupported: function(featureSet){
      return featureSet.features.length > 0 && featureSet.features[0].geometry;
    },

    onExecute: function(featureSet){
      var ds = exportUtils.createDataSource({
        type: exportUtils.TYPE_FEATURESET,
        filename: 'features',
        data: featureSet
      });

      ds.setFormat(exportUtils.FORMAT_FEATURESET);
      ds.download();
    }

  });
  return clazz;
});