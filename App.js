import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, Button, Picker, ActivityIndicator, FlatList } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as Clipboard from 'expo-clipboard';
import axios from 'axios';
import { SUPABASE_URL, SUPABASE_KEY, VITE_DEEPL_API_KEY, VITE_OPENAI_KEY, VITE_GOOGLE_API_KEY } from '@env';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(VITE_GOOGLE_API_KEY);

export default function App() {
  const [formData, setFormData] = useState({
    language: 'French',
    message: '',
    model: 'deepl',
  });
  const [error, setError] = useState('');
  const [translation, setTranslation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [previousTranslations, setPreviousTranslations] = useState([]);

  const supportedModels = {
    "deepl": ["Spanish", "French", "German", "Italian", "Dutch", "Portuguese", "Russian", "Chinese (Simplified)", "Japanese"],
    "gpt-3.5-turbo": ["Spanish", "French", "German", "Italian", "Portuguese", "Dutch", "Russian", "Chinese (Simplified)", "Japanese"],
    "gpt-4": ["Spanish", "French", "German", "Italian", "Portuguese", "Dutch", "Russian", "Chinese (Simplified)", "Japanese"],
    "gpt-4-turbo": ["Spanish", "French", "German", "Italian", "Portuguese", "Dutch", "Russian", "Chinese (Simplified)", "Japanese"],
    "gemini-1.5-flash-001": ["Spanish", "French", "German", "Italian", "Portuguese", "Russian", "Chinese (Simplified)", "Japanese"],
    "gemini-1.5-flash-002": ["Spanish", "French", "German", "Italian", "Portuguese", "Russian", "Chinese (Simplified)", "Japanese"],
    "gemini-1.5-pro-001": ["Spanish", "French", "German", "Italian", "Portuguese", "Russian", "Chinese (Simplified)", "Japanese"],
    "gemini-1.5-pro-002": ["Spanish", "French", "German", "Italian", "Portuguese", "Russian", "Chinese (Simplified)", "Japanese"],
  };

  useEffect(() => {
    fetchPreviousTranslations();
  }, []);

  const fetchPreviousTranslations = async () => {
    try {
      const { data, error } = await supabase
        .from('translations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching previous translations:', error);
        return;
      }

      setPreviousTranslations(data);
    } catch (error) {
      console.error('Error fetching previous translations:', error);
    }
  };

  const translateWithDeepL = async (text, toLang) => {
    const deepLLanguageCodes = {
      Spanish: "ES", French: "FR", German: "DE", Italian: "IT", Dutch: "NL",
      Portuguese: "PT", Russian: "RU", "Chinese (Simplified)": "ZH", Japanese: "JA",
    };

    const targetLangCode = deepLLanguageCodes[toLang];
    if (!targetLangCode) {
      throw new Error(`Unsupported language: ${toLang}`);
    }

    const response = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        auth_key: VITE_DEEPL_API_KEY,
        text,
        source_lang: "EN",
        target_lang: targetLangCode,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepL API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.translations[0].text;
  };

  const translateWithGemini = async (text, model) => {
    const generativeModel = genAI.getGenerativeModel({ model });
    const prompt = `Translate the following text to ${formData.language}: "${text}"`;
    const result = await generativeModel.generateContent(prompt);
    return result.response.text;
  };

  const translateWithGPT = async (text, model) => {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model,
        messages: [
          { role: "system", content: `Translate this text to ${formData.language}` },
          { role: "user", content: text },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${VITE_OPENAI_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.choices[0].message.content.trim();
  };

  const translate = async () => {
    const { language, message, model } = formData;

    if (!message.trim()) {
      setError("Please enter a message to translate.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      let translatedText = "";

      if (model === "deepl") {
        translatedText = await translateWithDeepL(message, language);
      } else if (model.startsWith("gemini")) {
        translatedText = await translateWithGemini(message, model);
      } else if (model.startsWith("gpt")) {
        translatedText = await translateWithGPT(message, model);
      } else {
        throw new Error("Unsupported model for translation.");
      }

      setTranslation(translatedText);

      const { error: dbError } = await supabase.from("translations").insert([
        {
          original_message: message,
          translated_message: translatedText,
          language,
          model,
        },
      ]);

      if (dbError) {
        throw new Error("Failed to save translation to database.");
      }

      fetchPreviousTranslations();
    } catch (error) {
      console.error("Translation error:", error);
      setError("Translation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(translation);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Translation App</Text>
      <Picker
        selectedValue={formData.model}
        onValueChange={(itemValue) => setFormData({ ...formData, model: itemValue })}
        style={styles.picker}
      >
        {Object.keys(supportedModels).map((model) => (
          <Picker.Item key={model} label={model} value={model} />
        ))}
      </Picker>
      <Picker
        selectedValue={formData.language}
        onValueChange={(itemValue) => setFormData({ ...formData, language: itemValue })}
        style={styles.picker}
      >
        {supportedModels[formData.model]?.map((lang) => (
          <Picker.Item key={lang} label={lang} value={lang} />
        ))}
      </Picker>
      <TextInput
        style={styles.textInput}
        placeholder="Enter text to translate"
        value={formData.message}
        onChangeText={(text) => setFormData({ ...formData, message: text })}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Translate" onPress={translate} disabled={isLoading} />
      {isLoading && <ActivityIndicator size="large" color="#0000ff" />}
      {translation ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{translation}</Text>
          <Button title="Copy to Clipboard" onPress={handleCopy} />
        </View>
      ) : null}
      {showNotification && <Text style={styles.notification}>Copied to clipboard!</Text>}
      <Text style={styles.tableHeader}>Previous Translations</Text>
      <FlatList
        data={previousTranslations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Original: {item.original_message}</Text>
            <Text style={styles.tableCell}>Translated: {item.translated_message}</Text>
            <Text style={styles.tableCell}>Language: {item.language}</Text>
            <Text style={styles.tableCell}>Model: {item.model}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  picker: {
    marginBottom: 20,
  },
  error: {
    color: "red",
    marginBottom: 10,
  },
  resultContainer: {
    marginTop: 20,
  },
  resultText: {
    fontSize: 16,
    marginBottom: 10,
  },
  notification: {
    color: "green",
    marginTop: 10,
  },
  tableHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 30,
  },
  tableRow: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 5,
  },
  tableCell: {
    fontSize: 14,
    marginBottom: 5,
  },
});
