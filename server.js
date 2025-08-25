const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});
app.get('/clientes', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/clientes.html'));
});
app.get('/empleados', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/empleados.html'));
});
app.get('/servicios', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/servicios.html'));
});
app.get('/facturacion', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/facturacion.html'));
});
const carpetas = ['uploads/facturas', 'uploads/conformes'];
carpetas.forEach(carpeta => {
    const fullPath = path.join(__dirname, carpeta);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Carpeta creada: ${carpeta}`);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});