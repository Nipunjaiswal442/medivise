const Patient = require('../models/Patient');

// @desc    Get all patients
// @route   GET /api/patients
// @access  Public (for now)
const getPatients = async (req, res, next) => {
    try {
        // Return all patients, sorted by newest first
        const patients = await Patient.find().sort({ createdAt: -1 });
        res.json({ success: true, count: patients.length, data: patients });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new patient
// @route   POST /api/patients
// @access  Public (for now)
const createPatient = async (req, res, next) => {
    try {
        // Get highest customId (P-XXX) to auto-increment
        const lastPatient = await Patient.findOne().sort({ createdAt: -1 });
        let nextNum = 9; // Start after P-008
        if (lastPatient && lastPatient.customId && lastPatient.customId.startsWith('P-')) {
            const num = parseInt(lastPatient.customId.split('-')[1], 10);
            if (!isNaN(num)) {
                nextNum = num + 1;
            }
        }
        const customId = `P-${String(nextNum).padStart(3, '0')}`;

        // Add required fields
        const patientData = {
            ...req.body,
            customId,
            userId: req.body.userId || 'anonymous_user', // mock userId
        };

        const patient = await Patient.create(patientData);
        res.status(201).json({ success: true, data: patient });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete patient
// @route   DELETE /api/patients/:id
// @access  Public (for now)
const deletePatient = async (req, res, next) => {
    try {
        const patient = await Patient.findOne({ customId: req.params.id });
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }
        await patient.deleteOne();
        res.json({ success: true, message: 'Patient deleted' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPatients,
    createPatient,
    deletePatient,
};
