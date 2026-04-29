export const GENERATED_CODE_COMPILE_RETRY_LIMIT = 2;

const COMPILE_ERROR_RE =
  /\b(compile|syntax|unexpected token|typescript|tsx|jsx|module not found|failed to compile|parse error)\b/i;

export function isLikelyCompileErrorMessage(message: string): boolean {
  return COMPILE_ERROR_RE.test(message);
}

export function buildCompileRepairPrompt({
  basePrompt,
  screenName,
  attempt,
  diagnostics,
}: {
  basePrompt: string;
  screenName: string;
  attempt: number;
  diagnostics: string[];
}): string {
  const diagnosticLines =
    diagnostics.length > 0
      ? diagnostics
      : [
          "The previous output failed validation without a detailed diagnostic.",
        ];

  return [
    basePrompt.trim(),
    "",
    "COMPILE REPAIR INSTRUCTIONS:",
    `- Target screen: ${screenName}`,
    `- Retry attempt ${attempt} of ${GENERATED_CODE_COMPILE_RETRY_LIMIT}`,
    "- The previous TSX output failed validation. Regenerate the full component from scratch.",
    "- Fix the syntax or compile issue and return valid TSX only.",
    "- Preserve the requested visual direction and component intent.",
    ...diagnosticLines.map((line) => `- ${line}`),
  ].join("\n");
}
