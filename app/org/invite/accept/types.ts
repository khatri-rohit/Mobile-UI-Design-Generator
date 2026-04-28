export interface InvitationStatus {
  status: "idle" | "accepting" | "success" | "error";
  message: string;
}

export interface InvitationData {
  token: string;
  orgName?: string;
  invitedBy?: string;
  role?: string;
}
