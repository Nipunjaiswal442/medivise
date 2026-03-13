const mongoose = require('mongoose');

const symptomSchema = new mongoose.Schema({
    name: { type: String, required: true },
    days: { type: String },
}, { _id: false });

const prescriptionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    timesPerDay: { type: String },
    dosage: { type: String },
}, { _id: false });

const patientSchema = new mongoose.Schema({
    // Custom generated ID like P-009, etc. Let's store it as customId or use it as string _id.
    // We'll use customId for compatibility
    customId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    condition: { type: String },
    lastVisit: { type: String },
    status: { type: String, enum: ['active', 'discharged', 'scheduled'], default: 'active' },
    consultationDuration: { type: Number, default: 0 },
    symptoms: [symptomSchema],
    prescriptions: [prescriptionSchema],
    aiReview: { type: String },
    userId: { type: String, required: true }, // Tie patient to the doctor/user
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
