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

export async function runMCQ(files, d, q, c) {
  console.log(c);
  console.log(d);
  try {
    if (!token) {
      throw new Error("API token is not set in environment variables.");
    }
    const client = ModelClient(endpoint, new AzureKeyCredential(token));

    // Load and process PDF
    let total_chunks = [];
    for (const file of files) {
      const loader = new PDFLoader(file);
      const docs = await loader.load();
      const fullText = docs.map((d) => d.pageContent).join("\n");

      // Split into chunks
      const splitter = new RecursiveCharacterTextSplitter({
        separators: ["\n", " ", "."],
        chunkSize: 500,
        chunkOverlap: 50,
      });
      const chunks = await splitter.splitText(fullText);
      console.log(chunks.length);
      console.log("chunks.length");
      total_chunks.push(...chunks);
    }

    console.log(`Total chunks: ${total_chunks.length}`);
    // Messages
    const messages = [
      {
        role: "system",
        content:
          "You are a professional Exam MCQ maker. Generate MCQs ONLY based on the context I give you.",
      },
    ];

    for (const chunk of total_chunks) {
      messages.push({
        role: "user",
        content: `Remember this context: ${chunk}`,
      });
      messages.push({ role: "assistant", content: "Well remembered" });
    }

    messages.push({
      role: "user",
      content: `Now use the provided context to generate ${q} ${d} MCQs with 1 question and ${c} choices (answers) each, where one answer is correct. Output according to the tool params i provided`,
    });

    // Function definition
    const functionDefinition = [
      {
        type: "function",
        function: {
          name: "make_mcq",
          description:
            "Generate MCQs based only on the provided context and prompt",
          parameters: {
            type: "object",
            properties: {
              mcqs: {
                type: "array",
                description: "List Of MCQ objects",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string", description: "MCQ question" },
                    answer1: { type: "string", description: "Answer 1" },
                    answer2: { type: "string", description: "Answer 2" },
                    answer3: { type: "string", description: "Answer 3" },
                    correct: {
                      type: "number",
                      description: "Number of the correct answer (1, 2, or 3)",
                    },
                  },

                  required: [
                    "question",
                    "answer1",
                    "answer2",
                    "answer3",
                    "correct",
                  ],
                },
              },
            },

            required: ["mcqs"],
          },
        },
      },
    ];

    // Payload
    const body = {
      messages,
      tools: functionDefinition,
      tool_choice: {
        type: "function",
        function: { name: "make_mcq" },
      },
      temperature: 0,
      top_p: 1,
      model,
    };

    // Call AI
    const response = await client.path("/chat/completions").post({ body });

    if (isUnexpected(response)) {
      const error = response.body?.error || {
        message: "Unknown error occurred",
        status: response.status,
      };
      throw new Error(JSON.stringify(error));
    }

    const choice = response.body.choices[0];
    if (choice.finish_reason === "stop") {
      const mcq = JSON.parse(choice.message.tool_calls[0].function.arguments);
      //  console.log(JSON.stringify(mcq, null, 2));
      return mcq;
    } else {
      throw new Error("MCQ generation failed");
    }
  } catch (err) {
    console.error("Error:", err.message);
    return null;
  }
}

// Run
