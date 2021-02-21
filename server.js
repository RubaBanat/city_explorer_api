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
    // console.log(locData[0]);
    const locObj = new Location(locationData);
})


function Location (geoData){
    this.search_query = 'Lynnwood';
    this.formatted_query= geoData[0].display_name;
    this.latitude = geoData[0].lat;
    this.longitude = geoData[0].lon;
}



server.listen(PORT, ()=>{
    console.log(`Listening on PORT ${PORT}`);
})