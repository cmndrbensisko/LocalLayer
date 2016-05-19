LocalLayerWidget 2.0
==

###Setting up the LocalLayer Widget within the Default App:

To add this widget to your ArcGIS Web AppBuilder environment, add the widget to your \client\stemapp\widgets directory, and add a reference to the widget in the standard Default configuration located at \client\stemapp\predefined-apps\default\config.json, under the widgetOnScreen section.

If you plan to use the Local Layer widget with the other predefined apps like basic_viewer, editor, or simple_map_viewer, make sure to repeat the above step in those folders under the stemapp\predefined-apps folder.  Also, please note that the "/LocalLayer/" portion of the uri path below must match the folder name in which the widget resides on your local deployment, so if you're downloading the widget from github, you'll likely want to rename the folder from "LocalLayer-master" to simply "LocalLayer"

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

###Setting up the LocalLayer Widget for Other Themes:

Completing the steps above will only affect the default "Foldable Theme" for the WAB.  In order to add the Local Layer widget to the any of the other themes, you'll need to perform the same snippet addition to the appropriate config.json file located at a location similar to the path below,

```javascript
client\stemapp\themes[theme name]\layouts\default\config.json
```

###Attribute Table:

To ensure that the Attribute Table widget accepts your LocalLayer Layers, perform the following change.

1) In \client\stemapp\widgets\AttributeTable\setting\Setting.js, change line 375 from

```javascript
utils.readConfigLayerInfosFromMap(this.map, true, true)
```
to
```javascript
utils.readConfigLayerInfosFromMap(this.map, false, true)
```

Changing that first 'true' to a 'false' will tell the menu to read all layers from the map as normal, instead of just ArcGIS Online layers. Changing the second 'true' to a 'false' will let the Attribute Table include MapNotes layers from AGOL WebMaps.

###Editor Tracking

The LocalLayer widget can be used alongside the Edit widget to enable editing of FeatureServices.  This way, users can edit LocalLayerWidget layers without having ArcGIS Online login information.  Editor Tracking can be performed using LDAP-based Windows Active Directory, by simply ticking the appropriate boxes when setting up your Feature Layer.  Note that two options are available: "Track Users When Editing", which will simply record the user's Active Directory name in the tracking field specified in the service, and "Only Allow Users to Edit Features They Created", which will prohibit users from editing features that they didn't create under their Active Directory name.  Note that if the second option is ticked, as specified on line 410 of Widget.js, your application's index.html file will need to be turned into an index.aspx file (and appropriately hosted as a server-side application through IIS), and the following line will need to be added to the index.aspx page,

```javascript
<script type="text/javascript">var _llwUser = "<%= User.Identity.Name.Replace("\","\\") %>"</script>
```

###Customizing Feature Layers:

####Custom Symbology and Labelling

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

Please note that there is currently an ESRI API bug preventing complex labelling expressions from being displayed on Feature Layers, such as expressions containing the CONCAT operator, and hopefully this will be addressed by esri in future releases.

Note that this change is necessary for the custom label rendering in the Add Feature Layer dialog to work. For the "Custom Label Style" and "Custom Renderer" fields, paste the JSON output from [Esri's custom symbol generation app](http://developers.arcgis.com/javascript/samples/playground/index.html) into these fields to create custom Feature Layer symbology and labels.

For the "Custom Label Style", use the TextSymbol option in the Playground, and make sure to delete the default "Text" line provided by the playground app output. This will be provided by the custom label expression you provide in the "Custom Label Expression" field. Format this field according to the "labelExpressionInfo section of the [LabelClass info page](https://developers.arcgis.com/javascript/jsapi/labelclass-amd.html#labelexpressioninfo).

###Use with other widgets
####eSearch

We've noticed that when using the LocalLayer widget alongside [Robert Scheitlin's eSearch widget](https://github.com/rscheitlin/eSearch), any participating layers must have popups configured for them within the LocalLayer widget.