const express = require('express');
const importController = require("../../controllers/importation.controller");
const {   create_article_importation, importExcel, getImports, getImportDetails } = require('../../controllers/parts/importExcel.controller');

const router = express.Router();

// router.get('/' , find_by_pagination);
router.post('/' , importExcel);
router.post('/local' , create_article_importation);
// imports.routes.js

router.get('/', getImports);
router.get('/:id/details', getImportDetails);
router.delete("/:id/annuler", importController.annulerImport);

// module.exports = router;

module.exports = router;