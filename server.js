'use strict';

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

require('dotenv').config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

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
    let key = process.env.LOCATION_KEY;
    let url = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json`;
    const SQL = 'SELECT * FROM locations WHERE search_query = $1';
    const safeData = [city];
    client.query(SQL, safeData)
        .then((result) => {
            if (result.rows.length > 0) {
                res.status(200).json(result.rows[0]);
                console.log('FROM DATABASE', result.rows[0]);
            } else {
                superagent(url)
                    .then((data) => {
                        console.log('FROM API');
                        const geoData = data.body;
                        const locationData = new Location(city, geoData);
                        const SQL = `INSERT INTO locations (search_query , formatted_query ,latitude, longitude) VALUES($1,$2,$3,$4) RETURNING *`;
                        const saveData = [
                            locationData.search_query,
                            locationData.formatted_query,
                            locationData.latitude,
                            locationData.longitude
                        ];
                        client.query(SQL, saveData).then((result) => {
                            // console.log(result.rows);
                            res.status(200).json(result.rows[0]);
                        })
                    })
            }
        })
        .catch((error) => errorHandler(error, req, res));
};

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
    let city = req.query.search_query;
    let url = `https://developer.nps.gov/api/v1/parks?limit=3&q=${city}&api_key=${key}`;

    superagent.get(url)
        .then(parkData => {
            let parkArr = parkData.body.data.map(val => {
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
    this.formatted_query = geoData[0].display_name;
    this.latitude = geoData[0].lat;
    this.longitude = geoData[0].lon;
}

function Weather(day) {
    this.forecast = day.weather.description;
    this.time = new Date(day.valid_date).toDateString();
}

function Park(data) {
    this.name = data.name;
    this.address = Object.values(data.addresses[0]).join(' ');
    this.fee = data.entranceFees[0].cost || '0.00';
    this.description = data.description;
    this.url = data.url;
}

client.connect()
    .then(() => {
        app.listen(PORT, () =>
            console.log(`listening on ${PORT}`)
        );
    })