require('dotenv').config();
const express = require('express');
const app = express();
const port = 3001;
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path')

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "client")))
const base_url = process.env.BASE_API;

const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');

app.use(base_url, userRoutes);
app.use(base_url, eventRoutes);

app.get('/', (res, req)=>{
  res.send("Welcome to Fhynix server homepage");
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
