// app.js (or index.js)
import express from "express";
import bodyParser from "body-parser";
import path from "path"; 
import { fileURLToPath } from "url"; 
import fs from "fs"; 


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Path to the thoughts data file for persistence
const THOUGHTS_FILE = path.join(__dirname, 'thoughts.txt');

/**
 * Loads thoughts from the thoughts.txt file.
 * Handles file not found (ENOENT) and malformed JSON gracefully.
 * @returns {Array<Object>} An array of thought objects, or an empty array if loading fails.
 */
function loadThoughts() {
    try {
        // Read the file content synchronously
        const data = fs.readFileSync(THOUGHTS_FILE, 'utf8');
        // If the file is empty or only contains whitespace, return an empty array
        if (data.trim() === '') {
            console.log('thoughts.txt is empty. Starting with an empty list of thoughts.');
            return [];
        }
        // Parse the JSON data. Ensure it's an array.
        const parsedData = JSON.parse(data);
        return Array.isArray(parsedData) ? parsedData : [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('thoughts.txt not found. Creating a new empty thoughts list.');
            return [];
        }
        console.error('Error loading thoughts from file:', error);
        return [];
    }
}

/**
 * Saves the current thoughts array to the thoughts.txt file.
 * @param {Array<Object>} currentThoughts 
 */
function saveThoughts(currentThoughts) {
    try {
        fs.writeFileSync(THOUGHTS_FILE, JSON.stringify(currentThoughts, null, 2), 'utf8');
        console.log('Thoughts saved to thoughts.txt');
    } catch (error) {
        console.error('Error saving thoughts to file:', error);
    }
}

// Initialize thoughts by loading them from the persistent file
let thoughts = loadThoughts();
let nextId = thoughts.length > 0 ? Math.max(...thoughts.map(t => t.id)) + 1 : 1;

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); 
app.set('view engine', 'ejs'); 
app.set('views', path.join(__dirname, 'views')); 

// --- Routes ---

// Home Page: Displays all thoughts
app.get("/", (req, res) => {
    res.render("index.ejs", { thoughts: thoughts, currentPage: 'home' });
});

// Create New Thought Page
app.get("/create", (req, res) => {
    res.render("create.ejs", { currentPage: 'create' });
});

// Submit New Thought
app.post("/submit", (req, res) => {
    const newThoughtText = req.body["thoughtText"];
    if (newThoughtText && newThoughtText.trim().length > 0 && newThoughtText.length <= 120) {
        thoughts.push({ id: nextId++, text: newThoughtText.trim() });
        saveThoughts(thoughts); 
    } else {
        console.warn('Attempted to submit an invalid thought (empty or too long).');
    }
    res.redirect("/"); 
});

app.get("/edit/:id", (req, res) => {
    const thoughtId = parseInt(req.params.id); 
    const thoughtToEdit = thoughts.find(thought => thought.id === thoughtId);
    if (!thoughtToEdit) {
        console.error(`Thought with ID ${req.params.id} not found for edit.`);
        return res.redirect("/");
    }
    
    // Render edit.ejs
    res.render("edit.ejs", {
        thought: thoughtToEdit,
        currentPage: 'edit' 
    });
});

// Update Thought
app.post("/update/:id", (req, res) => {
    const thoughtId = parseInt(req.params.id); 
    const updatedText = req.body["thoughtText"]; 
    const thoughtIndex = thoughts.findIndex(thought => thought.id === thoughtId);
    if (thoughtIndex !== -1 && updatedText && updatedText.trim().length > 0 && updatedText.length <= 120) {
        thoughts[thoughtIndex].text = updatedText.trim(); 
        saveThoughts(thoughts); 
    } else {
        console.error(`Invalid update request for ID: ${req.params.id} or content: ${updatedText}`);
    }
    res.redirect("/"); 
});

app.post("/delete/:id", (req, res) => {
    const thoughtId = parseInt(req.params.id); 

    const initialLength = thoughts.length;
    thoughts = thoughts.filter(thought => thought.id !== thoughtId);

    if (thoughts.length < initialLength) {
        console.log(`Thought with ID ${thoughtId} deleted successfully.`);
        saveThoughts(thoughts); 
    } else {
        console.error(`Thought with ID ${thoughtId} not found for deletion.`);
    }
    res.redirect("/"); 
});

// About Page
app.get("/about", (req, res) => {
    res.render("about.ejs", { currentPage: 'about' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});