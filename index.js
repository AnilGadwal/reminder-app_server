require('dotenv').config();
const express = require('express');
const helmet = require('helmet'); // Import helmet package
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const port = process.env.PORT;
const app = express();

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "client")));

const base_url = process.env.BASE_API;
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'img.example.com'],
    },
  })
);

app.use(base_url, userRoutes);
app.use(base_url, eventRoutes);

app.get('/', (req, res) => {
  res.send("Welcome to Fhynix server homepage");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
