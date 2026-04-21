import * as fs from "node:fs";
import { DeterministicExtractor } from "../server/pipeline/deterministic-extractor";

async function testExtraction() {
  const videoPath = process.argv[2];
  if (!(videoPath && fs.existsSync(videoPath))) {
    console.error("Please provide a valid video path");
    process.exit(1);
  }

  const extractor = new DeterministicExtractor(videoPath);
  try {
    let count = 0;
    for await (const frame of extractor.extract()) {
      count++;
      if (count % 100 === 0) {
        console.log(
          `[Test] Extracted ${count} frames... Last PTS: ${frame.pts}`
        );
      }
      // We don't save every frame to avoid filling disk, but we could save the first one
      if (count === 1) {
        console.log(
          `[Test] Frame 1 properties: ${frame.width}x${frame.height}, Buffer size: ${frame.buffer.length}`
        );
      }
    }
    console.log(`[Test] SUCCESS: Total frames extracted: ${count}`);
  } catch (err) {
    console.error("[Test] FAILED:", err);
  }
}

testExtraction();
