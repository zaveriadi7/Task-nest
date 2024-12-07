const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const router = express.Router();
const notifier = require('node-notifier');
notifier.notify('Message');

router.get('/register', (req, res) => {
    res.render('register');  
});

// Register route 
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
        [username, email, hashedPassword]
    );
    notifier.notify({
        title: 'Welcome to TaskNest!',
        message: 'Start creating your tasks!'
    });
    res.redirect('login');
});


router.get('/login', (req, res) => {
    notifier.notify({
        title: 'Hey There!',
        message: 'Welcome Back!'
      });
    res.render('login');  
});

// Login route 
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length > 0) {
        const user = result.rows[0];
        if (await bcrypt.compare(password, user.password)) {
            req.session.userId = user.id;
            notifier.notify({
                title: 'Hey There!',
                message: 'Welcome Back!'
              });
            return res.redirect('/tasks');
        }
        else{
            notifier.notify({
                title: 'Register First',
                message: 'Create a tasknest account first!'
              });
        }
    }
    notifier.notify({
        title: 'Hey There!',
        message: 'Welcome Back!'
      });
    res.redirect('/');
});

router.get('/delete', (req, res) => {
    res.render('delete'); 
});
router.post('/delete', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
        'delete from users where username= ($1)',
        [username]
    );
    notifier.notify({
        title: 'Account Deleted',
        message: 'Account Succesfully Deleted.'
      });
    res.redirect('login');
});
module.exports = router;

