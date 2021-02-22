'use strict';

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');

require('dotenv').config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get('/', handleHomeRoute);
app.get('/location', handlerLocation);
app.get('/weather', handlerWeather);
app.get('/parks', handlePark);
app.get('*', notFoundRouteHandler);
app.use(errorHandler);

function handleHomeRoute(req, res) {
    res.status(200).send('This is Home page!');
}

function notFoundRouteHandler(req, res) {
    res.status(404).send('Not Found');
}

function errorHandler(error, req, res) {
    res.status(500).send(error);
}

function handlerLocation(req, res) {

    let city = req.query.city;
    locData(city)
        .then(locationData => {
            res.status(200).json(locationData);
        })
}

function locData(city) {
    let key = process.env.LOCATION_KEY;
    let url = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json`;

    return superagent.get(url)
        .then(data => {
            let locationData = new Location(city, data.body[0]);
            return locationData;
        })
}

function handlerWeather(req, res) {
    let KEY = process.env.WEATHER_KEY;
    let search_query = req.query.search_query;
    let url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${search_query}&key=${KEY} `;

    superagent.get(url)
        .then(element => {
            let weatherData = element.body.data;
            let weatherArr = weatherData.map(value => {
                return new Weather(value);
            })
            res.status(200).send(weatherArr);
        })
        .catch(() => {
            res.status(500).send('Sorry something went really wrong!!');
        })
}

function handlePark(req, res) {
    let key = process.env.PARK_KEY;
    const city = req.query.search_query;
    let url =  `https://developer.nps.gov/api/v1/parks?limit=10&q=${city}&api_key=${key}&limit=2`;

    superagent.get(url)
        .then(parkData => {
            let parkArr = parkData.body.data.map(val => {
                console.log(new Park(val));
                return new Park(val);
            })
            res.status(200).send(parkArr);
        })
        .catch(() => {
            res.status(500).send('Sorry something went wrong!!');
        })
}

function Location(city, geoData) {
    this.search_query = city;
    this.formatted_query = geoData.display_name;
    this.latitude = geoData.lat;
    this.longitude = geoData.lon;
}

function Weather(day) {
    this.forecast = day.weather.description;
    this.time = new Date(day.valid_date).toDateString();
}

function Park(data) {
    this.name = data.name;
    this.address = Object.values(data.addresses[0]).join(' ');
    this.fee = `0.00`;
    this.description = data.description;
    this.url = data.url;
}

app.listen(PORT, () => console.log(`App is listening on ${PORT}`));