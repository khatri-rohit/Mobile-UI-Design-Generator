import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrgDetail } from "../types";
import { MemberRow } from "./MemberRow";

interface MembersSectionProps {
  org: OrgDetail;
  currentUserId: string;
  onRemoveMember: (memberId: string) => void;
  removingId: string | null;
}

export function MembersSection({
  org,
  currentUserId,
  onRemoveMember,
  removingId,
}: MembersSectionProps) {
  const canManage = org.userRole === "ADMIN" || org.userRole === "OWNER";

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Members</h2>
        <span className="text-sm text-muted-foreground">
          {org.seatCount} of {org.maxSeats}
        </span>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              {canManage && <TableHead className="w-20">Remove</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {org.memberships.map((member) => (
              <MemberRow
                key={member.id}
                membership={member}
                currentUserId={currentUserId}
                userRole={org.userRole}
                onRemove={onRemoveMember}
                isRemoving={removingId === member.id}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
