
const mongoose = require('mongoose');

const ShowAllCasessSchema = new mongoose.Schema({

  title: { type: String, required: true },
  type: { type: String, required: true, enum: ['health', 'education', 'living', 'orphans', 'Emergency'] }, 
  image: { type: String,  },
  total: { type: Number, required: true },
   currency: {type: String, default: 'ILS' },
  donated: { type: Number, default: 0 },
  publishDate: { type: Date, default: null},
   email: { type: String, required: true },
     donationsCount: { type: Number, default: 0 },
  deadline: { 
        type: Date, 
        required: true,
        validate: {
            validator: function(value) {
                return !isNaN(value.getTime());},  message: 'تاريخ غير صالح'} },

  description: { type: String, required: true },
  otherDescription: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected' , 'funded'], default: 'pending' },
  rejectionReason: { type: String,  default: null },
    author: {
         type: mongoose.Schema.Types.ObjectId,
          ref: 'User', 
          required: true
      },
      authorName: {
          type: String,
          required: true
      }
}, { timestamps: true });

module.exports = mongoose.model('ShowAllCases', ShowAllCasessSchema);