const mongoose = require('mongoose');

const boxSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    name: String,
    description: String,
    imageUrl: String,
    websiteUrl: String
});

const Box = mongoose.model('Box', boxSchema);

module.exports = Box;
