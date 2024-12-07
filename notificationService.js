const pool = require('./config/db.js'); 
const nodemailer = require('nodemailer'); 


const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: 'heytasknest@gmail.com',
            pass: 'akfg ndxd nfwa ihoc'
    }
});

async function sendNotifications() {
    try {
        // Query to get all tasks for each user
        const result = await pool.query(`
            SELECT users.email, users.username, COUNT(tasks.id) AS total_tasks
            FROM tasks
            JOIN users ON tasks.user_id = users.id
            GROUP BY users.email, users.username
        `);

        const usersWithTasks = result.rows;

        // Loop through users and send notifs 
        for (const user of usersWithTasks) {
            if (user.total_tasks > 0) {
                await sendEmailNotification(user.email, user.username, user.total_tasks);
            }
        }

    } catch (error) {
        console.error('Error sending notifications:', error);
    }
}

async function sendEmailNotification(email, name, taskCount) {
    const message = {
        from: 'heytasknest@gmail.com',
        to: email,
        subject: 'You have Pending Tasks!',
        text: `Hello ${name},\n\nYou have ${taskCount} tasks pending! Don't forget to review them!\n\nBest,\nTaskNest`
    };

    try {
        await transporter.sendMail(message);
        console.log(`Notification sent to ${email}`);
    } catch (error) {
        console.error(`Failed to send notification to ${email}:`, error);
    }
}

module.exports = { sendNotifications };
