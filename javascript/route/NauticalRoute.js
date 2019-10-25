/******************************************************************************
 Copyright 2011 Olaf Hannemann

 This file is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This file is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this file.  If not, see <http://www.gnu.org/licenses/>.
 ******************************************************************************

 ******************************************************************************
 This file implements the nautical route service to the OpenSeaMap map.
 Version 0.1.1  15.10.2011
 ******************************************************************************/

var defaultStyle = {strokeColor: "blue", strokeOpacity: "0.8", strokeWidth: 3, fillColor: "blue", pointRadius: 3, cursor: "pointer"};
var style = OpenLayers.Util.applyDefaults(defaultStyle, OpenLayers.Feature.Vector.style["default"]);
var routeStyle = new OpenLayers.StyleMap({
    'default': style,
    'select': {strokeColor: "red", fillColor: "red"}
});

var editPanel;
var routeDraw;
var routeEdit;

var routeTrack;
var routeObject;

var style_edit = {
    strokeColor: "#CD3333",
    strokeWidth: 3,
    pointRadius: 4
};

function NauticalRoute_initControls() {
    editPanel = new OpenLayers.Control.Panel();
    routeDraw = new OpenLayers.Control.DrawFeature(layer_nautical_route, OpenLayers.Handler.Path, {title: 'Draw line'});
    routeEdit = new OpenLayers.Control.ModifyFeature(layer_nautical_route, {title: 'Edit feature',clickout:false}),
    editPanel.addControls([routeDraw, routeEdit]);
    editPanel.defaultControl = routeDraw;
    map.addControl(editPanel);
    NauticalRoute_initSegmentDisplay();
    routeEdit.standalone = true;
}

function NauticalRoute_startEditMode() {
    NauticalRoute_initControls();
    NauticalRoute_getPoints();
    routeChanged = false;
}

function NauticalRoute_stopEditMode() {
    if (!routeDraw) {
        return;
    }
    routeDraw.deactivate();
    routeEdit.deactivate();
    layer_nautical_route.removeAllFeatures();
    routeObject = undefined;
}

function NauticalRoute_addMode() {
    routeDraw.activate();
    routeEdit.deactivate();
}

function NauticalRoute_editMode() {
    routeDraw.deactivate();
    routeEdit.activate();
    //layer_nautical_route.style = style_green;
}

/*
 * set up the default visibility of columns in the segment display table.
 * Also dynamically generate the preferences view based on the table.
 */
function NauticalRoute_initSegmentDisplay() {
    let prefMenu = $('#prefViewColumns');
    let colHeaders = $('#segmentList th');
    colHeaders.each(function() {
        let id = $(this).attr('class');
        if (id != undefined) {
            let li = '<li><input type="checkbox" checked id="' + 'chk' + id + '" >' + $(this).text() + '</li>';
            /* append a li with checkbox; on click, set the display property of associated columns */
            $(li).appendTo(prefMenu).click(function (evt) {
                let checked = $(evt.currentTarget).find('input').is(':checked');
                /* get the id of the input element; strip off the "chk" from the id */
                let t = '.'+$(evt.currentTarget).find('input').attr('id').substring(3);
                $(t).css('display',checked ? 'table-cell':'none');
            });
        }
    });
}

function toggleOpenFileDialog() {
    let o=$('#openfiledialog');
    o.toggleClass('show-modal');
}
function togglePrefDialog() {$('#preferences').toggleClass('show-modal');}
function toggleSaveFileDialog() {$('#savefiledialog').toggleClass('show-modal');}

function NauticalRoute_saveTrack() {
    var format = document.getElementById("routeFormat").value;
    var name   = document.getElementById("tripName").value;
    var mimetype, filename;

    if (name=="") {
        name = "route";
    }

    switch (format) {
        case 'CSV':
            mimetype = 'text/csv';
            filename = name+'.csv';
            content = NauticalRoute_getRouteCsv(routeTrack);
            break;
        case 'KML':
            mimetype = 'application/vnd.google-earth.kml+xml';
            filename = name+'.kml';
            content = NauticalRoute_getRouteKml(routeTrack);
            break;
        case 'GPX':
            mimetype = 'application/gpx+xml';
            filename = name+'.gpx';
            content = NauticalRoute_getRouteGpx(routeObject);
            break;
        case 'GML':
            mimetype = 'application/gml+xml';
            filename = name+'.gml';
            content = NauticalRoute_getRouteGml(routeObject);
            break;
    }

    // Remove previous added forms
    $('#actionDialog > form').remove();

    form = document.createElement('form');
    form.id = this.id + '_export_form';
    form.method = 'post';
    form.action = './api/export.php';
    document.getElementById('actionDialog').appendChild(form);
    div = document.createElement('div');
    div.className = this.displayClass + "Control";
    form.appendChild(div);
    input = document.createElement('input');
    input.id = this.id + '_export_input_mimetype';
    input.name = 'mimetype';
    input.type = 'hidden';
    input.value = mimetype;
    div.appendChild(input);
    input = document.createElement('input');
    input.id = this.id + '_export_input_filename';
    input.name = 'filename';
    input.type = 'hidden';
    input.value = filename;
    div.appendChild(input);
    input = document.createElement('input');
    input.id = this.id + '_export_input_content';
    input.name = 'content';
    input.type = 'hidden';
    input.value = content;
    div.appendChild(input);

    routeChanged = false;

    $('#actionDialog > form').get(0).submit();
}

function NauticalRoute_openTrack() {
    let fileInput = document.querySelector("#openfilename");
    let files = fileInput.files;
    let gpxFile = files[0];

    var reader = new FileReader();
    reader.onload = function(event) {
        var contents = event.target.result;
        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(contents, "text/xml");

            // change from XPath to other selection syntax?
    // see https://www.topografix.com/GPX/1/1/#type_rteType
    // and https://en.wikipedia.org/wiki/GPS_Exchange_Format
    // and https://developer.mozilla.org/en-US/docs/Web/API/Document
    // specifically https://developer.mozilla.org/en-US/docs/Web/API/Document/evaluate
    // and https://developer.mozilla.org/en-US/docs/Web/API/XPathResult

        // get the name of the route
        let name = xmlDoc.getElementsByTagName("name");
        $('#tripName').val(name[0].innerHTML)

        let points=[] ;
        let rte = xmlDoc.getElementsByTagName("rtept");
        if (rte.length == 0) // if no route contained, use track
            rte = xmlDoc.getElementsByTagName("trkpt")

        for (const pt of rte) {
            const lat = $(pt).attr('lat')
            const lon = $(pt).attr('lon')
            points.push(new OpenLayers.Geometry.Point(lon2x(lon),lat2y(lat)))
        }

        // then convert into a feature for OpenLayers
        let ls = new OpenLayers.Geometry.LineString(points)
        let feat = new OpenLayers.Feature.Vector(ls,{},style)

        layer_nautical_route.removeAllFeatures({silent:true});
        layer_nautical_route.addFeatures(feat);
    };

    reader.onerror = function(event) {
        console.error("File could not be read! Code " + event.target.error.code);
    };

    reader.readAsText(gpxFile);
}

function NauticalRoute_routeAdded(event) {
    routeChanged = true;
    routeObject = event.object.features[0];

    routeDraw.deactivate();
    routeEdit.activate();
    // Select element for editing
    routeEdit.selectFeature(routeObject);

    NauticalRoute_getPoints();
}

function NauticalRoute_routeModified(event) {
    routeChanged = true;
    routeObject = event.object.features[0];

    NauticalRoute_getPoints();
}

let routeChanged = false;

function getIdx(e) {
    return  $(e).attr('data-idx') ||
            $(e).parentsUntil('#pointsRoute','[data-idx]').attr('data-idx');
}

function NauticalRoute_zoomTo(evt) {
    /* this/context is tr, target is td */
    let idx = getIdx(evt.target);

    let points = routeObject.geometry.getVertices();
    let pt = points[idx];

    /* could now also determine zoom by building the difference between points, then using
       http://dev.openlayers.org/apidocs/files/OpenLayers/Layer-js.html#OpenLayers.Layer.getZoomForExtent
     */

    jumpTo(x2lon(pt.x), y2lat(pt.y), zoom);
}

function NauticalRoute_nameChange(evt) {
    /* this/context is td, target is input */
    let name = $(evt.target).val();
    let idx = getIdx(evt.target);

    let points = routeObject.geometry.getVertices();
    let pt = points[idx];

    if (name == "") {
        delete pt.name;
    } else {
        pt.name = name;
    }
}

function NauticalRoute_getPoints() {
    $('#routeStart').html('--');
    $('#routeEnd').html('--');
    $('#routeDistance').html('--');

    let rp = $('#routePoints');
    rp.html('');

    let points = routeObject && routeObject.geometry.getVertices();
    if (points != undefined) {
        const distFactors = {km: 1/ 0.540, m : 1000 / 0.540, nm : 1, ft : 1000 / (0.540*0.3048)};
        let distFactor = distFactors[$('#distUnits').val()];

        let latFormat = $('#coordFormat').val();
        let lonFormat = $('#coordFormat').val().replace(/[NS]/,'W');
        let coordFormat = function(lat,lon) {return formatCoords(lat, latFormat) + " - " + formatCoords(lon, lonFormat);}

        let totalDistance = 0;
        for(let i = 0; i < points.length - 1; i++) {
            let latA = y2lat(points[i].y);
            let lonA = x2lon(points[i].x);
            let latB = y2lat(points[i + 1].y);
            let lonB = x2lon(points[i + 1].x);
            let tC = getBearing(latA, latB, lonA, lonB);
            let distance = getDistance(latA, latB, lonA, lonB) * distFactor;
            let loxoDistance = loxoDistance2(latA, lonA, latB, lonB);
            totalDistance += distance;
            let tr = $('<tr data-idx="' + parseInt(i) + '"></tr>').appendTo(rp).click(NauticalRoute_zoomTo);;

            let tdName = $('<td class="rpName"></td>');
            tdName.append(
                (points[i].name == undefined) ?
                $('<input type="text" placeholder="' + coordFormat(latB,lonB) + '">') :
                $('<input type="text" value="' + points[i].name + '">')
            ).change(NauticalRoute_nameChange);

            let tdMwk = $('<td class="rpMwk">--</td>');
            getDeviation(function(p) {
                let now  = new Date();
                let myGeoMag = geoMag(p.lat, p.lon, 0, now);
                $(p.e).text((p.tC + myGeoMag.dec).toFixed(1)+'°');
            },{lat:latA,lon:lonA,tC:tC,e:tdMwk}
            );
            tr.append(
                '<td class="rpIdx">' + parseInt(i+1) + '.</td>',
                '<td class="rpRwk">' + tC.toFixed(1) + '°</td>',
                tdMwk,
                '<td class="rpDist">' + distance.toFixed(1) + ' ' + $('#distUnits').val() + '</td>',
                '<td class="rpLoxDist">' + loxoDistance.toFixed(1) + ' ' + $('#distUnits').val() + '</td>',
                tdName,
                '<td>' + 'O' + '</td>'
            );
        }
        $('#routeStart').html(coordFormat(y2lat(points[0].y),x2lon(points[0].x)));
        $('#routeEnd').html(coordFormat(y2lat(points[points.length-1].y),x2lon(points[points.length-1].x)));
        $('#routeDistance').html(totalDistance.toFixed(2) + ' ' + $('#distUnits').val());
    }
}

function NauticalRoute_getRouteCsv(points) {
    var buffText = ";" + tableTextNauticalRouteCourse + ";" + tableTextNauticalRouteDistance + ";" + tableTextNauticalRouteCoordinate + "\n";
    var latA, latB, lonA, lonB, distance, bearing;
    var totalDistance = 0;

    for(i = 0; i < points.length - 1; i++) {
        latA = y2lat(points[i].y);
        lonA = x2lon(points[i].x);
        latB = y2lat(points[i + 1].y);
        lonB = x2lon(points[i + 1].x);
        distance = getDistance(latA, latB, lonA, lonB).toFixed(2);
        bearing = getBearing(latA, latB, lonA, lonB).toFixed(2);
        totalDistance += parseFloat(distance);
        buffText += parseInt(i+1)+ ";" + bearing + "°;" + distance + "nm;\"" + lat2DegreeMinute(latB) + " - " + lon2DegreeMinute(lonB) + "\"\n";
    }

    return convert2Text(buffText);
}

function NauticalRoute_getRouteKml(points) {
    var latA, lonA;
    var buffText = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<kml xmlns=\"http://earth.google.com/kml/2.0\">\n";
    buffText += "<Folder>\n<name>OpenSeaMap Route</name>\n<description>test</description>";
    buffText += "<Placemark>\n<name>OpenSeaMap</name>\n<description>No description available</description>";
    buffText += "<LineString>\n<coordinates>\n";
    for(i = 0; i < points.length; i++) {
        latA = y2lat(points[i].y);
        lonA = x2lon(points[i].x);
        buffText += lonA + "," + latA + " ";
    }
    buffText += "\n</coordinates>\n</LineString>\n</Placemark>\n</Folder>\n</kml>";

    return buffText;
}

function NauticalRoute_getRouteGpx(feature) {
    var parser = new OpenLayers.Format.GPX({
        internalProjection: map.projection,
        externalProjection: proj4326
    });

    return parser.write(feature);
}

function NauticalRoute_getRouteGml(feature) {
    var parser = new OpenLayers.Format.GML.v2({
        internalProjection: map.projection,
        externalProjection: proj4326
    });

    return parser.write(feature);
}
