// app/api/process-equation/route.ts
import { ProcessedResult } from "@/types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function base64ToBytes(base64: string) {
  const image = base64.split(',')[1];
  const binaryString = atob(image);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { image, dict_of_vars = {} } = data;

    const validateImage = (imageData: string) => {
      try {
        const base64Data = imageData.split(',')[1];
        const decodedData = atob(base64Data);
        return decodedData.length > 1000; // Basic check to ensure image has content
      } catch (e) {
        console.error('Image validation error:', e);
        return false;
      }
    };

    // In your POST function, add this before processing:
    if (!validateImage(image)) {
      console.error('Invalid or empty image data received');
      return NextResponse.json({
        message: "Invalid image data",
        error: "The image appears to be empty or invalid",
        status: "error"
      }, { status: 400 });
    }

    // Convert base64 to bytes
    const imageBytes = base64ToBytes(image);

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Refined Prompt
    const prompt = `
You are provided with an image containing mathematical expressions, equations, graphical problems, or abstract concepts. Your goal is to accurately analyze and solve the content based on the following guidelines:

### Key Points:
1. **Follow the PEMDAS Rule**: (Priority: Parentheses, Exponents, Multiplication & Division from left to right, Addition & Subtraction from left to right). Ensure you apply this rule when solving any mathematical expressions to maintain accurate calculations.

### Problem Types:
1. **Simple Mathematical Expressions**:
   Evaluate basic expressions like \`2 + 2\`, \`3 * 4\`, or \`5 / 6 - 2\`. Return a **list of one dictionary** with the structure:
   [{"expr": "given expression", "result": "calculated answer"}]

2. **Systems of Equations**:
   Solve equations involving one or more variables such as \`x^2 + 2x + 1 = 0\` or \`3y + 4x = 0\`. For each variable, return a **comma-separated list of dictionaries**:
   [{"expr": "variable name", "result": calculated value, "assign": true}]

3. **Assignment Statements**:
   If the image contains assignments (e.g., \`x = 4\`, \`y = 5\`), reflect this by including \`"assign": true\` for each variable:
   [{"expr": "variable name", "result": assigned value, "assign": true}]

4. **Graphical Math Problems**:
   For problems that include visual representations (e.g., motion diagrams, geometry, trigonometric graphs, or scenarios), pay close attention to visual indicators like colors, labels, and notes. Provide your answer in the format:
   [{"expr": "interpreted description of the problem", "result": "calculated answer"}]

5. **Abstract Concept Detection**:
   If the image portrays abstract concepts such as emotions, historical events, philosophical ideas, or metaphors, return an interpretation using this format:
   [{"expr": "explanation of the abstract concept", "result": "interpreted meaning or theme"}]

### Contextual Consideration:
- Utilize the values of the variables given in the dictionary: ${JSON.stringify(dict_of_vars)} to solve the expressions accurately. If a variable appears in the given expressions, replace it with its corresponding value from the dictionary.

### Response:
- Your response should consist only of the JSON array of results. **Do not include any additional text or explanation**.
`;

    // Prepare the image part
    const imagePart = {
      inlineData: {
        data: Buffer.from(imageBytes).toString('base64'),
        mimeType: "image/jpeg"
      }
    };

    // Generate content
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    console.log(result);

    try {
      // Parse the response text as JSON
      const parsedResponse = JSON.parse(text);
      
      // Add assign property if missing
      const processedResponse: ProcessedResult[] = parsedResponse.map((item: ProcessedResult) => ({
        ...item,
        assign: item.assign ?? false
      }));

      return NextResponse.json({
        message: "Image processed",
        data: processedResponse,
        status: "success"
      });
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      return NextResponse.json({
        message: "Error processing response",
        error: "Invalid response format",
        status: "error"
      }, { status: 400 });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({
      message: "Error processing request",
      error: error instanceof Error ? error.message : "Unknown error",
      status: "error"
    }, { status: 500 });
  }
}
