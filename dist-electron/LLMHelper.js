"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMHelper = void 0;
const generative_ai_1 = require("@google/generative-ai");
const fs_1 = __importDefault(require("fs"));
class LLMHelper {
    model;
    constructor(apiKey) {
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    }
    async fileToGenerativePart(imagePath) {
        const imageData = await fs_1.default.promises.readFile(imagePath);
        return {
            inlineData: {
                data: imageData.toString("base64"),
                mimeType: "image/png"
            }
        };
    }
    cleanJsonResponse(text) {
        // Remove markdown code block syntax if present
        text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
        // Remove any leading/trailing whitespace
        text = text.trim();
        return text;
    }
    async extractProblemFromImages(imagePaths) {
        try {
            const imageParts = await Promise.all(imagePaths.map(path => this.fileToGenerativePart(path)));
            const prompt = `You are a coding problem analyzer. Please analyze these images of a coding problem and extract the following information in JSON format:
      {
        "problem_statement": "The complete problem statement",
        "input_format": {
          "description": "Description of input format",
          "parameters": [{"name": "param name", "type": "param type", "description": "param description"}]
        },
        "output_format": {
          "description": "Description of what should be output",
          "type": "The expected type of the output"
        },
        "constraints": [
          {"description": "Each constraint in plain text"}
        ],
        "test_cases": [
          {
            "input": "Example input",
            "output": "Expected output",
            "explanation": "Explanation if provided"
          }
        ]
      }
      Important: Return ONLY the JSON object, without any markdown formatting or code blocks.`;
            const result = await this.model.generateContent([prompt, ...imageParts]);
            const response = await result.response;
            const text = this.cleanJsonResponse(response.text());
            return JSON.parse(text);
        }
        catch (error) {
            console.error("Error extracting problem from images:", error);
            throw error;
        }
    }
    async generateSolution(problemInfo) {
        const prompt = `Given this coding problem:
    ${JSON.stringify(problemInfo, null, 2)}
    
    Please provide a solution in the following JSON format:
    {
      "solution": {
        "explanation": "Detailed explanation of the approach",
        "complexity": {
          "time": "Time complexity",
          "space": "Space complexity"
        },
        "code": "The complete solution code",
        "test_results": [
          {
            "input": "test case input",
            "expected": "expected output",
            "actual": "actual output",
            "passed": true/false
          }
        ]
      }
    }
    Important: Return ONLY the JSON object, without any markdown formatting or code blocks.`;
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = this.cleanJsonResponse(response.text());
        return JSON.parse(text);
    }
    async debugSolutionWithImages(problemInfo, currentCode, debugImagePaths) {
        try {
            const imageParts = await Promise.all(debugImagePaths.map(path => this.fileToGenerativePart(path)));
            const prompt = `You are a coding problem debugger. Given:
      1. The original problem: ${JSON.stringify(problemInfo, null, 2)}
      2. The current solution: ${currentCode}
      3. The debug information in the provided images
      
      Please analyze the debug information and provide feedback in this JSON format:
      {
        "analysis": {
          "issues_found": [
            {
              "description": "Description of the issue",
              "location": "Where in the code",
              "severity": "high/medium/low"
            }
          ],
          "suggested_fixes": [
            {
              "description": "Description of the fix",
              "code_change": "The specific code change needed"
            }
          ]
        },
        "improved_solution": {
          "code": "The complete improved solution",
          "explanation": "Explanation of the changes made"
        }
      }
      Important: Return ONLY the JSON object, without any markdown formatting or code blocks.`;
            const result = await this.model.generateContent([prompt, ...imageParts]);
            const response = await result.response;
            const text = this.cleanJsonResponse(response.text());
            return JSON.parse(text);
        }
        catch (error) {
            console.error("Error debugging solution with images:", error);
            throw error;
        }
    }
}
exports.LLMHelper = LLMHelper;
//# sourceMappingURL=LLMHelper.js.map