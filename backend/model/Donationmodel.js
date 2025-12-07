const mongoose = require('mongoose');


const donationSchema = new mongoose.Schema({

  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShowAllCases', required: true }, 
  title: { 
        type: String, 
        required: true,          
        trim: true,
        maxlength: 100          
    },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'ILS' },


originalAmount: { type: Number, required: true },
    originalCurrency: { type: String, required: true, enum: ['ILS', 'JOD', 'USD', 'AED'] },


  donorInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    idcard: { type: String, required: true },
    anonymous: { type: Boolean }
  },
  paymentMethod: { type: String, required: true, enum: ['card', 'paypal', 'wallet', 'transfer'] },
transactionId: { type: String, required: true, unique: true },
    donationDate: { type: Date, default: Date.now },
    
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' }, // افتراضياً مكتمل بعد المحاكاة
  createdAt: { type: Date, default: Date.now },

   author: { 
 type: mongoose.Schema.Types.ObjectId,
         ref: 'User', 
        required: true
    },
    authorName: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Donation', donationSchema);