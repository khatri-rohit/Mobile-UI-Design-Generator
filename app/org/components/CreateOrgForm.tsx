import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateOrgMutation } from "@/lib/org/queries";
import { LoadingSpinner } from "./LoadingState";

export function CreateOrgForm() {
  const [name, setName] = useState("");
  const { mutateAsync: createOrg, isPending } = useCreateOrgMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createOrg(name.trim());
      toast.success("Organisation created!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create org.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="space-y-1">
        <label className="text-sm font-medium">Organisation name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Acme Design Co."
          className="w-64"
          required
          minLength={2}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending && <LoadingSpinner className="mr-2" />}
        Create Organisation
      </Button>
    </form>
  );
}
