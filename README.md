LocalLayerWidget 1.2
==

The LocalLayer Widget for ArcGIS Web AppBuilder is intended to allow the direct addition of ArcGIS for Server Mapservices to an ArcGIS Web AppBuilder application, without needing to wrap the desired services in an ArcGIS Online/Portal Web Map.  The Legend, LayerList, and AttributeTable widgets should continue to work with your local layers.

###Setting up the Widget

Please note that this is not an in-panel widget.  To add it to your ArcGIS Web AppBuilder, add the widget to your \client\stemapp\widgets directory, and add a reference to the widget in the standard default2Dapp configuration located at \client\builder\predefined-apps\default2DApp\config.json, under the widgetOnScreen section.

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

:bulb: Also, please note that the "/LocalLayer/" portion of the uri path above must match the folder name in which the widget resides on your local deployment.

:exclamation: IMPORTANT: Two minor changes will need to be made to your \client\stemapp\jimu.js\LayerInfos\LayerInfoForMapService.js file to make this tool operational.  Line 433 should be changed from:
```
var url = this.originOperLayer.url + '/' + subId;
```

To:
```
var url = this.originOperLayer.layerObject.url + '/' + subId;
```

And line 406 should be changed from:

```
var url = this.originOperLayer.url + '/layers';
```

To:
```
var url = this.originOperLayer.layerObject.url + '/layers';
```
