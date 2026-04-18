import { Dispatch, SetStateAction, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logger from "@/lib/logger";

interface FeedbackProps {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}

const FeedbackForm = ({ open, onOpenChange }: FeedbackProps) => {
  const [feedback, setFeedback] = useState("");

  const sendFeedback = async () => {
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      if (response.ok && response.status === 200) {
        setFeedback("");
        onOpenChange(false);
        toast.success(
          "Thank you! Your feedback has been received. We appreciate your input!",
          {
            duration: 3000,
          },
        );
        logger.info("Feedback submission response:", {
          status: response.status,
        });
        return;
      }
      toast.error(
        "Oops! We couldn't send your feedback. Please check your connection and try again.",
        {
          duration: 4000,
        },
      );
      logger.error("Failed to send feedback:", { response });
    } catch (error) {
      logger.error("Error sending feedback:", { error });
      toast.error("Something went wrong. Please try again in a moment.", {
        duration: 4000,
      });
      return;
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="dark bg-[#181818] border-l border-white/10 shadow-2xl rounded-none w-full sm:max-w-md h-full mt-0">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-white text-xl">
            Feedback Form
          </DrawerTitle>
          <DrawerDescription className="text-white/60 mt-2">
            We would love to hear your thoughts and feedback about our project
            studio! Please fill out the form below to share your experience,
            suggestions, or any issues you encountered while using the platform.
          </DrawerDescription>
        </DrawerHeader>
        <form className="grid gap-4 px-4 py-4">
          <label
            htmlFor="feedback"
            className="text-[15px] font-medium leading-none text-white/90"
          >
            Describe your feedback{" "}
            <span className="text-white/50">(required)</span>
          </label>
          <textarea
            id="feedback"
            rows={6}
            placeholder="Tell us what you think..."
            className="flex w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-[15px] text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50 transition-colors resize-none"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </form>
        <DrawerFooter className="pt-2">
          <Button
            type="submit"
            className="bg-white text-black hover:bg-white/90 font-medium shadow-none h-11 w-full"
            onClick={sendFeedback}
          >
            Submit Feedback
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default FeedbackForm;
