

const express = require('express');
const router = express.Router();
const DonationController = require('../controller/Donationcontroller');


const { protect, authorize } = require('./middleware/authMiddleware');

// إضافة تبرع جديد 
router.post('/', protect, DonationController.createDonation); // done

// جلب جميع التبرعات 
router.get('/', protect, authorize('admin') , DonationController.getAllDonations);  //done

// جلب تبرعات حالة معينة
router.get('/case/:caseId', protect, authorize('donor' , 'admin', 'needy') , DonationController.getDonationsByCase);  //done
 

// جلب تبرعات يوزر معين
 router.get('/user/:userId', protect, authorize('donor' , 'admin', 'needy') , DonationController.getDonationsByUser);





router.get('/csrf-token', (req, res) => {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf-token', csrfToken, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.json({ csrfToken });
});

module.exports = router;

