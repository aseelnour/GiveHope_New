
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const secretKey = process.env.ENCRYPTION_KEY;
// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(__dirname));

// static files (serve frontend folder)
app.use(express.static(path.join(__dirname, '../frontend')));

// serve images 
app.use('/images', express.static(path.join(__dirname, '../frontend/images')));

// routes 

app.use('/firebase-messaging-sw.js', express.static(path.join(__dirname, '../frontend/pages/firebase-messaging-sw.js')));

const storiesroute = require('./route/storiesroute');
app.use('/api/stories', storiesroute);

const casedetailsroute = require('./route/casedetailsroute');
app.use('/api/casedetails', casedetailsroute);

const donationRoutes = require('./route/donationRoutes');
app.use('/api/donations', donationRoutes); 

const allcasesroute = require('./route/ShowAllCasessroute');
app.use('/api/ShowAllCases', allcasesroute);

const HomePage = require('./route/HomePageroute');
app.use('/api/HomePage', HomePage);

const authRoutes = require('./route/authRoutes');
app.use('/api/auth', authRoutes);

app.use('/api/notifications', require('./route/notifications'));


// root page 
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/HomePage.html'));
});


app.get('/api/csrf-token', (req, res) => {
    res.json({ 
        csrfToken: 'csrf-token-' + Math.random().toString(36).substr(2)
    });
})


// mongodb connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/givehope';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connection to local database successful'))
  .catch(err => console.log('❌ Database connection failed: ', err));

mongoose.connection.once('open', () => {
  console.log('📦 Database is now available!');
});



// start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
