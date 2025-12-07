

const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt= require("jsonwebtoken");

const mongoose = require('mongoose');
const ShowAllCases =require("../model/ShowAllCasessmodel");
const { validationResult } = require("express-validator");


/*=======================================================================================================*/

exports.getCaseDetails = async (req, res) => {
    try {
        const caseId = req.params.id;  

        const caseData = await ShowAllCases.findById(caseId);

        if (!caseData) {
            return res.status(404).json({ message: 'Case not found' });
        }
        if (caseData.status !== 'approved') {
            return res.status(403).json({ message: 'Case is not approved yet' });
        }

        const formattedData = {
            id: caseData._id,  
            title: caseData.title,
            image: caseData.image,
            total: caseData.total,
            donated: caseData.donated,
            donationsCount: caseData.donationsCount,
            publishDate: caseData.publishDate ? caseData.publishDate.toISOString().split('T')[0] : null,  
            deadline: caseData.deadline ? caseData.deadline.toISOString().split('T')[0] : null,
            description: caseData.description,
            otherDescription: caseData.otherDescription,
            type: caseData.type,
            currency: caseData.currency,
            status: caseData.status,
            authorName: caseData.authorName
        };

        res.json(formattedData);
    } catch (error) {
        console.error('Error fetching case details:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
