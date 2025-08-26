"use strict";
const MAPBOX_TOKEN = "pk.eyJ1IjoiYWRlbGFscmFmaXEiLCJhIjoiY2x4MDEwdmUyMDJ3YTJrczd2YmRvbGc1eiJ9.JUtRj0PX_ZSKzBvt9xagMg";
const apiKey = "at_dUD4eGyM10GRGmidYUpXjlASNbjBH";
const input = document.querySelector("input");
const button = document.getElementById("arrow");

// Info card elements
const ipEl = document.getElementById("ip");
const locationEl = document.getElementById("location");
const timezoneEl = document.getElementById("timezone");
const ispEl = document.getElementById("isp");
var map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Custom marker icon
const myIcon = L.icon({
    iconUrl: "./images/icon-location.svg",
    iconSize: [30, 40],
    iconAnchor: [15, 40],
});

let marker;
let deviceIP = "";
let deviceGeoLocation = null;

function updateMap(geoLocation) {
    const { lat, lng } = geoLocation;
    map.setView([lat, lng], 18);
    if (marker) {
        marker.setLatLng([lat, lng]);
    } else {
        marker = L.marker([lat, lng], { icon: myIcon }).addTo(map);
    }
}

function updateInfoCard(ipData, customLocationText = "") {
    ipEl.textContent = ipData.ip;
    timezoneEl.textContent = `UTC${ipData.location.timezone}`;
    ispEl.textContent = ipData.isp;
    if (customLocationText) {
        locationEl.textContent = customLocationText;
    } else {
        locationEl.textContent = `${ipData.location.city}, ${ipData.location.region} ${ipData.location.postalCode}`;
    }
}
async function getAddressFromCoords(lat, lng) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log({ data });

        if (data && data.features.length > 0) {
            const city = data.features.find(f => f.place_type.includes("place"))?.text || "";
            const region = data.features.find(f => f.place_type.includes("region"))?.text || "";
            const postal = data.features.find(f => f.place_type.includes("postcode"))?.text || "";
            return `${city}, ${region} ${postal}`;
        }
    } catch (err) {
        console.error("Error in reverse geocoding:", err);
    }
    return "";
}
// Fetch IP data
async function fetchIPData(ipOrDomain = "", useApiLocation = false, customLocationText = "") {
    const url = `https://geo.ipify.org/api/v1?apiKey=${apiKey}${ipOrDomain ? `&ipAddress=${ipOrDomain}` : ""}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.code) {
            alert(data.messages || "Invalid IP/Domain");
            return;
        }
        if (useApiLocation) {
            const geoLocation = { lat: data.location.lat, lng: data.location.lng };
            updateMap(geoLocation);
            updateInfoCard(data);
        } else {
            updateInfoCard(data, customLocationText);
            if (deviceGeoLocation) updateMap(deviceGeoLocation);
        }
    } catch (err) {
        console.error("Error fetching IP data", err);
        alert("Something went wrong. Check your API key.");
    }
}

function getDeviceLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async position => {
            deviceGeoLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            updateMap(deviceGeoLocation);
            const customLocation = await getAddressFromCoords(deviceGeoLocation.lat, deviceGeoLocation.lng);
            fetchIPData("", false, customLocation);
        },
            (err) => {
                console.warn("Geolocation error:", err);
                fetchIPData("", true);
            }
        );
    } else {
        alert("Geolocation is not supported");
        fetchIPData("", true);
    }
}

async function getDeviceIP() {
    try {
        const res = await fetch(`https://geo.ipify.org/api/v1?apiKey=${apiKey}`);
        const data = await res.json();
        deviceIP = data.ip;
        console.log("Device IP:", deviceIP);
    } catch (err) {
        console.error("Error getting device IP:", err);
    }
}

getDeviceIP();
getDeviceLocation();

// Search on button click
button.onclick = () => {
    const query = input.value.trim();
    if (!query) return;
    if (query === deviceIP) {
        getDeviceLocation();
    } else {
        fetchIPData(query, true);
    }
    input.value = "";
}

input.onkeyup = (e) => {
    if (e.key !== "Enter") return;
    const query = input.value.trim();
    if (!query) return;
    if (query === deviceIP) {
        getDeviceLocation();
    } else {
        fetchIPData(query, true);
    }
    input.value = "";
}
