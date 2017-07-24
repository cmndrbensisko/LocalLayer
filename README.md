LocalLayerWidget 2.5
==

Help keep the author caffeinated!  If you find the LocalLayer Widget useful, feel free to click the [tip jar](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=LLXK28GA2T3CG) to help support ongoing development.  Thanks to everyone who's donated!

[![paypal link](https://github.com/cmndrbensisko/LocalLayer/blob/master/images/jar.gif "thanks for your support!")](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=LLXK28GA2T3CG)
###About

The LocalLayer Widget for ArcGIS Web AppBuilder is intended to allow the direct addition of ArcGIS for Server Mapservices to an ArcGIS Web AppBuilder application, without needing to wrap the desired services in an ArcGIS Online/Portal Web Map.  The following layer types are currently supported:

    * Dynamic MapServices
    * FeatureService Layers
    * Tiled Layers
    * Basemap Layers
    * geoJson Layers
    * WebTile Layers
    * ImageService Layers
    * WMS Layers
    * Custom Layers (IE: Layers whose data is assembled via a 'transformer')

FeatureServices can be edited via the Edit Widget, including Related Tables and Attachments.  Editor Tracking and constraining edits to user-created features is also possible.

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

If your LocalLayer layers do not appear when configuring other widgets, a small additional step might be taken prior to opening the Settings menu for these tools.  Prior to configuring the Edit Widget or the Incident Analysis widgets, for instance, make sure to open the Settings for the LocalLayer widget and exit again via the OK button.  This will ensure that the latest 'collection' of layers are present in the configuration menus of your other widgets.  When in doubt, save your app and reload, then configure your widget.

To ensure that Related Tables appear within the Edit Widget's settings, ensure that you've added both the Spatial Layer and your Related Table layers to your application as Feature Layers.  If you do not open and close the LocalLayer Settings Menu within the WebAppBuilder Builder UI via the OK button, the Edit Widget's Configuration menu will not properly identify your Related Tables for configuration.

Occasionally, after multiple configuration changes within the builder without a full refresh of the page, you may end up with multiple Related Table records appearing within your Attribute Table and Edit widget configuration menus.  Saving your changes, then refreshing the builder should remove these duplicate records.  Make sure to refresh the 'collection' as described above once you've refreshed the page.

### Editor Tracking

The LocalLayer widget can be used alongside the Edit widget to enable editing of Feature Services.  This way, users can edit LocalLayerWidget layers without having ArcGIS Online login information.  Editor Tracking can be performed using LDAP-based Windows Active Directory, by simply ticking the appropriate checkboxes when setting up your Feature Layer in the LocalLayer Widget Settings menu.  

Note that two options are available: "Track Users When Editing", which will simply record the user's Active Directory name in the tracking field specified in the service, and "Only Allow Users to Edit Features They Created", which will prohibit users from editing features that they didn't create under their Active Directory name.  Note that if the second option is ticked, as specified on line 410 of Widget.js, your application's index.html file will need to be turned into an index.aspx file (and appropriately hosted as a server-side application through IIS), and the following line will need to be added to the index.aspx page,

```javascript
<script type="text/javascript">var _llwUser = "<%= User.Identity.Name.Replace("\","\\") %>"</script>
```

Note that for both cases, the application needs to have Anonymous Authentication disabled in IIS, and have Windows Authentication enabled.

If your app is being hosted by a webserver other than IIS, you will likely need to use a solution other than ASP.  Your index.html page could be turned into a .php page, for instance, with your PHP logic populating the _llwUser variable with the authenticated user's identity.

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

Typically, this is effective for producing very simple apps where the client simply needs a proof of concept, whereby they just click on a map feature and recieve a popup, without creating a dedicated app explicitly for this purpose; A single generic Preview app can be created instead, with appropriate url parameters sent to the client.

### Transformers
Transformers are a new addition to the LLW in version 2.5.  Unfortunately, many data feeds don't follow the GeoRSS standard, and as a result, it's difficult to provide a option to add these to the LLW that works in all cases.

Transformers are effectively custom Javascript files that will turn a data source, be it from a Web Service or perhaps a flat file included with your project, into a Feature Layer on the map.  
To create a transformer, please look at the .js files in the /transformers/ folder of this project.  You can even create transformers that accept configuration JSON provided by the settings menu.

To use a transformer file in a custom layer, simply put the transformer .js file in the /transformers/ directory, and when configuring the layer, specify the name of the file in the Transformer Name field.

### Use with other widgets
#### eSearch

We've noticed that when using the LocalLayer widget alongside [Robert Scheitlin's eSearch widget](https://github.com/rscheitlin/eSearch), any participating layers must have popups configured for them within the LocalLayer widget.

### odds.json

New in 2.5 is the odds.json file, which performs simple changes to the application GUI at runtime.  This was created for cases where a client's reaction to a WAB prototype is something along the lines of "This is great, BUT..", followed by suggesting a minor change to the user interface that requires making an entirely new version of an existing widget.

If an 'odds.json' file is placed in the /configs/LocalLayer directory of a finished app, the LocalLayer widget will read it at runtime and apply any GUI changes contained in the file to the application once the elements to be transformed appear.  Currently, HTML elements can be Disabled, Destroyed, Hidden, automatically populated with a given value, or automatically "Clicked" once they appear.  See the files under /samples/oddsFiles for some examples

#### uiActions

uiActions are user interface changes that should apply to all users of the application.  Each line consists of an action 'type' (destroy, disable, hide, autoPush, autoPopulate), a queryString containing a valid CSS query that identifies the element or elements to perform the action on, and whether or not the action should only occur once ('recur': false), or any time the element or elements appear on the page ('recur': true).

If you're using the autoPopulate action, include a "value" of what you would want to automatically populate the element with.

If you want to perform the uiAction on a certain immediate Parent Element of an element specified in the queryString, add a 'parentItem' parameter containing a CSS query or identifier for the parent element.

If your CSS query will yield multiple elements on the page, but you only want to apply a uiAction to one specific element in the collection, add an "order" value to the line to say which element in the collection returned by the queryString should have the uiAction applied to it.  An "order":0 will apply to the first element returned by the queryString.

#### groupActions

groupActions are advanced functionality that works if you have some sort of role-based Active Directory authentication for your application, set up as outlined in the Editor Tracking session.  The syntax of groupActions are the same as uiActions, with the addition of a 'role' value, containing which Role a user should be in for the specified uiAction to be performed.  In addition to adding the _llwUser line specified above, you'll also need to fetch an array of Groups that the current user belongs in via adding a line similar to the one below for IIS in the application's index.aspx file,

```javascript
    <script type="text/javascript">
        var _llwUser = "<%= User.Identity.Name.Replace("\","\\") %>"
        var _llwGroups = "<%= String.Join(",",CType(User.Identity,System.Security.Principal.WindowsIdentity).Groups.Translate(GetType(System.Security.Principal.NTAccount))) %>"
    </script>
```

This functionality is handy for, for example, creating a FeatureService-driven editing application whereby user edits are 'tagged' with a value unique to the user's group in a certain field, which you can hide from popup forms via the 'hide' uiAction.

### 3D

New in 2.5 is a version of the LocalLayer widget for the 3D stemapp.  It's still in an early phase, so expect bugs, but you should be able to add Dynamic, Feature, and Basemap layers to applications made using the 3D stemapp template.  Installation steps for the 3D widget should be similar to the 2D, though I've found that for some reason I can't get it to be turned 'off' in new apps by default.

### samples

#### WazeViewer

A sample application created with the Web App Builder has been included in the /samples/ directory, consuming the Waze traffic and incident data and displaying it on a map via the LocalLayer and InfoSummary widgets.  To get this app working, youll need to host it in an IIS folder and set up the proxy file contained in the main directory (Or, if you have your own Proxy set up for CORS, you can use that too).  Open the /configs/LocalLayer/config_LocalLayer.json file in a text editor and edit the URLs for the two WAZE layers to use your local proxy.  When you load the app, it should load the Waze data for the Ottawa region.

To use this app for your area, change the URL included in the /configs/LocalLayer/config_LocalLayer.json file to include bounding box coordinates for your area in the "top", "left", "right", and "bottom" parameters.

Note that it works via a 'trick' in the config file for using a geoJson layer, whereby we manually specify that locational information for the array of returned coordinates is two layers deep in the JSON within location.x and location.y.  Ideally, a Custom Layer and Transformer would be better suited to this task, but this app predates that functionality.  The Settings interface doesn't support specifying this, so only edit this file via a text editor; Changing the layer via the Settings menu will 'break' this custom change and it will need to be manually re-entered by hand.

#### flatFileDataSource

The flatFileDataSource application shows an example of how to use the new CustomLayer and Transformer functionality new in version 2.5 to add a layer from a local CSV file directly to the map.