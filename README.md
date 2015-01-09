LocalLayerWidget 1.0
==

The LocalLayer Widget for ArcGIS Web AppBuilder is intended to allow the direct addition of ArcGIS for Server Mapservices to an ArcGIS Web AppBuilder application, without needing to wrap the desired services in an ArcGIS Online/Portal Web Map.  Currently, the basemap will still need to be provided by AGOL/Portal.

Under the Settings option in the Builder, add a JSON array containing the names and URLs of the MapServices that you want included in your Application.  

Example:
	[
		{
			"name": "Parks",
			"url":"http://<servername>/arcgis/rest/services/Parks/MapServer"
		},{
			"name": "Public Libraries",
			"url": "http://<servername>/arcgis/rest/services/Libraries/MapServer"
		}
	]

Specify proxy settings if necessary by checking the "Use Proxy?" box, and specify 1) The domain name for which the proxy should be applied (ie. your servername in the example above), and 2) The URL of the proxy.ashx page itself.

Please note that this is not an in-panel widget.  To add it to your ArcGIS Web AppBuilder, add the widget to your \client\stemapp\widgets directory, and add a reference to the widget in the standard default2Dapp configuration located at \client\builder\predefined-apps\default2DApp\config.json, under the widgetOnScreen section.

Example:
	"widgetOnScreen": {
		"widgets": [
			{
				"uri": "widgets/LocalLayerWidget/Widget"
      		},
      	...
      	]
	}