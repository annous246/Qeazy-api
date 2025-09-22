// mcq_generator.mjs

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { summerizeAI } from "./Ai_summerization.mjs";

// Load environment variables
const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1";

function totalL(array) {
  let l = 0;
  for (const chunk of array) {
    l += chunk.length;
  }
  return l;
}
export async function runMCQ(files, d, q, c) {
  console.log(c);
  console.log(d);
  console.log(q);
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
      var totalPageslength = 0;
      var totalPages = 0;
      const fullText = docs
        .map((d) => {
          totalPageslength += d.pageContent.length;
          if (totalPageslength <= 24000) totalPages++;
          return d.pageContent;
        })
        .join("\n");
      console.log(totalPages);
      const MAX_CHARS = 24000;
      console.log(typeof fullText);
      //* extraction with summarization
      const summerizedText = await summerizeAI(fullText, MAX_CHARS);
      for (let text of summerizedText) {
        console.log(text.length + " ,");
      }
      console.log("************");
      //************************** */
      const extracted = fullText.substr(0, 24000 + totalPages);
      console.log(extracted.length);
      // Split into chunks
      const splitter = new RecursiveCharacterTextSplitter({
        separators: ["\n", " ", "."],
        chunkSize: 500,
        chunkOverlap: 0,
      });
      const chunks = await splitter.splitText(extracted);

      console.log(chunks.length);
      console.log("chunks.length");
      total_chunks.push(...chunks);
    }
    for (const v in total_chunks) {
      console.log(total_chunks[v].length + " ,");
    }
    console.log(`Total chunks: ${total_chunks.length}`);
    console.log(totalL(total_chunks));
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
                    answer4: {
                      type: "string",
                      description: "Answer 4 (IF DEMANDED)",
                    },
                    answer5: {
                      type: "string",
                      description: "Answer 5 (IF DEMANDED)",
                    },
                    correct: {
                      type: "number",
                      description:
                        "Number of the correct answer (1, 2, 3, 4 or 5 depending on the number of answers)",
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
      console.log("mcq generated");
      return { mcq: mcq, total: totalPages };
    } else {
      throw new Error("MCQ generation failed");
    }
  } catch (err) {
    console.error("Error:", err.message);
    return null;
  }
}

// Run
