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
 ******************************************************************************

 ******************************************************************************
 This file implements functions to calculate orthodromic and loxodromic
 distances, courses, and more
 see "Sporthochseeschifferschein Terrestrische Navigation", Joachim Venghaus, www.venghaus.eu, 11. März 2017
 ******************************************************************************/

/* given a quarter-angle course, compute the full-angle course */

function q2f2(alphaQ,latA, lonA, latB, lonB) {
    var dlat = latB - latA; /* -180 <= dlat <= 180 */
    var dlon = lonB - lonA;
    if (dlon >= 180) dlon = dlon-360; /* -180 <= dlon < 180 */
    var NS = dlat; /* >0: sail north, <0: sail south */
    var WE = dlon; /* >0: sail east, <0: sail west */

    if (NS >= 0) {
        return (WE >= 0) ? alphaQ : 360-alphaQ;
    } else {
        return (WE < 0) ? 180+alphaQ : 180-alphaQ;
    }
}

var d2r = Math.PI/180;
var r2d = 1/d2r;
function deg2rad(d) {
    var a = 90-d;
    return (a>=0) ? d2r*a : d2r*(a + 360);
}

function normalize(r) {
    while (r<0) r += 2.0*Math.PI;
    while (r>2*Math.PI) r -= 2.0*Math.PI;
    return r;
}

function rad2deg(r) {
    var a = Math.PI/2 - normalize(r);
    return (a >= 0) ? r2d*a : r2d*(a + 2*Math.PI);
}

function q2f(alphaQ,latA, lonA, latB, lonB) {
    return deg2rad(q2f2(rad2deg(alphaQ), r2d*latA, r2d*lonA, r2d*latB, r2d*lonB));
}

function orthoDistance(latA, lonA, latB, lonB) {
    var l = lonB - lonA;
    return 60*Math.acos(Math.sin(latA)*Math.sin(latB)+Math.cos(latA)*Math.cos(latB)*Math.cos(l));
}

function orthoDistance2(latA, lonA, latB, lonB) {
    return orthoDistance(d2r*latA, d2r*lonA, d2r*latB, d2r*lonB)*r2d;
}

function orthoInitialCourse(latA, lonA, latB, lonB) {
    var l = lonB - lonA;
    return Math.atan2(Math.tan(latB)*Math.cos(latA)-Math.sin(latA)*Math.cos(l),Math.sin(l));
}

function orthoInitialCourse2(latA, lonA, latB, lonB) {
    return rad2deg(orthoInitialCourse(d2r*latA, d2r*lonA, d2r*latB, d2r*lonB));
}

function orthoScheitelBreite(latA, alpha) {
    var b = Math.abs(Math.acos(Math.sin(alpha)*Math.cos(latA)));
    return Math.sign(latA)*b; /* I don't believe this is correct */
}

function orthoScheitelBreite2(latA, alpha) {
    return r2d*orthoScheitelBreite(d2r*latA, deg2rad(alpha));
}

function orthoScheitelLaenge(latA, lonA, alpha) {
    return lonA + Math.atan2(1,Math.sin(latA)*Math.tan(alpha));
}

function orthoScheitelLaenge2(latA, lonA, alpha) {
    return r2d*orthoScheitelLaenge(d2r*latA, d2r*lonA, deg2rad(alpha));
}

function orthoLat(lonM,latS,lonS) {
    return Math.atan(Math.tan(latS)*Math.cos(lonM-lonS));
}

function orthoLat2(lonM,latS,lonS) {
    return r2d*orthoLat(d2r*lonM,d2r*latS,d2r*lonS);
}

/* loxodromic functions */

/* augmented latitude, vergrößerte Breite */
function al2(lat) {
    return 180/Math.PI*Math.log(Math.tan(Math.PI/4+lat/2*d2r));
}

function loxoInitialCourse2(latA, lonA, latB, lonB) {
    var l = lonB-lonA;
    var B = al2(latB) - al2(latA);
    return r2d*normalize(Math.atan2(l,B));
}

function loxoDistance2(latA, lonA, latB, lonB) {
    var x = Math.abs(Math.sin(d2r*loxoInitialCourse2(latA, lonA, latB, lonB)));
    var b = lonB-lonA; if (b > 180) {b -= 360;}
    var eps = 0.1;
    return 60*Math.abs((x > eps) ?  b/x : latB-latA);
}
