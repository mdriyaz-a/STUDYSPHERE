const express = require('express');
const path = require('path');
const http = require('http');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const socketio = require('socket.io');
const formatMessage = require('./models/messages');
const {
    joinUser,
    getCurrentUser,
    userLeaveChat,
    roomUsers,
} = require('./models/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const PORT = process.env.PORT || 3002;

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/my_database', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Error connecting to MongoDB:', err));

// Models
const User = require('./models/User');

// Define Box schema
const boxSchema = new mongoose.Schema({
    name: String,
    description: String,
    imageUrl: String,
    websiteUrl: String
});

const Box = mongoose.model('Box', boxSchema);

// Task schema
const taskSchema = new mongoose.Schema({
    name: String,
    description: String,
    dueDate: Date,
    priority: String,
    reminder: String
});

const Task = mongoose.model('Task', taskSchema);

// TaskInProgress schema
const taskInProgressSchema = new mongoose.Schema({
    name: String,
    description: String,
    dueDate: Date,
    priority: String,
    reminder: String
});

const TaskInProgress = mongoose.model('TaskInProgress', taskInProgressSchema);

// TaskDone schema
const taskDoneSchema = new mongoose.Schema({
    name: String,
    description: String,
    dueDate: Date,
    priority: String,
    reminder: String
});

const TaskDone = mongoose.model('TaskDone', taskDoneSchema);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve dashboard.html
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Serve chatroom.html
app.get('/chatroom', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chatroom.html'));
});

// Serve todo.html file at root URL
app.get('/todo', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'todo.html'));
});

// Signup
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ username, email, password });
        await user.save();
        res.status(201).send('User created successfully');
    } catch (error) {
        if (error.code === 11000) {
            if (error.keyPattern.username) {
                return res.status(400).send('Username already exists');
            } else if (error.keyPattern.email) {
                return res.status(400).send('Email already exists');
            }
        }
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Login
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        if (user) {
            res.redirect('/dashboard');
        } else {
            res.status(401).send('Invalid credentials');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Handle form submission to add or update a box
app.post('/addBox', (req, res) => {
    const { name, description, imageUrl, websiteUrl } = req.body;

    console.log('Received form data:', { name, description, imageUrl, websiteUrl });

    Box.findOneAndUpdate({ name: name }, { name, description, imageUrl, websiteUrl }, { upsert: true, new: true })
        .then(updatedBox => {
            console.log('Box updated:', updatedBox);
            res.send('Box added/updated successfully');
        })
        .catch(err => {
            console.error('Error adding/updating box:', err);
            res.status(500).send('Error adding/updating box');
        });
});

// Handle GET request to fetch box data by name
app.get('/getBoxByName', (req, res) => {
    const boxName = req.query.name;

    console.log('Fetching box by name:', boxName);

    // Find box by name in the database
    Box.findOne({ name: boxName })
        .then(box => {
            if (box) {
                // If box found, send it as JSON response
                res.json(box);
                console.log('Box found:', box);
            } else {
                // If box not found, send 404 status with an error message
                res.status(404).json({ error: 'Box not found' });
                console.log('Box not found');
            }
        })
        .catch(err => {
            // Handle errors
            console.error('Error fetching box by name:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
});

// Example data store
let cards = [];

// Route to handle delete card requests
app.delete('/delete-card/:cardName', (req, res) => {
    const cardName = req.params.cardName;
    console.log("Delete request received for card:", cardName);

    // Delete the card from the database by name
    Box.findOneAndDelete({ name: cardName })
        .then(deletedCard => {
            if (deletedCard) {
                console.log("Card deleted successfully");
                res.sendStatus(200);
            } else {
                console.error("Card not found");
                res.sendStatus(404);
            }
        })
        .catch(error => {
            console.error("Error deleting card:", error);
            res.sendStatus(500);
        });
});

//set up socket.io
const botName = "StudySphereBot";
io.on("connection", (socket) => {
    socket.on("joinRoom", ({ userName, room }) => {
        const user = joinUser(socket.id, userName, room);

        socket.join(user.room);
        //welcome current user
        socket.emit(
            "message",
            formatMessage(botName, `${user.username}, welcome to ${user.room}!`)
        );

        //broadcast when a user connect
        socket.broadcast
            .to(user.room)
            .emit(
                "message",
                formatMessage(botName, `${user.username} has joined the chat`)
            );

        //send users and room info
        io.to(user.room).emit("roomUsers", {
            room: user.room,
            users: roomUsers(user.room),
        });
    });

    //listen to chatMessage from client
    socket.on("chatMessage", (msg) => {
        const user = getCurrentUser(socket.id);
        io.to(user.room).emit("message", formatMessage(`${user.username}`, msg));
    });

    //listen when a user is typing
    socket.on("typing", (typing) => {
        const user = getCurrentUser(socket.id);
        io.to(user.room).emit("message", formatMessage(`${user.username}`, typing));
    });

    //run when a client disconnect
    socket.on("disconnect", () => {
        const user = userLeaveChat(socket.id);
        if (user) {
            io.to(user.room).emit(
                "message",
                formatMessage(botName, `${user.username} has left the chat`)
            );

            //send users and room info
            io.to(user.room).emit("roomUsers", {
                room: user.room,
                users: roomUsers(user.room),
            });
        }
    });
});

// Handle POST request to create a new task
app.post('/tasks', async (req, res) => {
    console.log('Received POST request to create a new task');
    console.log('Data received from client:', req.body);

    const { name, description, dueDate, priority, reminder } = req.body;

    try {
        const newTask = new Task({ name, description, dueDate, priority, reminder });
        const savedTask = await newTask.save();
        console.log('Task created:', savedTask);
        res.status(201).send(savedTask);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).send('Error creating task');
    }
});

// Handle POST request to store task in progress
app.post('/storeInProgressTask', async (req, res) => {
    console.log('Received POST request to store task in progress');
    console.log('Data received from client:', req.body);

    const { name, description, dueDate, priority, reminder } = req.body;

    try {
        const newTaskInProgress = new TaskInProgress({ name, description, dueDate, priority, reminder });
        const savedTaskInProgress = await newTaskInProgress.save();
        console.log('Task stored in progress:', savedTaskInProgress);
        res.status(201).send(savedTaskInProgress);
    } catch (error) {
        console.error('Error storing task in progress:', error);
        res.status(500).send('Error storing task in progress');
    }
});

// Handle POST request to store task in done
app.post('/storeDoneTask', async (req, res) => {
    console.log('Received POST request to store task in done');
    console.log('Data received from client:', req.body);

    const { name, description, dueDate, priority, reminder } = req.body;

    try {
        const newTaskDone = new TaskDone({ name, description, dueDate, priority, reminder });
        const savedTaskDone = await newTaskDone.save();
        console.log('Task stored in done:', savedTaskDone);
        res.status(201).send(savedTaskDone);
    } catch (error) {
        console.error('Error storing task in done:', error);
        res.status(500).send('Error storing task in done');
    }
});

// Handle DELETE request to delete a task from the tasks collection
app.delete('/deleteTask', async (req, res) => {
    const { name } = req.body;

    try {
        const deletedTask = await Task.findOneAndDelete({ name });
        if (!deletedTask) {
            console.log('Task not found:', name);
            return res.status(404).send('Task not found');
        }
        console.log('Task deleted successfully from tasks schema');
        res.status(200).send('Task deleted successfully');
    } catch (error) {
        console.error('Error deleting task from tasks schema:', error);
        res.status(500).send('Error deleting task');
    }
});

// Handle DELETE request to delete a task from the tasks in-progress collection
app.delete('/deleteTaskInProgress', async (req, res) => {
    const { name } = req.body;

    try {
        const deletedTask = await TaskInProgress.findOneAndDelete({ name });
        if (!deletedTask) {
            console.log('Task not found:', name);
            return res.status(404).send('Task not found');
        }
        console.log('Task deleted successfully from tasks in-progress schema');
        res.status(200).send('Task deleted successfully');
    } catch (error) {
        console.error('Error deleting task from tasks in-progress schema:', error);
        res.status(500).send('Error deleting task');
    }
});

// Handle DELETE request to delete a task from the tasks done collection
app.delete('/deleteTaskDone', async (req, res) => {
    const { name } = req.body;

    try {
        const deletedTask = await TaskDone.findOneAndDelete({ name });
        if (!deletedTask) {
            console.log('Task not found:', name);
            return res.status(404).send('Task not found');
        }
        console.log('Task deleted successfully from tasks done schema');
        res.status(200).send('Task deleted successfully');
    } catch (error) {
        console.error('Error deleting task from tasks done schema:', error);
        res.status(500).send('Error deleting task');
    }
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
