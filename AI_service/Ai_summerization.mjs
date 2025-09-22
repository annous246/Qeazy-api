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
// Load environment variables
const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run_py(textInput) {
  return new Promise((resolve, reject) => {
    const psScript = path.join(__dirname, "run_venv.ps1");
    console.log(psScript);
    const pythonProcess = spawn(
      "powershell.exe",
      ["-ExecutionPolicy", "Bypass", "-File", psScript],
      { shell: true }
    );

    let output = "";
    let errorOutput = "";

    pythonProcess.stdin.write(textInput);
    pythonProcess.stdin.end();
    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on("close", (code) => {
      console.log("out");
      console.log(output.length);
      console.log("done");
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Python exited with code ${code}\n${errorOutput}`));
      }
    });
  });
}
export async function summerizeAI(text, len) {
  try {
    const result = await run_py(text);
    return result;
  } catch (err) {
    console.error("Error:", err.message);
    return null;
  }
}

// Run
