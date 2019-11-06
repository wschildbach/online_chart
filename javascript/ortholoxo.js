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
 ******************************************************************************

 ******************************************************************************
 This file implements functions to calculate orthodromic and loxodromic
 distances, courses, and more
 see "Sporthochseeschifferschein Terrestrische Navigation", Joachim Venghaus, www.venghaus.eu, 11. März 2017
 ******************************************************************************/

const d2r = Math.PI/180;
const r2d = 180/Math.PI;

/* trig functions for "compass angles" */
function sin(d) {
    return Math.sin(d2r*d);
}

function cos(d) {
    return Math.cos(d2r*d);
}

function acos(x) {
    return r2d*Math.acos(x);
}

function tan(d) {
    return Math.tan(d2r*d);
}

/* compute arctan(y/x), in degrees */
function atan2(y,x) {
    return r2d*Math.atan2(y,x);
}

function atan(x) {
    return r2d*Math.atan(x);
}

/*
 * Functions for great circle navigation
 */

function orthoDistance(latA, lonA, latB, lonB) {
    let l = lonB - lonA;
    return 60*acos(sin(latA)*sin(latB) + cos(latA)*cos(latB)*cos(l));
}

function orthoInitialCourse(latA, lonA, latB, lonB) {
    let l = lonB - lonA;
    return n(atan2(sin(l), tan(latB)*cos(latA) - sin(latA)*cos(l)));
}

/* Peak latitude, Scheitelbreite */
function orthoPeakLatitude(latA, alpha) {
    let b = Math.abs(acos(sin(alpha)*cos(latA)));
    return Math.sign(latA)*b;
}

/* longitude of peak latitude */
function orthoPeakLongitude(latA, lonA, alpha) {
    return lonA + atan2(1,sin(latA)*tan(alpha));
}

/* latitude of great circle, given the longitude, and coordinates of the peak */
function orthoLat(lonM,latS,lonS) {
    return atan(tan(latS)*cos(lonM-lonS));
}

/*
 * loxodromic functions
 */

/* augmented latitude, vergrößerte Breite */
function augLatitude(lat) {
    return 60*r2d * Math.log(tan(45+lat/2));
}

function n(x) {
    return (x > 0) ? (x < 360 ? x : x-360) : x + 360;
}

function loxoCourse(latA, lonA, latB, lonB) {
    let dl = lonB-lonA;
    let dPHI = augLatitude(latB) - augLatitude(latA);
    return n(atan2(60*dl,dPHI));
}

function loxoDistance(latA, lonA, latB, lonB) {
    var calpha = cos(loxoCourse(latA, lonA, latB, lonB));
    const eps = 0.1;
    let b=latB-latA;
    return (calpha > eps) ? 60*Math.abs(b/calpha) : orthoDistance(latA, lonA, latB, lonB);
}
