const { spawn } = require("child_process");
const path = require("path");

const scriptPath = path.join(process.cwd(), "scripts", "analyzer.py");
const python = process.env.PYTHON_PATH || "python";

console.log("Checking python availability and analyzer script...");

const child = spawn(python, [scriptPath], {
  stdio: ["ignore", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";

child.stdout.on("data", (d) => (stdout += d.toString()));
child.stderr.on("data", (d) => (stderr += d.toString()));

child.on("close", (code) => {
  try {
    const parsed = JSON.parse(stdout || "{}");
    if (parsed && parsed.error === "missing_path") {
      console.log(
        "Success: analyzer ran and reported missing path (expected)."
      );
      process.exit(0);
    }
    if (Object.keys(parsed).length > 0) {
      console.log("Success: analyzer returned JSON:", parsed);
      process.exit(0);
    }
    console.error("Analyzer did not return valid JSON. stderr:", stderr);
    process.exit(2);
  } catch (e) {
    console.error(
      "Failed to parse analyzer output. stdout:",
      stdout,
      "stderr:",
      stderr
    );
    process.exit(2);
  }
});
