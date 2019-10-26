"use strict";
/******************************************************************************
 Copyright 2019 Wolfgang Schildbach

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
 ******************************************************************************/

/******************************************************************************
 This file implements the client-side of the magnetic compass display.
 ******************************************************************************/

// the geomagnetic model. This gets set up at application start
let geoMag ;

// Downloads new magnetic deviation(s) from the server. This is called when the map moves.
function refreshMagdev() {
    let bounds = map.getExtent().toArray();
    let params = { "b": y2lat(bounds[1]), "t": y2lat(bounds[3]), "l": x2lon(bounds[0]), "r": x2lon(bounds[2])};

    let latitude  = (params.b+params.t)/2;
    let longitude = (params.l+params.r)/2;
    let options = {date:new Date(), onLoadModel:refreshMagdev};

    /* get the variation and yearly change. If not available yet, call me again when it is */
    let m = getVariationChange(latitude, longitude, options);

    if (m != undefined) {
        document.getElementById('magCompassRose').style.transform = 'rotate('+(-m.variation).toFixed(1)+'deg)';
        // EXAMPLE
        // VAR 3.5°5'E (2015)
        // ANNUAL DECREASE 8'
        $('#magCompassTextTop').html("VAR "+m.variation.toFixed(1)+(m.variation>=0 ? "E":"W")+" ("+options.date.getFullYear()+")");
        $('#magCompassTextBottom').html("ANNUAL "+(m.change >= 0 ? "INCREASE ":"DECREASE ")+(60*m.change).toFixed(0)+"'");
    }
}

/*
 * get the magnetic variation at the center of the viewport.
 *
 * If the model is not loaded yet, load it and return "undefined".
 * You can also provide a function to call once the model is loaded.
 */
function getVariation(lat, lon, options) {
    if (geoMag == undefined) {
        /* if the geomagnetic model has not been loaded yet, load it and update the deviation asynchronously */
        jQuery.ajax({
            url:"javascript/geomagjs/WMM.COF",
            context:options}).done(initModel);

        function initModel(data) {
            var wmm = cof2Obj(data);
            geoMag = geoMagFactory(wmm);
            if (this.onLoadModel) {this.onLoadModel();}
        }
        return undefined;
    }
    return geoMag(lat, lon, options.elevation || 0, options.date || new Date()).dec
}

/*
 * return an object with current variation and yearly change.
 *
 * If the model is not loaded yet, load it and return "undefined".
 * You can also provide a function to call once the model is loaded.
 */

function getVariationChange(lat, lon, options) {
    let opts = {onLoadModel:options.onLoadModel};

    // get two dates exactly one year apart
    const msInYear = 1000*60*60*24*365.25;
    let now = options.now || new Date();
    let then = new Date(); then.setTime(now.getTime() + msInYear);

    opts.date = now;
    let varNow = getVariation(lat,lon,opts);
    if (varNow === undefined) {return undefined;}

    opts.date = then;
    let varThen = getVariation(lat,lon,opts);

    let span = (then.getTime()-now.getTime())/msInYear; /* should be exactly one */
    return {variation: varNow, change:(varThen-varNow) / span};
}
