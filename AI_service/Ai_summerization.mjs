// mcq_generator.mjs

import dotenv from "dotenv";
dotenv.config();
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { spawn } from "child_process";
import fetch from "node-fetch"; // if Node 18+, you can use global fetch
// Load environment variables
const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1";

export async function summerizeAI(text, len) {
  try {
    console.log(process.env.AI_API + "/summarize");
    const response = await fetch(process.env.AI_API + "/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }), // send text in JSON body
    });

    if (!response.ok) {
      throw new Error(`Flask server returned ${response.status}`);
    }

    const data = await response.json();
    // Expecting { summary: "..." } from Flask
    return data.summary;
  } catch (err) {
    console.error("Error in summerizeAI:", err.message);
    return null;
  }
}

// Run
