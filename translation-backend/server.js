// const express = require("express");
// const { Pool } = require("pg");
// const bodyParser = require("body-parser");
// const { Parser } = require("json2csv");
// const cors = require("cors");

// const app = express();
// const port = process.env.PORT || 5000;

// // Middleware
// app.use(cors());
// app.use(bodyParser.json());
// app.use(express.json());

// // Database connection
// const pool = new Pool({
//     user: "my_postgres_dqrl_user",
//     host: "dpg-ct6kl1dumphs739h8ga0-a.oregon-postgres.render.com",
//     database: "my_postgres_dqrl",
//     password: "kVesnrcNJAslyzXoCfUdess3b6OJ74cm",
//     port: 5432,
//     idleTimeoutMillis: 30000, // close idle clients after 30 seconds
//     connectionTimeoutMillis: 5000, // wait for a maximum of 5 seconds for a connection
//     ssl: {
//         rejectUnauthorized: false, // Allows self-signed certificates
//     },
// });

// // Function to create the table if it doesn't exist
// const createTableIfNotExists = async () => {
//     const createTableQuery = `
//     CREATE TABLE IF NOT EXISTS translations (
//     id SERIAL PRIMARY KEY,
//     original_message TEXT NOT NULL,
//     translated_message TEXT NOT NULL,
//     language VARCHAR(50) NOT NULL,
//     model VARCHAR(50) NOT NULL,
//     ranking INT DEFAULT 0,
//     rating FLOAT CHECK (rating BETWEEN 0 AND 5) DEFAULT 0,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     );
//     `;

//     try {
//         await pool.query(createTableQuery);
//         console.log('Table "translations" is ready.');
//     } catch (error) {
//         console.error("Error creating table:", error);
//     }
// };

// // Create the table when the server starts
// createTableIfNotExists();

// // Route for handling POST requests
// app.post("/api/translations", async (req, res) => {
//     const {
//         original_message,
//         translated_message,
//         language,
//         model,
//         ranking,
//         rating,
//         classification,
//     } = req.body;
//     if (!original_message || !translated_message || !language || !model) {
//         res.status(400).json({ error: "Missing required fields" });
//         return;
//     }

//     try {
//         const result = await pool.query(
//             "INSERT INTO translations (original_message, translated_message, language, model, ranking, rating, classification) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
//             [
//                 original_message,
//                 translated_message,
//                 language,
//                 model,
//                 ranking,
//                 rating,
//                 classification,
//             ]
//         );
//         res.status(201).json(result.rows[0]);
//     } catch (error) {
//         console.error("Database insertion error:", error);
//         res.status(500).json({ error: "Database insertion error" });
//     }
// });

// app.get("/api/export", async (req, res) => {
//     try {
//         const result = await pool.query("SELECT * FROM translations"); // Modify query as needed
//         const jsonData = result.rows;

//         const json2csvParser = new Parser();
//         const csv = json2csvParser.parse(jsonData);

//         res.header("Content-Type", "text/csv");
//         res.attachment("output_file.csv");
//         res.send(csv);
//     } catch (error) {
//         console.error("Error exporting to CSV:", error);
//         res.status(500).send("Internal Server Error");
//     }
// });
// // Start the server
// app.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// });



// Import required modules
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config(); // Load environment variables from .env file

// Initialize Express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Endpoint to save a translation
app.post("192.168.90.89/api/translations", async (req, res) => {
  const { original_message, translated_message, language, model, score } = req.body;

  // Validate input
  if (!original_message || !translated_message || !language || !model || typeof score !== 'number') {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Insert translation into the database
    const { data, error } = await supabase
      .from("translations") // Make sure the table exists in Supabase
      .insert([{ original_message, translated_message, language, model, score }]);

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(201).json(data);
  } catch (error) {
    console.error("Error saving translation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to fetch previous translations
app.get("192.168.5.8/api/translations", async (req, res) => {
  try {
    // Fetch translations from the database
    const { data, error } = await supabase
      .from("translations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching translations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to save a comparison translation
app.post("192.168.90.89/api/compareTranslate", async (req, res) => {
  const { original_message, translated_message, language, model, score } = req.body;

  // Validate input
  if (!original_message || !translated_message || !language || !model || typeof score !== 'number') {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Insert comparison translation into the database
    const { data, error } = await supabase
      .from("192.168.90.89/api/compareTranslate") // Make sure the table exists in Supabase
      .insert([{ original_message, translated_message, language, model, score }]);

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(201).json(data);
  } catch (error) {
    console.error("Error saving compare translation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to fetch previous comparison translations
app.get("192.168.90.89/api/compare-translations", async (req, res) => {
  try {
    // Fetch comparison translations from the database
    const { data, error } = await supabase
      .from("compareTranslate")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching compare translations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
