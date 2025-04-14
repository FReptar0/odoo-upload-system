// Si usas dotenv para variables de entorno (opcional)
require('dotenv').config();

const fs = require('fs');
const xmlrpc = require('xmlrpc');

// Variables de conexión (ajústalas a tu instancia)
const ODOO_HOST = process.env.ODOO_HOST 
const ODOO_DB = process.env.ODOO_DB 
const ODOO_USER = process.env.ODOO_USER 
const ODOO_PASS = process.env.ODOO_PASS 

// Datos del archivo y carpeta en Documentos
const PDF_FILE_NAME = 'mi_documento.pdf';
const pdfData = fs.readFileSync(PDF_FILE_NAME, { encoding: 'base64' });

// Ajusta esta carpeta al ID real en tu app Documentos
const FOLDER_ID = 1;  // Ejemplo: 1 o el que corresponda

// 1) Cliente XML-RPC para autenticar
const common = xmlrpc.createClient({
    url: ODOO_HOST + '/xmlrpc/2/common',
});

// 2) Autenticación
common.methodCall('authenticate', [ODOO_DB, ODOO_USER, ODOO_PASS, {}], (err, uid) => {
    if (err) {
        console.error('Error al autenticar:', err);
        return;
    }
    if (!uid) {
        console.error('Credenciales inválidas o problemas de conexión');
        return;
    }
    console.log('Autenticación exitosa. UID:', uid);

    // 3) Cliente para llamadas a modelos
    const models = xmlrpc.createClient({
        url: ODOO_HOST + '/xmlrpc/2/object',
    });

    // 4) Crear primero el adjunto en ir.attachment
    const attachmentVals = {
        name: PDF_FILE_NAME,      // Nombre que tendrá el adjunto
        datas: pdfData,           // PDF en base64
        mimetype: 'application/pdf', // Opcional, pero recomendado
    };

    models.methodCall('execute_kw', [
        ODOO_DB,
        uid,
        ODOO_PASS,
        'ir.attachment',     // modelo
        'create',            // método
        [attachmentVals],    // datos a crear
    ], (err2, attachmentId) => {
        if (err2) {
            console.error('Error creando el ir.attachment:', err2);
            return;
        }
        console.log('Adjunto creado en ir.attachment con ID:', attachmentId);

        // 5) Crear el documento en la app Documentos con el attachment_id
        const documentVals = {
            name: PDF_FILE_NAME,   // Cómo se llama el documento en Documentos
            folder_id: FOLDER_ID,  // La carpeta de Documentos donde se guardará
            attachment_id: attachmentId, // Se asocia el adjunto que acabamos de crear
        };

        models.methodCall('execute_kw', [
            ODOO_DB,
            uid,
            ODOO_PASS,
            'documents.document',  // modelo de la app Documentos
            'create',              // método
            [documentVals],        // datos a crear
        ], (err3, documentId) => {
            if (err3) {
                console.error('Error creando el documento en Documentos:', err3);
                return;
            }
            console.log('Documento creado en la app Documentos. ID:', documentId);
        });
    });
});
