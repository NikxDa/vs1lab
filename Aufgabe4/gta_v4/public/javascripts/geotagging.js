/* Dieses Skript wird ausgeführt, wenn der Browser index.html lädt. */

// Befehle werden sequenziell abgearbeitet ...

/**
 * "console.log" schreibt auf die Konsole des Browsers
 * Das Konsolenfenster muss im Browser explizit geöffnet werden.
 */
console.log("The script is going to start...");

// Es folgen einige Deklarationen, die aber noch nicht ausgeführt werden ...

// Hier wird die verwendete API für Geolocations gewählt
// Die folgende Deklaration ist ein 'Mockup', das immer funktioniert und eine fixe Position liefert.
GEOLOCATIONAPI = {
    getCurrentPosition: function(onsuccess) {
        onsuccess({
            "coords": {
                "latitude": 49.013790,
                "longitude": 8.390071,
                "altitude": null,
                "accuracy": 39,
                "altitudeAccuracy": null,
                "heading": null,
                "speed": null
            },
            "timestamp": 1540282332239
        });
    }
};

// Die echte API ist diese.
// Falls es damit Probleme gibt, kommentieren Sie die Zeile aus.
GEOLOCATIONAPI = navigator.geolocation;

/**
 * API
 */
class API {
    static async #sendRequest(path, method = "GET", body = null) {
        let options = { 
            method,
            headers: {
                "Content-Type": "application/json"
            }        
        };

        if (body) {
            options.body = body;
        }

        try {
            const response = await fetch(path, options);
            return await response.json();
        } catch(err) {
            alert("An error occured during your request");
        }
    }

    static createGeoTag(data) {
        return this.#sendRequest("/api/geotags", "POST", JSON.stringify(data));
    }

    static getGeoTags(data = {}) {
        let url = `/api/geotags?${new URLSearchParams(data).toString()}`;
        return this.#sendRequest(url);
    }

    static getGeoTag(id) {
        return this.#sendRequest(`/api/geotags/${id}`);
    }

    static updateGeoTag(id, data) {
        return this.#sendRequest(`/api/geotags/${id}`, "PUT", JSON.stringify(data));
    }

    static deleteGeoTag(id) {
        return this.#sendRequest(`/api/geotags/${id}`, "DELETE");
    }
}

const taggingForm = document.querySelector("#taggingForm");
const discoveryForm = document.querySelector("#discoveryFilterForm");

const handleTaggingFormSubmit = async evt => {
    evt.preventDefault();

    const formData = new FormData(taggingForm);
    const iterator = formData.entries();

    let data = {};
    let currentValue = iterator.next();
    while(!currentValue.done) {
        if (currentValue.value[1]) {
            data[currentValue.value[0]] = currentValue.value[1];
        }
        currentValue = iterator.next();
    }

    const responseData = await API.createGeoTag(data);

    const mapElement = document.querySelector("#mapView");
    mapElement.setAttribute("data-tags", JSON.stringify(responseData));
    gtaLocator.updateLocation();

    createHTMLGeoTag(data);

    return false;
}

const handleDiscoveryFormSubmit = async evt => {
    evt.preventDefault();

    const formData = new FormData(discoveryForm);
    const iterator = formData.entries();

    let data = {};
    let currentValue = iterator.next();
    while(!currentValue.done) {
        if (currentValue.value[1]) {
            data[currentValue.value[0]] = currentValue.value[1];
        }
        currentValue = iterator.next();
    }

    const responseData = await API.getGeoTags(data);
    const resultList = document.querySelector("#discoveryResults");
    resultList.innerHTML = "";

    for(let item of responseData) {
        createHTMLGeoTag(item);
    }

    return false;
}

taggingForm.onsubmit = handleTaggingFormSubmit;
discoveryForm.onsubmit = handleDiscoveryFormSubmit;

const createHTMLGeoTag = data => {
    const listItem = document.createElement("li");
    listItem.textContent = `${data.name} (${data.latitude || data.location.latitude},${data.longitude || data.location.longitude}) ${data.hashtag}`;

    const resultList = document.querySelector("#discoveryResults");
    resultList.appendChild(listItem);
}

/**
 * GeoTagApp Locator Modul
 */
var gtaLocator = (function GtaLocator(geoLocationApi) {

    // Private Member

    /**
     * Funktion spricht Geolocation API an.
     * Bei Erfolg Callback 'onsuccess' mit Position.
     * Bei Fehler Callback 'onerror' mit Meldung.
     * Callback Funktionen als Parameter übergeben.
     */
    var tryLocate = function(onsuccess, onerror) {
        if (geoLocationApi) {
            geoLocationApi.getCurrentPosition(onsuccess, function(error) {
                var msg;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        msg = "User denied the request for Geolocation.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        msg = "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        msg = "The request to get user location timed out.";
                        break;
                    case error.UNKNOWN_ERROR:
                        msg = "An unknown error occurred.";
                        break;
                }
                onerror(msg);
            });
        } else {
            onerror("Geolocation is not supported by this browser.");
        }
    };

    // Auslesen Breitengrad aus der Position
    var getLatitude = function(position) {
        return position.coords.latitude;
    };

    // Auslesen Längengrad aus Position
    var getLongitude = function(position) {
        return position.coords.longitude;
    };

    // Hier API Key eintragen
    var apiKey = "VsneSBNpdFlIkO6AXvEGw0CDFpnTnNQC";

    /**
     * Funktion erzeugt eine URL, die auf die Karte verweist.
     * Falls die Karte geladen werden soll, muss oben ein API Key angegeben
     * sein.
     *
     * lat, lon : aktuelle Koordinaten (hier zentriert die Karte)
     * tags : Array mit Geotag Objekten, das auch leer bleiben kann
     * zoom: Zoomfaktor der Karte
     */
    var getLocationMapSrc = function(lat, lon, tags, zoom) {
        zoom = typeof zoom !== 'undefined' ? zoom : 10;

        if (apiKey === "YOUR_API_KEY_HERE") {
            console.log("No API key provided.");
            return "images/mapview.jpg";
        }

        var tagList = "&pois=You," + lat + "," + lon;
        if (tags !== undefined) tags.forEach(function(tag) {
            tagList += "|" + tag.name + "," + tag.location.latitude + "," + tag.location.longitude;
        });

        var urlString = "https://www.mapquestapi.com/staticmap/v4/getmap?key=" +
            apiKey + "&size=600,400&zoom=" + zoom + "&center=" + lat + "," + lon + "&" + tagList;

        console.log("Generated Maps Url: " + urlString);
        return urlString;
    };

    return { // Start öffentlicher Teil des Moduls ...

        // Public Member

        readme: "Dieses Objekt enthält 'öffentliche' Teile des Moduls.",

        updateLocation: function() {
            const latitudeFields = ["tagging", "discovery"].map(
                type => document.querySelector(`#${type}Latitude`)
            );

            const longitudeFields = ["tagging", "discovery"].map(
                type => document.querySelector(`#${type}Longitude`)
            );

            const updateMapImage = (latitude, longitude) => {
                // Map image
                const mapElement = document.querySelector("#mapView");
                const imageUrl = getLocationMapSrc(latitude, longitude, JSON.parse(mapElement.getAttribute("data-tags")), 6);
                mapElement.setAttribute("src", imageUrl);
            }

            const handleSuccess = data => {
                const latitude = getLatitude(data);
                const longitude = getLongitude(data);

                latitudeFields.forEach(field => field.setAttribute("value", latitude));
                longitudeFields.forEach(field => field.setAttribute("value", longitude));

                updateMapImage(latitude, longitude);
            }

            const handleError = msg => alert(msg);

            if ([...latitudeFields, ...longitudeFields].some(field => field.getAttribute("value").length === 0)) {
                tryLocate(handleSuccess, handleError);
            } else {
                // Still need to load the image
                const latitude = latitudeFields[0].getAttribute("value");
                const longitude = longitudeFields[0].getAttribute("value");

                updateMapImage(latitude, longitude);
            }
        }

    }; // ... Ende öffentlicher Teil
})(GEOLOCATIONAPI);

/**
 * $(function(){...}) wartet, bis die Seite komplett geladen wurde. Dann wird die
 * angegebene Funktion aufgerufen. An dieser Stelle beginnt die eigentliche Arbeit
 * des Skripts.
 */
$(function() {
    gtaLocator.updateLocation();
});
