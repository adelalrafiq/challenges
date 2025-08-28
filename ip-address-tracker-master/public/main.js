"use strict";

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

// Custom marker
const myIcon = L.icon({
    iconUrl: "./images/icon-location.svg",
    iconSize: [30, 40],
    iconAnchor: [15, 40],
});

let marker;
let deviceIP = "";

function updateMap(geoLocation) {
    const { lat, lng } = geoLocation;
    map.setView([lat, lng], 18);
    if (marker) {
        marker.setLatLng([lat, lng]);
    } else {
        marker = L.marker([lat, lng], { icon: myIcon }).addTo(map);
    }
}

function updateInfoCard(ip, locationText, timezone, isp) {
    ipEl.textContent = ip || "";
    locationEl.textContent = locationText || "";
    timezoneEl.textContent = timezone || "";
    ispEl.textContent = isp || "";
}

async function getAddressFromCoords(lat, lng) {
    const url = `/api/reverse-geocode?lat=${lat}&lng=${lng}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
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

async function fetchIPData(ipOrDomain = "") {
    const url = `/api/ipinfo${ipOrDomain ? `?ip=${ipOrDomain}` : ""}`;
    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.code) {
            alert(data.messages || "Invalid IP/Domain");
            return;
        }

        const apiLocation = `${data.location.city || ""}, ${data.location.region || ""} ${data.location.postalCode || ""}`;
        const geoLocation = { lat: data.location.lat, lng: data.location.lng };

        if (data.ip === deviceIP) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async position => {
                    const myGeo = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    updateMap(myGeo);
                    const customLocation = await getAddressFromCoords(myGeo.lat, myGeo.lng);
                    updateInfoCard(
                        data.ip,
                        customLocation,
                        `UTC${data.location.timezone}`,
                        data.isp
                    );
                });
            }
        } else {
            updateMap(geoLocation);
            updateInfoCard(
                data.ip,
                apiLocation,
                `UTC${data.location.timezone}`,
                data.isp
            );
        }

    } catch (err) {
        console.error("Error fetching IP data", err);
        alert("Something went wrong. Check your API key.");
    }
}

async function loadDeviceData() {
    try {
        const res = await fetch(`/api/ipinfo`);
        const data = await res.json();

        deviceIP = data.ip;

        const timezone = `UTC${data.location.timezone}`;
        const isp = data.isp;

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async position => {
                const geoLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                updateMap(geoLocation);

                const customLocation = await getAddressFromCoords(geoLocation.lat, geoLocation.lng);

                updateInfoCard(deviceIP, customLocation, timezone, isp);

            }, err => {
                console.warn("Geolocation error:", err);
                updateMap({ lat: data.location.lat, lng: data.location.lng });
                updateInfoCard(
                    deviceIP,
                    `${data.location.city || ""}, ${data.location.region || ""} ${data.location.postalCode || ""}`,
                    timezone,
                    isp
                );
            });
        }
    } catch (err) {
        console.error("Error loading device data:", err);
    }
}

loadDeviceData();

button.onclick = () => {
    const query = input.value.trim();
    if (!query) return;
    fetchIPData(query);
    input.value = "";
}

input.onkeyup = (e) => {
    if (e.key !== "Enter") return;
    const query = input.value.trim();
    if (!query) return;
    fetchIPData(query);
    input.value = "";
}