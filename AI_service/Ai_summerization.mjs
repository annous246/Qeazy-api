// mcq_generator.mjs

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

// Load environment variables
const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1";

export async function summerizeAI(text, len) {
  console.log(token);
  try {
    if (!token) {
      throw new Error("API token is not set in environment variables.");
    }
    const client = ModelClient(endpoint, new AzureKeyCredential(token));

    // Load and process PDF
    let total_chunks = [];
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 24000,
      chunkOverlap: 0,
    });
    const chunks = await splitter.splitText(text);
    console.log("chunks length");
    console.log(chunks.length);
    for (const chunk of chunks) {
      console.log(chunk.length);
    }
    console.log("done *****");
    // Messages

    const resultArray = [];
    for (let i = 0; i < Math.min(4, chunks.length); i++) {
      console.log("LOOP" + i);
      //4*8k==24k(limit)
      console.log("here");
      if (chunks[i].length <= 8000) {
        resultArray.push(chunks[i]);
        continue;
      }
      console.log("here");
      // const messages = [
      //   {
      //     role: "system",
      //     content:
      //       "You are a professional text Summerizer that keeps important information and context",
      //   },
      // ];
      // messages.push({
      //   role: "user",
      //   content: `Summerize this text inside [] brackets from  24k characters to a consize text that dosent exceed 8k characters.", this is the text  [${chunks[i]}]`,
      // });
      const messages = [
        {
          role: "system",
          content: "You are a professional text Summerizer...",
        },
        {
          role: "user",
          content: `Summerize this text inside [] brackets from  24k characters to a consize text that dosent exceed 8k and about 8k characters.", this is the text  [${chunks[i]}]`,
        },
      ];
      console.log("here");

      // Payload
      const body = {
        messages,
        temperature: 0,
        top_p: 1,
        model,
      };
      console.log("here");
      // Call AI
      const response = await client.path("/chat/completions").post({ body });
      console.log("here");
      if (isUnexpected(response)) {
        const error = response.body?.error || {
          message: "Unknown error occurred",
          status: response.status,
        };
        throw new Error(JSON.stringify(error));
      }

      const choice = await response.body.choices[0];
      if (choice.finish_reason === "stop") {
        console.log("done AI");
        const summary = choice.message.content;

        //  console.log(JSON.stringify(mcq, null, 2));

        resultArray.push(summary);
      } else {
        throw new Error("summarization failed");
      }
    }
    return resultArray;
  } catch (err) {
    console.error("Error:", err.message);
    return null;
  }
}

// Run
