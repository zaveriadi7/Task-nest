const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const pool = require('./config/db'); 

const app = express();
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});

const upload = multer({ storage: storage });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
}));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');


const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/task');

app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);

app.get('/', (req, res) => {
    res.render('index');
});


const cron = require('node-cron');
const { sendNotifications } = require('./notificationService');


cron.schedule('0 21 * * *', async () => {
    console.log('Running the notification task at 9 PM');
    await sendNotifications();
});


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const taskroutes = require('./routes/taskroutes');
app.use('/tasks', taskroutes);
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
module.exports = pool;