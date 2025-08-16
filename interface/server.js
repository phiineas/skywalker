const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.INTERFACE_PORT || 3000;

// serve static files
app.use(express.static(path.join(__dirname)));

// serve main interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`interface server running on port - ${PORT}`);
    console.log(`open http://localhost:${PORT} to access the interface`);
});
