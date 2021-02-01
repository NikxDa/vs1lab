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

    static getGeoTags(data = null, offset = 0, count = 10) {
        let url = `/api/geotags?${data ? new URLSearchParams(data).toString() : ""}&offset=${offset}&count=${count}`;
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
const discoveryClear = document.querySelector(".discovery__clear");

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

    await loadTagList(true);

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

    setFilter(data);
    await loadTagList();

    discoveryClear.classList.add("discovery__clear--active");
    return false;
}

let currentPage = 1;
let itemsPerPage = 10;
let loadedTags = [];
let totalItemCount = null;
let currentFilter = null;

const setFilter = newFilter => {
    currentFilter = newFilter;
    loadedTags = [];
    currentPage = 1;
    totalItemCount = null;
}

const loadTagList = async (forceReload = false) => {
    if ((loadedTags.length < currentPage * itemsPerPage && loadedTags.length < totalItemCount) || totalItemCount === null || forceReload) {
        const responseData = await API.getGeoTags(currentFilter, (currentPage - 1) * itemsPerPage, itemsPerPage);
        totalItemCount = responseData.totalItemCount;
    
        for (let item of responseData.items) {
            if (!loadedTags.find(itm => itm.id === item.id)) {
                loadedTags.push(item);
            }
        }
    }

    renderTagList();
}

const renderTagList = () => {
    const resultWrapper = document.querySelector("#discoveryResults");

    const resultList = resultWrapper.querySelector(".discovery__list");
    resultList.innerHTML = "";

    const createHTMLGeoTag = data => {
        const listItem = document.createElement("li");
        listItem.textContent = `${data.name} (${data.latitude || data.location.latitude},${data.longitude || data.location.longitude}) ${data.hashtag}`;
        listItem.setAttribute("data-id", data.id);
    
        listItem.addEventListener("click", handleDelete);
        resultList.appendChild(listItem);
    }

    const activeOffset = (currentPage - 1) * itemsPerPage;
    for (let item of loadedTags.slice(activeOffset, activeOffset + itemsPerPage)) {
        createHTMLGeoTag(item);
    }

    updatePagination();
}

const nextPage = () => {
    if (totalItemCount !== null && currentPage * itemsPerPage < totalItemCount) {
        currentPage++;
        loadTagList();
    }
}

const previousPage = () => {
    if (totalItemCount !== null && currentPage > 1) {
        currentPage--;
        loadTagList();
    }
}

const paginationNext = document.querySelector("#paginationNext");
const paginationPrev = document.querySelector("#paginationPrev");
const paginationCurrent = document.querySelector("#paginationCurrent");

paginationNext.onclick = nextPage;
paginationPrev.onclick = previousPage;

const updatePagination = () => {
    if (totalItemCount !== null && currentPage === 1) {
        paginationPrev.setAttribute("disabled", true);
    } else {
        paginationPrev.removeAttribute("disabled");
    }

    if (totalItemCount !== null && currentPage * itemsPerPage >= totalItemCount) {
        paginationNext.setAttribute("disabled", true);
    } else {
        paginationNext.removeAttribute("disabled");
    }

    if (totalItemCount === null) {
        paginationCurrent.textContent = "Loading...";
    } else {
        paginationCurrent.textContent = `Page ${currentPage} of ${Math.ceil(totalItemCount / itemsPerPage)}`;
    }
}

const handleDiscoveryClear = async evt => {
    evt.preventDefault();

    discoveryClear.classList.remove("discovery__clear--active");
    currentFilter = null;

    loadTagList();

    return false;
}

const handleDelete = async e => {
    const element = e.target;
    const id = element.getAttribute("data-id");

    if (id && confirm("Are you sure you want to delete this event?")) {
        await API.deleteGeoTag(id);
        element.parentNode.removeChild(element);
    }
}

// Add delete listeners
document.querySelectorAll(".discovery__results li").forEach(el => el.addEventListener("click", handleDelete));

taggingForm.onsubmit = handleTaggingFormSubmit;
discoveryForm.onsubmit = handleDiscoveryFormSubmit;
discoveryClear.onclick = handleDiscoveryClear;

loadTagList();

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
