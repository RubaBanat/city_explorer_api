'use strict';

const express = require('express');
require('dotenv').config();

const cors = require('cors');


const server = express();
server.use(cors());

const PORT = process.env.PORT;

server.get('/test',(req,res)=>{
    res.send('your server is working')
})

server.get('/location',(req,res)=>{
    const locationData = require('./data/location.json');
    // console.log(locationData);
    // console.log(locationData[0]);
    const locObj = new Location(locationData);
    res.send(locObj);
})

server.get('/weather',(req,res)=>{
    const weatherData = require('./data/weather.json');
    console.log(weatherData);
    let weather =[];
    weatherData.data.forEach(element =>{
    const weatherObj = new Weather(element);
    weather.push(weatherObj);

    })
    
    res.send(weather);
})

server.use('*',(req,res)=>{
    res.status(500).send('Sorry, something went wrong')
})

function Location (geoData){
    this.search_query = 'Lynnwood';
    this.formatted_query= geoData[0].display_name;
    this.latitude = geoData[0].lat;
    this.longitude = geoData[0].lon;
}

function Weather (data){
    this.forecast = data.weather.description;
    this.time = data.valid_date;

}

// [
//     {
//       "forecast": "Partly cloudy until afternoon.",
//       "time": "Mon Jan 01 2001"
//     },
//     {
//       "forecast": "Mostly cloudy in the morning.",
//       "time": "Tue Jan 02 2001"
//     },
//     ...
//   ]

server.listen(PORT, ()=>{
    console.log(`Listening on PORT ${PORT}`);
})