// Popups will need to be manually specified for these layers in the LocalLayer Configuration file under /configs
// using a syntax similar to the following (https://developers.arcgis.com/javascript/3/jshelp/intro_popuptemplate.html):
//  "popup": {
//    "title": "{street}",
//    "fieldInfos": [
//        {
//          "fieldName": "comments",
//          "label": "comments",
//          "visible": true
//        },
//        {
//          "fieldName": "street",
//          "label": "street",
//          "visible": true
//        }
//      ],
//      "description": "{comments}",
//      "showAttachments": false,
//      "tr": null
//    }
//
define([
  'dojo/_base/declare',
  'dojo/Deferred'
], function(declare, Deferred) {
    return declare(null, {
	  runCustomTransformer:function(layer,config,moduleName){
		  var deferred = new Deferred()
		  require({
			"async": false
		  })
		  require(["widgets/LocalLayer/transformers/" + moduleName], function(customLayerModule){
			  var customLayer = customLayerModule()
			  customLayer.startup(layer, config).then(function(customLayer){
				  deferred.resolve(customLayer)
			  })
		  })
		  require({
			"async": true
		  })
		  return deferred
	  }
    })
})