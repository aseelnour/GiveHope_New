
const check = require("express-validator").check


const ShowAllCase = require('../model/ShowAllCasessmodel');
const Story = require('../model/storiesmodel'); 
const express = require('express');
const router = express.Router();
const homeController = require('../controller/HomePagecontroller');

// routes للحالات العاجلة
router.get('/urgent-cases', homeController.getUrgentCases);

// routes للإحصائيات
router.get('/stats', homeController.getHomeStats);

// routes للقصص الناجحة
router.get('/success-stories', homeController.getSuccessStories);





module.exports = router;