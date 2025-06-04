// pieces.routes.js
const express = require('express');
const router = express.Router();
const piecesController = require('../../controllers/parts/piece.controller');

router.get('/', piecesController.getPieces);
router.get('/search', piecesController.searchPieces);

module.exports = router;