import { NextRequest } from "next/server";
import { z } from "zod";
import { Client } from "@upstash/qstash";
import logger from "@/lib/logger";

const FeedbackSchema = z.object({
  feedback: z.string().min(1, "Feedback cannot be empty"),
});

const client = new Client({
  token: process.env.QSTASH_TOKEN,
  retry: {
    retries: 3,
    backoff: (retry_count) => 2 ** retry_count * 20,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { feedback } = await request.json();

    // Validate feedback using Zod
    const parsed = FeedbackSchema.safeParse({ feedback });

    if (!parsed.success) {
      logger.error("Validation error:", { error: parsed.error });
      return new Response(
        JSON.stringify({ error: "Invalid feedback: " + parsed.error.message }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Send email with feedback content through background job
    const result = await client.publishJSON({
      url: `${process.env.BACKGROUND_TASK_QUEUE_PUBLIC_URL}/api/background-jobs/send-feedback-email`,
      body: { feedback },
    });
    logger.info("Published feedback email job to QStash", { result });

    return new Response(
      JSON.stringify({ success: true, message: "Feedback received" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    logger.error("Error processing feedback:", { error });
    return new Response(
      JSON.stringify({ error: "An error occurred while processing feedback" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
