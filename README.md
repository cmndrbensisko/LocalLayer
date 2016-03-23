LocalLayerWidget 1.3
==

The LocalLayer Widget for ArcGIS Web AppBuilder is intended to allow the direct addition of ArcGIS for Server MapServices to an ArcGIS Web AppBuilder application, without needing to wrap the desired services in an ArcGIS Online/Portal Web Map.  The Legend, LayerList, and AttributeTable widgets should continue to work with your Local Layers.

:bulb: In addition to the setup steps below, Rebecca Strauch generously provides and updates a living document of Tips and Tricks for implementing and using this widget.  Please find it on her GeoNet blog located [here](https://geonet.esri.com/blogs/myAlaskaGIS/2015/02/04/tips-for-using-the-custom-locallayer-widget-with-wab-dev-edition).

###Setting up the Widget

:bulb: Please note that this is not an in-panel widget.

WebAppBuilder 1.3 Steps:

To add this widget to your ArcGIS Web AppBuilder 1.2 environment, add the widget to your \client\stemapp\widgets directory, and add a reference to the widget in the standard Default configuration located at \client\stemapp\predefined-apps\default\config.json, under the widgetOnScreen section.

If you plan to use the Local Layer widget with the other predefined apps like basic_viewer, editor, or simple_map_viewer then just repeat the above step in those folders.

```javascript
Example:
	"widgetOnScreen": {
		"widgets": [
			{
				"uri": "widgets/LocalLayer/Widget",
				"visible": false
      		},
      	...
      	]
	}
```

:bulb: "visible":false will render the widget 'off' by default when building your applications, unless you wish to override the default WAB functionality and import your own layers directly from an ArcGIS Server instance.

:bulb: Also, please note that the "/LocalLayer/" portion of the uri path above must match the folder name in which the widget resides on your local deployment.  If you're downloading the widget from github, you'll likely want to rename the folder from "LocalLayer-master" to simply "LocalLayer"

:exclamation::exclamation: IMPORTANT: The changes that need to be made for WAB 1.3 to make this tool operational have changed. For new apps you only need to make this one change in the \client\stemapp\jimu.js\LayerInfos\LayerInfos.js. For existing/upgraded apps you only need to make this one change in the \server\apps\[App Number]\jimu.js\LayerInfos\LayerInfos.js 
Change Line 439 from:
```
if (layer.url) {
```

To:
```
if (layer.url && !layer.noservicename) {
```

Important version 1.3 Changes:

In version 1.3 of the Web App Builder, two changes should be made to core application files to ensure better performance

1) In \client\stemapp\widgets\AttributeTable\setting\Setting.js, change line 375 from
```
utils.readConfigLayerInfosFromMap(this.map, true, true)
```
to
```
utils.readConfigLayerInfosFromMap(this.map, false, true)
```
Changing that first 'true' to a 'false' will tell the menu to read all layers from the map as normal, instead of just ArcGIS Online layers.  Changing the second 'true' to a 'false' will let the Attribute Table include MapNotes layers from AGOL WebMaps.

2) In \client\stemapp\jimu.js\LayerInfos\LayerInfoForMapService.js file, you should see a function called _bindEvent.  Change it to match the code below (added portions bolded);

```
_bindEvent: function() {
  this.inherited(arguments);
  if(this.layerObject && !this.layerObject.empty **&& !this.layerObject.connected**) {
    this.layerObject.on('visible-layers-change',
                        lang.hitch(this, this._onVisibleLayersChanged));
    **this.layerObject.connected = true;**
  }
},
```

Basically, this will prevent multiple event handlers from being attached to the same layer.  My hunch is that something was causing a huge number of event handlers to be attached to each layer, exponential to the number of MapServices within the app.  Toggling the layer on and off in the LayerList would cause potentially hundreds of events to fire, when only one is necessary.

:bulb: The default theme in WAB is the Foldable Theme so adding the Local Layer widget to the any of the other themes involves another step.

```
Example:
    "widgetOnScreen": {
        "widgets": [
            {
                "uri": "widgets/LocalLayer/Widget",
                "visible": false
            },
        ...
        ]
    }
```

1. open the client\stemapp\themes\[theme name]\layouts\default\config.json in a text editor and add the code block above. This will take care of adding the Local Layer widget to default

:bulb: If you would like labels to display on your Feature Services by default, make sure to add "showLabels":true under the mapOptions setting of your config.json file located under \client\stemapp\ (or at the root of your current app), in addition to checking the "Show Labels?" checkbox under the Feature Layer Settings Menu.  Please note that there is currently an ESRI API bug preventing complex labelling expressions from being displayed on Feature Layers, such as expressions containing the CONCAT operator, and hopefully this will be addressed by esri in future releases.

```
Example:
    "map": {
        ...
        "mapOptions": {
            "showLabels":true,
            "extent": {
              ...
            }
        }
    }
```

Note that this change is necessary for the custom label rendering in the Add Feature Layer dialog to work.  For the "Custom Label Style" and "Custom Renderer" fields, paste the JSON output from [Esri's custom symbol generation app](http://developers.arcgis.com/javascript/samples/playground/main.html) application into these fields to create custom Feature Layer symbology and labels.  

For the "Custom Label Style", use the TextSymbol option in the Playground, and make sure to delete the default "Text" line provided by the playground app output.  This will be provided by the custom label expression you provide in the "Custom Label Expression" field.  Format this field according to the "labelExpressionInfo section of the [LabelClass info page](https://developers.arcgis.com/javascript/jsapi/labelclass-amd.html#labelexpressioninfo).