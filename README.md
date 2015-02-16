LocalLayerWidget 1.5.1
==

The LocalLayer Widget for ArcGIS Web AppBuilder is intended to allow the direct addition of ArcGIS for Server Mapservices to an ArcGIS Web AppBuilder application, without needing to wrap the desired services in an ArcGIS Online/Portal Web Map.  The Legend, LayerList, and AttributeTable widgets should continue to work with your local layers.

:bulb: In addition to the setup steps below, Rebecca Strauch generously provides and updates a living document of Tips and Tricks for implementing and using this widget.  Please find it on her GeoNet blog located [here](https://geonet.esri.com/blogs/myAlaskaGIS/2015/02/04/tips-for-using-the-custom-locallayer-widget-with-wab-dev-edition).

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

:bulb: The default theme in WAB is the foldable theme so adding the Local Layer widget to the Tab theme involves another step.

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
1. open the client\stemapp\themes\TabTheme\layouts\default\config.json in a text editor and add the code block above. This will take care of adding the Local Layer widget to default

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