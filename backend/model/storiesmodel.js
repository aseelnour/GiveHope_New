

const mongoose = require("mongoose");

const storiesSchema = new mongoose.Schema({   
 

 title: {
        type: String,
        required: true,
        
    },
    
 type: {
        type: String,
        required: true,  // مثل: "مستفيد" أو "متبرع"
    },

 category: {
        type: String,
        required: true,  // مثل: "مساعدة صحية"
    }, 
    
    
    time: {
        type: String, 
    },
    image: {
        type: String,  
    },
    content: {
        type: String,
        required: true  
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending' 
    },
    createdAt: {
        type: Date,
        default: Date.now
    },


   donations: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'ILS' // عملة افتراضية
    },
    views: {
        type: Number,
        default: 0
    },
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
  
  
module.exports = mongoose.model("Story", storiesSchema);





