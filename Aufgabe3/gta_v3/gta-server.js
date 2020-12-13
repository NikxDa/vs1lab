/**
 * Template für Übungsaufgabe VS1lab/Aufgabe3
 * Das Skript soll die Serverseite der gegebenen Client Komponenten im
 * Verzeichnisbaum implementieren. Dazu müssen die TODOs erledigt werden.
 */

/**
 * Definiere Modul Abhängigkeiten und erzeuge Express app.
 */

var http = require('http');
//var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var express = require('express');

var app;
app = express();
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: false
}));

// Setze ejs als View Engine
app.set('view engine', 'ejs');

/**
 * Konfiguriere den Pfad für statische Dateien.
 * Teste das Ergebnis im Browser unter 'http://localhost:3000/'.
 */

app.use(express.static("public"));

/**
 * Konstruktor für GeoTag Objekte.
 * GeoTag Objekte sollen min. alle Felder des 'tag-form' Formulars aufnehmen.
 */

class GeoLocation {
    constructor(latitude, longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }

    distanceTo(location) {
        const toRadians = degrees => degrees * (Math.PI / 180);

        // Convert lat/lng to radians
        const originLatitude = toRadians(this.latitude);
        const originLongitude = toRadians(this.longitude);

        const targetLatitude = toRadians(location.latitude);
        const targetLongitude = toRadians(location.longitude);

        // Use Haversine formula to calculate distance to other locations
        const deltaLatitude = targetLatitude - originLatitude;
        const deltaLongitude = targetLongitude - originLongitude;

        let haversine = Math.pow(Math.sin(deltaLatitude / 2), 2) + Math.cos(originLatitude) * Math.cos(targetLatitude) * Math.pow(Math.sin(deltaLongitude / 2), 2);
        haversine = 2 * Math.asin(Math.sqrt(haversine));

        // Earth radius
        haversine = haversine * 6371;

        return haversine;
    }

    get isValid() {
        return this.latitude >= -90 && this.latitude <= 90 && this.longitude >= -180 && this.longitude <= 180;
    }
}

class GeoTag {
    constructor(name, location, hashtag) {
        this.name = name;
        this.location = location;
        this.hashtag = hashtag;
    }
}

/**
 * Modul für 'In-Memory'-Speicherung von GeoTags mit folgenden Komponenten:
 * - Array als Speicher für Geo Tags.
 * - Funktion zur Suche von Geo Tags in einem Radius um eine Koordinate.
 * - Funktion zur Suche von Geo Tags nach Suchbegriff.
 * - Funktion zum hinzufügen eines Geo Tags.
 * - Funktion zum Löschen eines Geo Tags.
 */

class InMemoryGeoTagState {
    constructor() {
        this.geoTags = [];
    }

    searchGeoTagsByRadius(location, radius) {
        return this.geoTags.filter(tag => tag.location.distanceTo(location) <= radius);
    }

    searchGeoTagsByText(text) {
        return this.geoTags.filter(tag => tag.name.includes(text) || tag.hashtag.includes(text));
    }

    searchGeoTagsByRadiusAndText(location, radius, text) {
        return this.geoTags
            .filter(tag => tag.location.distanceTo(location) <= radius)
            .filter(tag => tag.name.includes(text) || tag.hashtag.includes(text));
    }

    addGeoTag(tag) {
        this.geoTags.push(tag);
    }

    removeGeoTag(tag) {
        this.geoTags = this.geoTags.filter(itm => itm.name !== tag.name);
    }
}

const state = new InMemoryGeoTagState();

/**
 * Route mit Pfad '/' für HTTP 'GET' Requests.
 * (http://expressjs.com/de/4x/api.html#app.get.method)
 *
 * Requests enthalten keine Parameter
 *
 * Als Response wird das ejs-Template ohne Geo Tag Objekte gerendert.
 */

app.get('/', function(req, res) {
    res.render('gta', {
        taglist: []
    });
});

/**
 * Route mit Pfad '/tagging' für HTTP 'POST' Requests.
 * (http://expressjs.com/de/4x/api.html#app.post.method)
 *
 * Requests enthalten im Body die Felder des 'tag-form' Formulars.
 * (http://expressjs.com/de/4x/api.html#req.body)
 *
 * Mit den Formulardaten wird ein neuer Geo Tag erstellt und gespeichert.
 *
 * Als Response wird das ejs-Template mit Geo Tag Objekten gerendert.
 * Die Objekte liegen in einem Standard Radius um die Koordinate (lat, lon).
 */

app.post('/tagging', function(req, res) {
    const location = new GeoLocation(req.body.latitude, req.body.longitude);
    const tag = new GeoTag(req.body.name, location, req.body.hashtag);

    state.addGeoTag(tag);

    res.render('gta', {
        taglist: state.geoTags
    });
});

/**
 * Route mit Pfad '/discovery' für HTTP 'POST' Requests.
 * (http://expressjs.com/de/4x/api.html#app.post.method)
 *
 * Requests enthalten im Body die Felder des 'filter-form' Formulars.
 * (http://expressjs.com/de/4x/api.html#req.body)
 *
 * Als Response wird das ejs-Template mit Geo Tag Objekten gerendert.
 * Die Objekte liegen in einem Standard Radius um die Koordinate (lat, lon).
 * Falls 'term' vorhanden ist, wird nach Suchwort gefiltert.
 */

app.post('/discovery', function(req, res) {
    const location = new GeoLocation(req.body.latitude, req.body.longitude);
    const defaultRadius = 10;

    let geoTags = [];

    if (location.isValid && req.body.searchterm) {
        geoTags = state.searchGeoTagsByRadiusAndText(location, defaultRadius, req.body.searchterm);
    } else if (location.isValid) {
        geoTags = state.searchGeoTagsByRadius(location, defaultRadius);
    } else if (req.body.searchterm) {
        geoTags = state.searchGeoTagsByText(req.body.searchterm);
    }

    res.render('gta', {
        taglist: geoTags
    });
});

/**
 * Setze Port und speichere in Express.
 */

var port = 3000;
app.set('port', port);

/**
 * Erstelle HTTP Server
 */

var server = http.createServer(app);

/**
 * Horche auf dem Port an allen Netzwerk-Interfaces
 */

server.listen(port);
