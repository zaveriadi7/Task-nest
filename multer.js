const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',       
    host: 'localhost',           
    database: 'task_manager',     
    password: 'tiger',   
    port: 5432,                  
});


// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);  // Create uploads folder 
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));  // Add timestamp to file
  },
});

const upload = multer({ storage: storage });
// Route to handle file upload
router.post('tasks/:id/upload', upload.single('file'), async (req, res) => {
  const taskId = req.params.id;
  const filePath = `uploads/${req.file.filename}`;

  const query2 = 'INSERT INTO task_files (task_id, file_name, file_path) VALUES ($1, $2, $3)';
  await pool.query(query2, [taskId, req.file.originalname, filePath]);

  res.redirect('/tasks');
});

module.exports = router;
