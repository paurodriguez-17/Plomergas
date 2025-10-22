const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public'))); // Donde estará index.html

const agendaRoutes = require('./routes/agenda');
app.use('/api/agenda', agendaRoutes);
const clientesRoutes = require('./routes/clientes');
app.use('/api/clientes', clientesRoutes);
const presupuestosRoutes = require('./routes/presupuestos');
app.use('/api/presupuestos', presupuestosRoutes);
const empleadosRoutes = require('./routes/empleados');
app.use('/api/empleados', empleadosRoutes);
const serviciosRoutes = require('./routes/servicios');
app.use('/api/servicios', serviciosRoutes);
const cuentasRoutes = require('./routes/cuentas');
app.use('/api/cuentas', cuentasRoutes);

// 👉 Servir archivos HTML desde "views" si no lo hiciste ya
app.use(express.static(path.join(__dirname, 'public')));

// Para views desde rutas raíz
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views/index.html')));
app.get('/clientes', (req, res) => res.sendFile(path.join(__dirname, 'views/clientes.html')));
app.get('/empleados', (req, res) => res.sendFile(path.join(__dirname, 'views/empleados.html')));
app.get('/servicios', (req, res) => res.sendFile(path.join(__dirname, 'views/servicios.html')));
app.get('/facturacion', (req, res) => res.sendFile(path.join(__dirname, 'views/facturacion.html')));
app.get('/agenda', (req, res) => res.sendFile(path.join(__dirname, 'views/agenda.html')));

// ❗ Para soportar index.html al instalar PWA en Android o iOS:
app.get('/index.html', (req, res) => {
    res.redirect('/');
});
app.use('/uploads/presupuestos', express.static(path.join(__dirname, 'uploads/presupuestos')));
// Crear carpetas necesarias
const carpetas = ['uploads/facturas', 'uploads/conformes'];
carpetas.forEach(carpeta => {
    const fullPath = path.join(__dirname, carpeta);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Carpeta creada: ${carpeta}`);
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
