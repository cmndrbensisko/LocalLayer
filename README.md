LocalLayerWidget 2.2
==

Help keep the author caffeinated!  If you find the LocalLayer Widget useful, feel free to click the [tip jar](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=LLXK28GA2T3CG) to help support ongoing development.

[![paypal link](https://github.com/cmndrbensisko/LocalLayer/blob/master/images/jar.gif "thanks for your support!")](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=LLXK28GA2T3CG)
### About

The LocalLayer Widget for ArcGIS Web AppBuilder is intended to allow the direct addition of ArcGIS for Server Mapservices to an ArcGIS Web AppBuilder application, without needing to wrap the desired services in an ArcGIS Online/Portal Web Map.  The following layer types are currently supported:

    * Dynamic MapServices
    * FeatureService Layers
    * Tiled Layers
    * Basemap Layers
    * geoJson Layers
    * WebTile Layers
    * ImageService Layers
    * WMS Layers

FeatureServices can be edited via the Edit Widget, including Related Tables and Attachments.

### Setting up the LocalLayer Widget

To add this widget to your ArcGIS Web AppBuilder environment, copy the widget folder to your \client\stemapp\widgets directory, and add a reference to the widget in the standard Default App configuration located at \client\stemapp\predefined-apps\default\config.json, under the widgetOnScreen section.

```javascript
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

:bulb: "visible":false will render the widget 'off' by default when building your applications.  This gives you an option of whether or not you wish to override the default ArcGIS-Online-Map-based WAB functionality in favor of importing your own MapServices directly.

Please note that the "/LocalLayer/" portion of the uri path above must match the folder name of the widget on your local deployment, so if you're downloading the widget from github, you'll likely want to rename the folder from "LocalLayer-master" to simply "LocalLayer"

### Setting up the LocalLayer Widget for Other Themes:

Completing the steps above will only affect the default "Foldable Theme" for the WAB.  If you plan to use the Local Layer widget with the other predefined apps like basic_viewer, editor, or simple_map_viewer, make sure to repeat the above step in each respective config.json file under the stemapp\predefined-apps folder.  These will be located at a location similar to the path below,

```javascript
client\stemapp\themes[theme name]\layouts\default\config.json
```
### Configuring the Attribute Table

To ensure that the Attribute Table widget accepts your LocalLayer Layers, perform the following change.

1) In \client\stemapp\widgets\AttributeTable\setting\Setting.js, change line 379 from

```javascript
utils.readConfigLayerInfosFromMap(this.map, true, true)
```
to
```javascript
utils.readConfigLayerInfosFromMap(this.map, false, true)
```

Changing that first 'true' to a 'false' will tell the menu to read all layers from the map as normal, instead of just ArcGIS Online layers. Changing the second 'true' to a 'false' will let the Attribute Table include MapNotes layers from AGOL WebMaps.

### Configuring Other Widgets

If your LocalLayer layers do not appear when configuring other widgets, a small additional step might be taken prior to opening the Settings menu for these tools.  Prior to configuring the Edit Widget or the Incident Analysis widgets, for instance, make sure to open the Settings for the LocalLayer widget and exit again via the OK button.  This will ensure that the latest 'collection' of layers are present in the configuration menus of your other widgets.

To ensure that Related Tables appear within the Edit Widget's settings, ensure that you've added both the Spatial Layer and your Related Table layers to your application as Feature Layers.  If you do not open and close the LocalLayer Settings Menu within the WebAppBuilder Builder UI via the OK button, the Edit Widget's Configuration menu will not properly identify your Related Tables for configuration.

Occasionally, after multiple configuration changes within the builder without a full refresh of the page, you may end up with multiple Related Table records appearing within your Attribute Table and Edit widget configuration menus.  Saving your changes, then refreshing the builder should remove these duplicate records.  Make sure to refresh the 'collection' as described above once you've refreshed the page.

### Editor Tracking

The LocalLayer widget can be used alongside the Edit widget to enable editing of Feature Services.  This way, users can edit LocalLayerWidget layers without having ArcGIS Online login information.  Editor Tracking can be performed using LDAP-based Windows Active Directory, by simply ticking the appropriate boxes when setting up your Feature Layer.  Note that two options are available: "Track Users When Editing", which will simply record the user's Active Directory name in the tracking field specified in the service, and "Only Allow Users to Edit Features They Created", which will prohibit users from editing features that they didn't create under their Active Directory name.  Note that if the second option is ticked, as specified on line 410 of Widget.js, your application's index.html file will need to be turned into an index.aspx file (and appropriately hosted as a server-side application through IIS), and the following line will need to be added to the index.aspx page,

```javascript
<script type="text/javascript">var _llwUser = "<%= User.Identity.Name.Replace("\","\\") %>"</script>
```

Note that for both cases, the application needs to have Anonymous Authentication disabled in IIS, and have Windows Authentication enabled.

If your app is being hosted by a webserver other than IIS, you will likely need to use a solution other than ASP.  Your index.html page could be turned into a .php page, for instance, with your PHP logic populating the _llwUser variable with the authenticated user's identity, for example.

### Customizing Feature Layers:

#### Custom Symbology and Labelling

When configuring Feature Layers using the LocalLayer widget, a "Show Labels" option is available.  If you want to use this functionality, you'll first need to make a small edit to the mapOptions section on your client\stemapp\predefined-apps\default\config.json directory (or appropriate Theme directory), in addition to checking the "Show Labels?" checkbox within the Web App Builder itself. 

When editing the config.json of an existing app, the mapOptions section should already exist.  Otherwise, you may need to add this section in its entirety.

```javascript
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

Note that showLabels belongs within the mapOptions segment.  Also note that hitting 'Save' on the app in the Builder appears to blow away the value if you haven't set it in your stemapp config.json file, always verify the presence of the showLabels value in your config.json file whenever you hit 'Save'.

Please note that there is currently an esri API bug preventing complex labelling expressions from being displayed on Feature Layers, such as expressions containing the CONCAT operator, and hopefully this will be addressed by esri in future releases.

Note that this change is necessary for the custom label rendering in the Add Feature Layer dialog to work. For the "Custom Label Style" and "Custom Renderer" fields, paste the JSON output from [Esri's custom symbol generation app](http://developers.arcgis.com/javascript/samples/playground/index.html) into these fields to create custom Feature Layer symbology and labels.

For the "Custom Label Style", use the TextSymbol option in the Playground, and make sure to delete the default "Text" line provided by the playground app output. This will be provided by the custom label expression you provide in the "Custom Label Expression" field. Format this field according to the "labelExpressionInfo section of the [LabelClass info page](https://developers.arcgis.com/javascript/jsapi/labelclass-amd.html#labelexpressioninfo).

### Preview Option

As of version 2.2, a "Preview" option can be enabled for the LL widget.  When enabled, this sets the LocalLayer widget in a mode whereby a MapService or FeatureService can be passed to the app via the URL when launching, overriding any other LocalLayer configuration settings.  The layer will have popups enabled, with all fields being displayed in popups.

IE: http://mapApp/index.html?_preview=http://arcgis/rest/services/MyService/MapService

Additionally, a full Web Map json configuration can be fed directly to the application via the _jsonconfig={} url parameter, effectively making the entire app dynamic.

### Use with other widgets
#### eSearch

We've noticed that when using the LocalLayer widget alongside [Robert Scheitlin's eSearch widget](https://github.com/rscheitlin/eSearch), any participating layers must have popups configured for them within the LocalLayer widget.
