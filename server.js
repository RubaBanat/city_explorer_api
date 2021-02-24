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
app.get('/movies', handleMovies);
app.get('/yelp' , handleYelp);

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
                res.status(200).send(result.rows[0]);
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
                            res.status(200).send(result.rows[0]);
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
    let url = `https://developer.nps.gov/api/v1/parks?limit=6&q=${city}&api_key=${key}`;

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

function handleMovies(req, res) {
    let key = process.env.MOVIES_KEY;
    let city = req.query.search_query;
    let url = `https://api.themoviedb.org/3/search/movie/?api_key=${key}&query=${city}`;

    superagent.get(url)
        .then(movieData => {
            let movies = movieData.body.results.map(val => {
                return new Movie(val);
            })
            res.status(200).send(movies);
        })
        .catch(() => {
            res.status(500).send('Sorry there is something wrong!!');
        })
}

function handleYelp (req ,res){
    let key = process.env.YELP_KEY;
    let city = req.query.search_query;
    const page = req.query.page;
    const pageNum = 5;
    const start = ((page -1)* pageNum +1);
    let url  = `https://api.yelp.com/v3/businesses/search?location=${city}&limit=${pageNum}&offset=${start}`;

    superagent.get(url)
    .set({ "Authorization": `Bearer ${key}` })
    .then(yelpData =>{
        let yelpArr = yelpData.body.businesses.map(element =>{
            return new Yelp (element);
    })
    res.status(200).send(yelpArr);
})
    .catch(() => {
        res.status(500).send('There is something wrong!!');
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

function Movie(movie) {
    this.title = movie.title;
    this.overview = movie.overview;
    this.average_votes = movie.vote_average;
    this.total_votes = movie.vote_count;
    this.image_url =  `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
    this.popularity = movie.popularity;
    this.released_on = movie.released_on;
}

function Yelp (data) {
    this.name = data.name;
    this.image_url = data.image_url;
    this.price = data.price;
    this.rating = data.rating;
    this.url = data.url;
}

client.connect()
    .then(() => {
        app.listen(PORT, () =>
            console.log(`listening on ${PORT}`)
        );
    })