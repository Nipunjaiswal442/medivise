const { Router } = require('express');
const { getPatients, createPatient, deletePatient } = require('../controllers/patient.controller');

const router = Router();

router.get('/', getPatients);
router.post('/', createPatient);
router.delete('/:id', deletePatient);

module.exports = router;
