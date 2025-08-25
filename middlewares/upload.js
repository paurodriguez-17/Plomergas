// middlewares/upload.js
const multer = require('multer');
const path = require('path');

// Función genérica para crear un uploader por carpeta
function createUploader(destino) {
    return multer({
        storage: multer.diskStorage({
            destination: function (req, file, cb) {
                cb(null, path.join(__dirname, `../uploads/${destino}`));
            },
            filename: function (req, file, cb) {
                const uniqueName = Date.now() + '-' + file.originalname;
                cb(null, uniqueName);
            }
        }),
        fileFilter: function (req, file, cb) {
            const ext = path.extname(file.originalname);
            if (ext !== '.pdf') return cb(new Error('Solo se permiten archivos PDF'));
            cb(null, true);
        },
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB
    });
}

// ✅ Exportaciones correctas
module.exports = {
    uploadFactura: createUploader('facturas').single('archivo'),
    uploadConforme: createUploader('conformes').single('archivo')
};
