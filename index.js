import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import express from 'express';
import cors from 'cors';
import { Firestore } from "@google-cloud/firestore";
dotenv.config();

const app = express();
const port = 3001;
const gemini_api_key = process.env.GEMINI_API_KEY;
const googleAI = new GoogleGenerativeAI(gemini_api_key);
const geminiConfig = {
  temperature: 0.9,
  topP: 1,
  topK: 1,
  maxOutputTokens: 4096,
};

const geminiModel = googleAI.getGenerativeModel({
  model: "gemini-2.5-pro",
  geminiConfig,
});

app.use(express.json());
app.use(cors({
  origin: '*', // Allow all origins for simplicity, adjust as needed
}));

app.post('/generate', async (req, res) => {
  try {
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    const result = await geminiModel.generateContent(input);
    const response = await result.response;

    return res.json({ response: response.text() });
  } catch (err) {
    console.error('Error generating content:', err);
    return res.status(500).json({ error: 'Failed to generate content' });
  }
});

const firestore = new Firestore({
  projectId: 'arganogenai',
  // keyFilename: './arganogenai-60d4123fbcf7.json'
  databaseId: 'arganogenaidb'
});

app.get('/check-connection', async (req, res) => {
  try {
    await firestore.listCollections();
    console.log('Firestore connection established successfully');
    return res.status(200).json({
      status: 'success',
      message: 'Successfully connected to Firestore.'
    });

    // const snapshot = await firestore.collection('your-collection-name').get();
    // const data = snapshot.docs.map(doc => doc.data());
    // return res.json(data);
  } catch (err) {
    console.error('Error fetching Firestore data:', err);
    return res.status(500).json({ error: 'Failed to fetch data from Firestore' });
  }
});

app.get('/getdocuments', async (req, res) => {
  try {
    const collectionName = "prompts";
    const collectionRef = firestore.collection(collectionName);

    const snapshot = await collectionRef.get();
    if (snapshot.empty) {
      return res.status(404).json({ error: 'No documents found' });
    }

    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`Successfully retrieved ${documents.length} documents from '${collectionName}'.`);
    return res.json(documents);
  }
  catch (err) {
    console.error('Error fetching documents:', err);
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

app.get('/company', async (req, res) => {
  try {
    const companyName = "Argano";
    const resultsRef = firestore.collection('StrategicAc');
    const query = resultsRef
      .where('companyName', '==', companyName)
      .orderBy('createdAt', 'desc');
    const snapshot = await query.get();
    if (snapshot.empty) {
      return res.status(404).json({ error: 'No company data found' });
    }

    const results = [];
    snapshot.forEach(doc => {
      results.push({
        id: doc.id
      });
    });

    console.log(`Found ${results.length} results:`);
    return res.json(results);
  }
  catch (err) {
    console.error('Error fetching company data:', err);
    return res.status(500).json({ error: 'Failed to fetch company data' });
  }
});

app.get('/results', async (req, res) => {
  try {
    const companyName = req.query.companyName || "Argano";
    const promptId   = req.query.promptId || 1 ;
    const resultsRef = firestore.collection('StrategicAc');
    // .doc('rPMkZ0jtd6TmK5n6MjAx').collection('results');
    const query = resultsRef.where('CompanyName', '==', companyName).orderBy('Timestamp', 'desc');
    const results = [];
    const results2 = [];
    const snapshot = await query.get();
    if (snapshot.empty) {
      return res.status(404).json({ error: 'No results found' });
    }
    snapshot.forEach(doc => {
      results.push({
        id: doc.id
      });
    });
    for (const result of results) {
      const doc = resultsRef.doc(result.id).collection('results').where('promptId', '==', parseInt(promptId));
      const docSnapshot = await doc.get();

        docSnapshot.forEach(doc => {
          results2.push({
            id: doc.id,
            ...doc.data()
          });
        });
    }
    console.log(`Found ${results2.length} results for company '${companyName}':`);
    return res.json(results2);
  }
  catch (err) {
    console.error('Error fetching results:', err);
    return res.status(500).json({ error: 'Failed to fetch results' });
  }

})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});