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

// JSON
app.use(bodyParser.json());

// Setze ejs als View Engine
app.set('view engine', 'ejs');

/**
 * Konfiguriere den Pfad für statische Dateien.
 * Teste das Ergebnis im Browser unter 'http://localhost:3000/'.
 */

app.use(express.static("public"));

// Shitty ID generation
const generateId = () => Math.random().toString(36).substr(2,7);

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
        this.id = generateId();
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

    geoTagById(id) {
        return this.geoTags.find(tag => tag.id === id);
    }

    updateTagById(id, data) {
        const tag = this.geoTagById(id);
        if (tag) {
            tag.name = data.name ?? tag.name;
            tag.location.latitude = data.latitude ?? tag.location.latitude;
            tag.location.longitude = data.longitude ?? tag.location.longitude;
            tag.hashtag = data.hashtag ?? tag.hashtag;
        }
        return tag;
    }

    deleteTagById(id) {
        this.geoTags = this.geoTags.filter(itm => itm.id !== id);
    }

    addGeoTag(tag) {
        this.geoTags.push(tag);
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
        taglist: state.geoTags,
        taglistJson: JSON.stringify(state.geoTags)
    });
});

/**
 * API
 */

app.get("/api/geotags", (req, res) => {
    const location = new GeoLocation(req.query.latitude, req.query.longitude);
    const defaultRadius = 10;

    let geoTags = [];

    if (location.isValid && req.query.searchterm) {
        geoTags = state.searchGeoTagsByRadiusAndText(location, defaultRadius, req.query.searchterm);
    } else if (location.isValid) {
        geoTags = state.searchGeoTagsByRadius(location, defaultRadius);
    } else if (req.query.searchterm) {
        geoTags = state.searchGeoTagsByText(req.query.searchterm);
    }

    return res.json(geoTags);
})

app.post("/api/geotags", (req, res) => {
    const location = new GeoLocation(req.body.latitude, req.body.longitude);
    const tag = new GeoTag(req.body.name, location, req.body.hashtag);

    state.addGeoTag(tag);

    return res.json(state.geoTags);
})

app.get("/api/geotags/:id", (req, res) => {
    return res.json(state.geoTagById(req.params.id));
})

app.put("/api/geotags/:id", (req, res) => {
    const tagId = req.params.id;

    const updatedTag = state.updateTagById(tagId, req.body);
    return res.json(updatedTag);
})

app.delete("/api/geotags/:id", (req, res) => {
    state.deleteTagById(req.params.id);
    return res.json(state.geoTags);
})

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
