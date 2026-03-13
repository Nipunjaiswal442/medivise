const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medivise');
        console.log(`\n📦 MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        console.error(`\n💡 Hint: Make sure MongoDB is running locally on port 27017, or add MONGO_URI to your backend/.env file.`);
        process.exit(1);
    }
};

module.exports = connectDB;
