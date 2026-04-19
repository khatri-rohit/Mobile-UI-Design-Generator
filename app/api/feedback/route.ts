import { NextRequest } from "next/server";
// import { Client } from "@upstash/qstash";
import logger from "@/lib/logger";
import { sendFeedbackEmail } from "@/lib/feedback-mail";
import {
  feedbackFormBodySchema,
  toValidationIssues,
} from "@/lib/schemas/studio";

export const runtime = "nodejs";

// const client = new Client({
//   token: process.env.QSTASH_TOKEN,
//   retry: {
//     retries: 3,
//     backoff: (retry_count) => 2 ** retry_count * 20,
//   },
// });

export async function POST(request: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return new Response(
        JSON.stringify({
          error:
            "Request must be multipart form-data with feedback and optional attachments",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const parsedBody = feedbackFormBodySchema.safeParse({
      feedback: formData.get("feedback"),
      attachments: formData.getAll("attachments"),
    });

    if (!parsedBody.success) {
      logger.error("Validation error:", { error: parsedBody.error });
      return new Response(
        JSON.stringify({
          error: "Invalid feedback form payload",
          code: "VALIDATION_ERROR",
          issues: toValidationIssues(parsedBody.error),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { feedback, attachments } = parsedBody.data;

    const emailAttachments = await Promise.all(
      attachments.map(async (attachmentFile) => ({
        filename: attachmentFile.name || "attachment",
        contentType: attachmentFile.type,
        content: Buffer.from(await attachmentFile.arrayBuffer()),
      })),
    );

    // // Can't use QStash for this job right now because the max payload size is 1MB and we want to allow up to 25MB of attachments. Instead, we'll send the email directly from this API route for now. We can revisit using QStash or another background job.
    // try {
    //   const queueBaseUrl = process.env.BACKGROUND_TASK_QUEUE_PUBLIC_URL;
    //   if (!queueBaseUrl)
    //     throw new Error("Missing BACKGROUND_TASK_QUEUE_PUBLIC_URL");

    //   const result = await client.publishJSON({
    //     url: `${queueBaseUrl}/api/background-jobs/send-feedback-email`,
    //     body: { feedback, attachments: emailAttachments },
    //   });

    //   logger.info("Published feedback email task to QStash", {
    //     qstashResult: result,
    //   });
    // } catch (queueError) {
    //   logger.error("Feedback submitted but failed to enqueue email task", {
    //     error:
    //       queueError instanceof Error ? queueError.message : String(queueError),
    //   });
    //   return new Response(
    //     JSON.stringify({
    //       error: "An error occurred while processing feedback",
    //     }),
    //     { status: 500, headers: { "Content-Type": "application/json" } },
    //   );
    //   // Do not fail submission after successful DB write.
    // }

    await sendFeedbackEmail({
      feedback,
      attachments: emailAttachments,
    });
    logger.info("Feedback email sent to backend queue", {
      attachments: emailAttachments.length,
    });

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
