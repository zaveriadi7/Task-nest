const express = require('express');
const pool = require('../config/db');
const nodemailer = require('nodemailer')
const router = express.Router();
const multer = require('multer');
const path = require('path');
const notifier = require('node-notifier');
notifier.notify('Message');
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/auth/login');
}

router.get('/', isAuthenticated, async (req, res) => {
    try {
        // Fetchtas
        const tasksResult = await pool.query('SELECT * FROM tasks WHERE user_id = $1', [req.session.userId]);
        const tasks = tasksResult.rows;

        // Fetch files
        const taskIds = tasks.map(task => task.id);
        let files = [];
        if (taskIds.length > 0) {
            const filesResult = await pool.query('SELECT * FROM task_files WHERE task_id = ANY($1::int[])', [taskIds]);
            files = filesResult.rows;
        }

       
        const filesByTaskId = {};
        tasks.forEach(task => filesByTaskId[task.id] = null);  // Initialize empty values 
        files.forEach(file => {
            filesByTaskId[file.task_id] = file; // Associate the file
        });

        res.render('dashboard', { tasks, filesByTaskId });
    } catch (error) {
        console.error("Error fetching tasks and files:", error);
        res.status(500).send("Error fetching tasks and files.");
    }
});

router.post('/delete-task/:id', isAuthenticated, async (req, res) => {
    const taskId = req.params.id;
    try {
        await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [taskId, req.session.userId]);
        notifier.notify({
            title: 'Task Deleted!',
            message: 'Task deleted succesfully!'
        });
        res.redirect('/tasks');
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).send("Error deleting task.");
    }

});
// Update task
router.post('/update-task/:id', isAuthenticated, async (req, res) => {
    const taskId = req.params.id;
    const { status } = req.body; 

    try {
        await pool.query(
            'UPDATE tasks SET status = $1 WHERE id = $2 AND user_id = $3',
            [status, taskId, req.session.userId]
        );
        notifier.notify({
            title: 'Task updated',
            message: 'task updated to {status}'
        });
        res.redirect('/tasks');
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).send("Error updating task.");
    }
});
router.post('/send-email/:id', isAuthenticated, async (req, res) => {
    const taskId = req.params.id;
    const { recipientEmail } = req.body;

    try {
        // task details
        const result = await pool.query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [taskId, req.session.userId]);
        const task = result.rows[0];
        
        if (!task) {
            return res.status(404).send("Task not found");
        }
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'heytasknest@gmail.com',
            pass: 'akfg ndxd nfwa ihoc'   
            }
        });

        const mailOptions = {
            from: 'aditya.zaveri2021@vitbhopal.ac.in', 
            to: recipientEmail,           
            subject: `Task: ${task.title}`,
    text: `Hello there TaskNester, here are the details of the task:
    
    Title: ${task.title}
    Description: ${task.description}
    Due Date: ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
    Priority: ${task.priority}
    
    Please take note of this task.`, 
};

        await transporter.sendMail(mailOptions);
        notifier.notify({
            title: 'Mail sent!',
            message: 'Mail sent to recipient!'
        });
        res.redirect('/tasks');
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send("Error sending email");
    }
});
router.post('/add-task', isAuthenticated, async (req, res) => {
    const { title, description, dueDate, priority, completed } = req.body;
    
    // Convert to  boolean
    const isCompleted = completed === 'on'; // true if checked, false if not

    try {
        await pool.query(
            'INSERT INTO tasks (user_id, title, description, due_date, priority, completed) VALUES ($1, $2, $3, $4, $5, $6)',
            [req.session.userId, title, description, dueDate, priority, isCompleted]
        );
        notifier.notify({
            title: 'Task added!',
            message: 'Task added Succesfully!'
        });
        res.redirect('/tasks');
    } catch (error) {
        console.error("Error adding task:", error);
        res.status(500).send("Error adding task.");
    }
});

router.post('/update-status/:id', isAuthenticated, async (req, res) => {
    const taskId = req.params.id;
    const { status } = req.body; 

    try {
        await pool.query(
            'UPDATE tasks SET status = $1 WHERE id = $2 AND user_id = $3',
            [status, taskId, req.session.userId]
        );
        res.redirect('/tasks');
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).send('Internal Server Error');
    }
});
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  });
const upload = multer({ storage: storage }); 

router.post('/:taskId/upload-file', isAuthenticated, upload.single('file'), async (req, res) => {
    const { taskId } = req.params;
    const { originalname, path } = req.file;

    try {
      
        const existingFile = await pool.query('SELECT * FROM task_files WHERE task_id = $1 LIMIT 1', [taskId]);

        if (existingFile.rows.length > 0) {
            await pool.query(
                'UPDATE task_files SET file_name = $1, file_path = $2 WHERE task_id = $3',
                [originalname, path, taskId]
            );
        } else {

            await pool.query(
                'INSERT INTO task_files (task_id, file_name, file_path) VALUES ($1, $2, $3)',
                [taskId, originalname, path]
            );
        }
        notifier.notify({
            title: 'File added!',
            message: 'File added Succesfully!'
        });
        res.redirect('/tasks');
    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).send("Error uploading file.");
    }
});


module.exports = router;



