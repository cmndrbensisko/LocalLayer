LocalLayerWidget 1.1
==

The LocalLayer Widget for ArcGIS Web AppBuilder is intended to allow the direct addition of ArcGIS for Server Mapservices to an ArcGIS Web AppBuilder application, without needing to wrap the desired services in an ArcGIS Online/Portal Web Map.  The Legend, LayerList, and AttributeTable widgets should continue to work with your local layers.

Under the Settings option in the Builder, add a JSON array containing the names and URLs of the MapServices that you want included in your Application.  

```javascript
Example:
	[
		{
			"type": "Dynamic"
			"name": "Parks",
			"url":"http://<servername>/arcgis/rest/services/Parks/MapServer"
		},{
			"type": "Dynamic"
			"name": "Public Libraries",
			"url": "http://<servername>/arcgis/rest/services/Libraries/MapServer"
		}
	]
```

The LocalLayer Widget currently allows you to add three types of layers to your application: Dynamic Layers, Feature Layers, and Basemap Layers.  

###Dynamic Layers

Dynamic Layers typically point to the /MapServer root of a Map Service REST Endpoint, and will display all sublayers contained in that service in a single layer on your map.  Click-To-Identify functionality is supported through the HTML-formatted syntax detailed in https://developers.arcgis.com/javascript/jssamples/map_twodynamic.html.  Note that you need to specify the LayerId of the sublayer that you want popups to display for, in addition to HTML-formatted Title and Content for the popup window.  In the example below, two sublayers of the Public Libraries service will result in popups when its features are clicked, while the Parks layer will not.

```javascript
Example:
...
	{
		"type": "Dynamic",
		"name": "Parks",
		"url": "http://<servername>/arcgis/rest/services/Parks/MapServer"
	},{
		"type": "Dynamic",
		"name": "Public Libraries",
		"url": "http://<servername>/arcgis/rest/services/Libraries/MapServer",
		"popup": {
			"infoTemplates":[
				{
				"layerId": 0,
				"title": "<b>Large Libraries</b>",
				"content": "Staff Count: ${STAFFNUM}"
				},
				{
				"layerId": 1,
				"title": "<b>Small Libraries</b>",
				"content": "Book Count: ${BOOKNUM}"
				}
			]
		}
	}
...
```

###Feature Layers
Feature Layers point at single sublayer of one of your MapServer, and will only display the contents of this one sublayer in a single layer on your map.  Click-To-Identify functionality is supported through fully defining a PopupTemplate object in your configuration file for the layer, following the format detailed in https://developers.arcgis.com/javascript/jshelp/intro_popuptemplate.html.  When features of sublayer 0 of the EmergencyServices Map Service are clicked, the configuration below will show a popup containing the text "Fire Hall Number" and the number of the selected firehall as it's title, and the content of the popup will show the value of the TRUCK_TYPE field of the selected object.

```javascript
Example:
...
	{
		"type": "Feature",
		"name": "Fire Halls",
		"url": "http://<servername>/ArcGIS/rest/services/EmergencyServices/MapServer/0",
		"popup": {
				"title": "Fire Hall Number {HALLNUM}",
				"fieldInfos": [
					{
						"fieldName": "TRUCK_TYPE",
						"visible": true,
						"label": "Type"
					}
	            ],
	            "showAttachments": true
		}
	}
...
```

###Basemap Layers

Basemap Layers are MapServices consisting of cached map tiles.  Layers added as basemaps will not appear in the Legend, LayerList, or AttributeTable Widgets, as they are purely intended for reference only.  On launch, the widget will override the AGOL/Portal Basemap of your application.  If you want to provide multiple basemaps for your users to choose from, it is suggested that you still define one Basemap Layer in the LocalLayerWidget configuration file, and then configure the BasemapGallery widget to allow for toggling between multiple basemap layers.  Click-To-Identify functionality is not currently supported on Basemap Layers.

```javascript
Example:
...
	{
		"type": "Basemap",
		"name": "2008 Aerial Imagery",
		"url": "http://<servername>/ArcGIS/rest/services/Basemap_Imagery/MapServer"
	}
...
```

###Setting up the Widget

When you've created the JSON array for your application, you can paste it into the "Layer JSON" input field of the Widget's configuration window, available through the Widgets tab of the ArcGIS Web AppBuilder page.  Also in this menu, you can specify proxy settings if necessary by checking the "Use Proxy?" box, and specify 1) The domain name for which the proxy should be applied (ie. your servername in the example above), and 2) The URL of the proxy.ashx page itself.

Please note that this is not an in-panel widget.  To add it to your ArcGIS Web AppBuilder, add the widget to your \client\stemapp\widgets directory, and add a reference to the widget in the standard default2Dapp configuration located at \client\builder\predefined-apps\default2DApp\config.json, under the widgetOnScreen section.

Example:
```javascript
	"widgetOnScreen": {
		"widgets": [
			{
				"uri": "widgets/LocalLayerWidget/Widget"
      		},
      	...
      	]
	}
```

IMPORTANT: A minor change will need to be made to your \client\stemapp\jimu.js\LayerInfos\LayerInfoForMapService.js file to make this tool operational.  Line 433 should be changed from:
```
var url = this.originOperLayer.url + '/' + subId;
```

To:
```
var url = this.originOperLayer.layerObject.url + '/' + subId;
```